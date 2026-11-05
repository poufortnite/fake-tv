/* =====================================================
   fake.tv — store.js
   Todos los datos viven en el navegador (IndexedDB).
   Nada sale del dispositivo.
===================================================== */
'use strict';

const STORE_KEY = 'faketv:data:v1';

const TWITCH_COLORS = [
  '#FF0000', '#0000FF', '#008000', '#B22222', '#FF7F50',
  '#9ACD32', '#FF4500', '#2E8B57', '#DAA520', '#D2691E',
  '#5F9EA0', '#1E90FF', '#FF69B4', '#8A2BE2', '#00FF7F'
];

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const randomColor = () => TWITCH_COLORS[Math.floor(Math.random() * TWITCH_COLORS.length)];
const nowHHMM = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};
const cleanName = s => String(s || '').trim().replace(/^@/, '').replace(/\s+/g, '_');

function emptyData() {
  return { version: 1, users: [], channels: [], emotes: [] };
}

function isEmptyData(d) {
  return !d || (!(d.users || []).length && !(d.channels || []).length && !(d.emotes || []).length);
}

function newChannelSettings() {
  return {
    showTs: false, povUserId: null, width: 340, height: 640,
    clock: '', chatMode: '', points: '1,2 mil',
    lastUser: '', randomAfter: false
  };
}

/* IndexedDB: cabe mucho más que en localStorage (banners, miniaturas…) */
const IDB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('faketv', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(this.db = r.result);
      r.onerror = () => rej(r.error);
    });
  },
  async get(key) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const r = db.transaction('kv').objectStore('kv').get(key);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  },
  async put(key, val) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(val, key);
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
    });
  }
};

const DB = {
  data: emptyData(),
  _timer: null,
  _useLocal: false,

  loaded: false,      // hasta que se cargan los datos NO se guarda nada (así nunca se pisan con datos vacíos)
  blocked: false,     // si no se han podido leer los datos, no se guarda para no sobrescribirlos
  recovered: null,    // copia automática disponible si los datos aparecen vacíos

  async load() {
    let data = null, ok = false;
    if (!('indexedDB' in window)) {
      this._useLocal = true;
      try { data = JSON.parse(localStorage.getItem(STORE_KEY)); } catch { data = null; }
      ok = true;
    } else {
      for (let i = 0; i < 3 && !ok; i++) {
        try {
          data = await IDB.get('data');
          if (!data) {                     // datos antiguos de localStorage → se pasan a IndexedDB
            const raw = localStorage.getItem(STORE_KEY);
            if (raw) { data = JSON.parse(raw); await IDB.put('data', data); localStorage.removeItem(STORE_KEY); }
          }
          ok = true;
        } catch (e) {
          console.warn('No se pudieron leer los datos, reintento', e);
          IDB.db = null;
          await new Promise(r => setTimeout(r, 400));
        }
      }
    }
    if (!ok) {
      this.blocked = true;
      this.data = emptyData(); this.normalize(); this.loaded = true;
      return;
    }
    this.data = data && typeof data === 'object' ? data : emptyData();
    this.normalize();
    this.loaded = true;
    // Copia automática: guarda lo que había al abrir la app (por si algo sale mal)
    if (!this._useLocal) {
      try {
        if (!isEmptyData(this.data)) await IDB.put('backup', { date: Date.now(), data: this.data });
        else {
          const b = await IDB.get('backup');
          if (b && b.data && !isEmptyData(b.data)) this.recovered = b;
        }
      } catch (e) { console.warn(e); }
    }
  },

  normalize() {
    const d = this.data;
    d.version = 1;
    d.users ||= []; d.channels ||= []; d.emotes ||= [];
    d.channels.forEach(ch => {
      ch.settings = Object.assign(newChannelSettings(), ch.settings || {});
      ch.mods ||= []; ch.vips ||= []; ch.subs ||= {}; ch.subBadges ||= []; ch.messages ||= [];
      ch.videos ||= []; ch.links ||= [];
      if (ch.live === undefined) ch.live = true;
      if (ch.followers === undefined) ch.followers = Math.floor(1000 + Math.random() * 50000);
      ch.bio ||= ''; ch.banner ||= null;
    });
  },

  /** Guarda (agrupa los cambios seguidos en una sola escritura) */
  save() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.flush(), 120);
    return true;
  },
  async flush() {
    clearTimeout(this._timer); this._timer = null;
    if (!this.loaded || this.blocked) return;   // nunca guardar antes de haber cargado
    try {
      if (this._useLocal) localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
      else await IDB.put('data', this.data);
    } catch (e) {
      console.error(e);
      if (typeof toast === 'function') toast('⚠️ No se pudo guardar: el dispositivo no tiene espacio. Guarda una copia y borra imágenes que no uses.', 'error');
    }
  },

  async replaceAll(data) {
    this.data = data;
    this.normalize();
    this.loaded = true; this.blocked = false; this.recovered = null;
    await this.flush();
  },

  /* ---------- usuarios ---------- */
  user(id) { return this.data.users.find(u => u.id === id) || null; },
  userByName(name) {
    const n = cleanName(name).toLowerCase();
    return this.data.users.find(u => u.name.toLowerCase() === n) || null;
  },
  /** Devuelve el usuario existente o lo crea. */
  ensureUser(name, extra = {}) {
    const n = cleanName(name);
    if (!n) return null;
    let u = this.userByName(n);
    if (u) return u;
    u = { id: uid(), name: n, color: extra.color || randomColor(), verified: false, avatar: null, created: Date.now() };
    this.data.users.push(u);
    return u;
  },
  /** "a, b, c" → crea los que no existan. Devuelve [creados, existentes] */
  bulkUsers(text) {
    const names = String(text).split(/[,\n;]+/).map(cleanName).filter(Boolean);
    const created = [], existing = [];
    names.forEach(n => {
      if (this.userByName(n)) existing.push(this.userByName(n));
      else created.push(this.ensureUser(n));
    });
    return [created, existing];
  },
  renameUser(id, newName) {
    const n = cleanName(newName);
    const u = this.user(id);
    if (!u || !n) return false;
    const other = this.userByName(n);
    if (other && other.id !== id) return false;
    u.name = n;
    return true;
  },
  deleteUser(id) {
    this.data.users = this.data.users.filter(u => u.id !== id);
    this.data.channels.forEach(ch => {
      ch.mods = ch.mods.filter(x => x !== id);
      ch.vips = ch.vips.filter(x => x !== id);
      delete ch.subs[id];
      if (ch.settings.povUserId === id) ch.settings.povUserId = null;
    });
  },
  channelsOwnedBy(userId) { return this.data.channels.filter(c => c.ownerId === userId); },

  /* ---------- canales ---------- */
  channel(id) { return this.data.channels.find(c => c.id === id) || null; },
  addChannel({ name, title = '', category = '' }) {
    const owner = this.ensureUser(name);
    if (!owner) return null;
    const ch = {
      id: uid(), ownerId: owner.id, title, category,
      viewers: Math.floor(200 + Math.random() * 4000), thumb: null,
      mods: [], vips: [], subs: {}, subBadges: [],
      messages: [], pinned: null, settings: newChannelSettings(), created: Date.now(),
      live: false, followers: Math.floor(1000 + Math.random() * 50000), bio: '', banner: null, links: [], videos: []
    };
    this.data.channels.push(ch);
    return ch;
  },
  deleteChannel(id) { this.data.channels = this.data.channels.filter(c => c.id !== id); },

  /* ---------- emotes propios ---------- */
  emoteByCode(code) { return this.data.emotes.find(e => e.code === code) || null; }
};

/* ---------- Imágenes: se reducen para que quepan en el navegador ---------- */
function fileToDataURL(file, maxSize = 112) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Sin archivo'));
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const src = reader.result;
      // GIF animados pequeños se guardan tal cual (para no perder la animación)
      if (file.type === 'image/gif' && file.size < 400 * 1024) return resolve(src);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        let out = c.toDataURL('image/webp', 0.9);
        if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/png');
        resolve(out);
      };
      img.onerror = () => reject(new Error('Imagen no válida'));
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

function pickImage(maxSize) {
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      const f = inp.files[0];
      if (!f) return resolve(null);
      try { resolve(await fileToDataURL(f, maxSize)); }
      catch { resolve(null); }
    };
    inp.click();
  });
}

// Que no se pierda nada al cerrar o cambiar de app
window.addEventListener('pagehide', () => { if (DB._timer) DB.flush(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && DB._timer) DB.flush(); });

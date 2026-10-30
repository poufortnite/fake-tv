/* =====================================================
   fake.tv — store.js
   Todos los datos viven en el navegador (localStorage).
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

function newChannelSettings() {
  return {
    showTs: false, povUserId: null, width: 340, height: 640,
    clock: '', chatMode: '', points: '1,2 mil',
    lastUser: '', randomAfter: false
  };
}

const DB = {
  data: emptyData(),

  load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) this.data = JSON.parse(raw);
    } catch (e) { console.error(e); }
    if (!this.data || typeof this.data !== 'object') this.data = emptyData();
    this.data.users ||= [];
    this.data.channels ||= [];
    this.data.emotes ||= [];
    this.data.channels.forEach(ch => {
      ch.settings = Object.assign(newChannelSettings(), ch.settings || {});
      ch.mods ||= []; ch.vips ||= []; ch.subs ||= {}; ch.subBadges ||= []; ch.messages ||= [];
    });
  },

  save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
      return true;
    } catch (e) {
      console.error(e);
      if (typeof toast === 'function') toast('⚠️ No queda espacio en el navegador. Exporta una copia y borra imágenes o mensajes viejos.', 'error');
      return false;
    }
  },

  replaceAll(data) {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
    this.data = emptyData();
    this.load();
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
      messages: [], pinned: null, settings: newChannelSettings(), created: Date.now()
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

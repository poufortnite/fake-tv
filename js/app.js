/* =====================================================
   fake.tv — app.js  (vistas, eventos, router)
===================================================== */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const view = () => $('#view');

/* =====================================================
   UI básica: toast, modal, formularios
===================================================== */
function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3000);
}

function openModal({ title, body, footer = '', wide = false, onMount }) {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `
    <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
      <div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" data-close title="Cerrar">✕</button></div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>`;
  $('#modalRoot').appendChild(back);
  const close = () => back.remove();
  back.addEventListener('mousedown', e => { if (e.target === back) close(); });
  back.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  if (onMount) onMount(back, close);
  return { el: back, close };
}
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const m = $$('#modalRoot .modal-back').pop();
  if (m) { m.remove(); return; }
  if (document.body.classList.contains('capture')) exitCapture();
});

function fieldHTML(f) {
  const id = 'f_' + f.key;
  const hint = f.hint ? `<small>${f.hint}</small>` : '';
  const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : '';
  const val = f.value ?? '';
  switch (f.type) {
    case 'textarea':
      return `<label class="field"><span>${f.label}</span><textarea name="${f.key}" id="${id}" rows="${f.rows || 3}"${ph}>${esc(val)}</textarea>${hint}</label>`;
    case 'select':
      return `<label class="field"><span>${f.label}</span><select name="${f.key}" id="${id}">${f.options.map(o =>
        `<option value="${esc(o.value)}"${String(o.value) === String(val) ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>${hint}</label>`;
    case 'check':
      return `<label class="check"><input type="checkbox" name="${f.key}" id="${id}"${val ? ' checked' : ''}><span>${f.label}</span></label>`;
    case 'image':
      return `<div class="field"><span>${f.label}</span><div class="img-field" data-img="${f.key}" data-max="${f.max || 480}">
        <div class="img-prev"${val ? ` style="background-image:url('${esc(val)}')"` : ''}>${val ? '' : 'Sin imagen'}</div>
        <div class="row"><button type="button" class="btn ghost sm" data-img-up>Subir…</button><button type="button" class="btn ghost sm" data-img-del>Quitar</button></div>
      </div>${hint}</div>`;
    case 'user':
      return `<label class="field"><span>${f.label}</span><input name="${f.key}" id="${id}" list="usersDL" autocomplete="off" value="${esc(val)}"${ph}>${hint}</label>`;
    default:
      return `<label class="field"><span>${f.label}</span><input name="${f.key}" id="${id}" type="${f.type || 'text'}" autocomplete="off" value="${esc(val)}"${ph}${f.min != null ? ` min="${f.min}"` : ''}>${hint}</label>`;
  }
}

function formModal({ title, fields, submitLabel = 'Aceptar', onSubmit, extraFooter = '', onExtra = null }) {
  return openModal({
    title,
    body: `<form class="form">${fields.map(fieldHTML).join('')}<button type="submit" hidden></button></form>`,
    footer: `${extraFooter}<span class="grow"></span><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-submit>${submitLabel}</button>`,
    onMount(el, close) {
      if (extraFooter) el.querySelector('.modal-foot').addEventListener('click', e => { const b = e.target.closest('[data-extra]'); if (b) { close(); onExtra && onExtra(b.dataset.extra); } });
      const form = el.querySelector('form');
      const imgVals = {};
      fields.filter(f => f.type === 'image').forEach(f => { imgVals[f.key] = f.value || null; });
      form.addEventListener('click', async e => {
        const box = e.target.closest('[data-img]'); if (!box) return;
        const key = box.dataset.img, prev = box.querySelector('.img-prev');
        if (e.target.closest('[data-img-up]')) {
          const i = await pickImage(Number(box.dataset.max)); if (!i) return;
          imgVals[key] = i; prev.style.backgroundImage = `url('${i}')`; prev.textContent = '';
        }
        if (e.target.closest('[data-img-del]')) { imgVals[key] = null; prev.style.backgroundImage = ''; prev.textContent = 'Sin imagen'; }
      });
      const submit = () => {
        const v = {};
        for (const f of fields) {
          if (f.type === 'image') { v[f.key] = imgVals[f.key] ?? null; continue; }
          const inp = form.elements[f.key];
          if (!inp) continue;
          v[f.key] = f.type === 'check' ? inp.checked : f.type === 'number' ? Number(inp.value) : inp.value.trim();
          if (f.required && !v[f.key]) { inp.focus(); inp.classList.add('err'); return; }
        }
        if (onSubmit(v) !== false) close();
      };
      form.addEventListener('submit', e => { e.preventDefault(); submit(); });
      el.querySelector('[data-submit]').addEventListener('click', submit);
      const first = form.querySelector('input:not([type=checkbox]),textarea,select');
      if (first) first.focus();
    }
  });
}

function confirmModal(text, okLabel = 'Borrar') {
  return new Promise(res => {
    let done = false;
    const { el } = openModal({
      title: 'Confirmar',
      body: `<p class="muted-p">${text}</p>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn danger" data-ok>${okLabel}</button>`,
      onMount(el, close) {
        el.querySelector('[data-ok]').onclick = () => { done = true; close(); res(true); };
      }
    });
    new MutationObserver((_, obs) => { if (!el.isConnected) { obs.disconnect(); if (!done) res(false); } })
      .observe($('#modalRoot'), { childList: true });
  });
}

function avatarHTML(user, size = 40) {
  if (!user) return `<span class="avatar" style="width:${size}px;height:${size}px"></span>`;
  if (user.avatar) return `<img class="avatar" src="${esc(user.avatar)}" style="width:${size}px;height:${size}px" alt="">`;
  return `<span class="avatar" style="width:${size}px;height:${size}px;background:${readableColor(user.color)};font-size:${Math.round(size * .45)}px">${esc(user.name[0] || '?').toUpperCase()}</span>`;
}

function refreshUsersDatalist() {
  $('#usersDL').innerHTML = DB.data.users
    .slice().sort((a, b) => a.name.localeCompare(b.name))
    .map(u => `<option value="${esc(u.name)}">`).join('');
}

function setNav(active) {
  $$('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.nav === active));
}

/* =====================================================
   VISTA: CANALES (inicio)
===================================================== */
function viewHome() {
  setNav('home');
  const chans = DB.data.channels;
  view().innerHTML = `
  <section class="page">
    <div class="page-head">
      <div><h1>Tus canales</h1><p class="muted-p">Cada canal tiene su chat, sus mods, VIPs y suscriptores.</p></div>
      <button class="btn primary" id="newCh">+ Crear canal</button>
    </div>
    ${chans.length ? `<div class="ch-grid">${chans.map(ch => {
      const o = DB.user(ch.ownerId) || { name: '?', color: '#9147ff' };
      const c = readableColor(o.color);
      const thumb = ch.thumb ? `background-image:url('${ch.thumb}')` : `background:linear-gradient(135deg, ${c}55, #18181b 70%)`;
      return `
      <a class="ch-card" href="#/p/${ch.id}">
        <div class="ch-thumb" style="${thumb}">
          ${ch.live ? `<span class="live-pill">EN DIRECTO</span>
          <span class="viewers-pill">${Number(ch.viewers || 0).toLocaleString('es-ES')} espectadores</span>` : '<span class="viewers-pill">Desconectado</span>'}
        </div>
        <div class="ch-info">
          ${avatarHTML(o, 40)}
          <div class="ch-meta">
            <b class="ch-title">${esc(ch.title || 'Sin título')}</b>
            <span class="ch-name">${esc(o.name)}</span>
            ${ch.category ? `<span class="ch-cat">${esc(ch.category)}</span>` : ''}
          </div>
        </div>
      </a>`;
    }).join('')}</div>` : `
      <div class="empty">
        <div class="empty-ico">📺</div>
        <h2>Aún no tienes canales</h2>
        <p class="muted-p">Crea el primero. Al crear un canal también se crea su usuario (el streamer).</p>
        <button class="btn primary" id="newCh2">+ Crear canal</button>
      </div>`}
  </section>`;
  const create = () => formModal({
    title: 'Crear canal',
    submitLabel: 'Crear',
    fields: [
      { key: 'name', label: 'Nombre del canal / streamer', required: true, type: 'user', placeholder: 'nombre_del_canal', hint: 'Si ya existe un usuario con ese nombre, será el dueño del canal.' },
      { key: 'title', label: 'Título del directo', placeholder: 'Título del directo' },
      { key: 'category', label: 'Categoría', placeholder: 'Just Chatting' },
      { key: 'live', label: 'Está en directo ahora', type: 'check', value: false }
    ],
    onSubmit(v) {
      const ch = DB.addChannel(v);
      if (ch) ch.live = v.live;
      if (!ch) return false;
      DB.save(); refreshUsersDatalist();
      location.hash = '#/p/' + ch.id;
    }
  });
  $('#newCh')?.addEventListener('click', create);
  $('#newCh2')?.addEventListener('click', create);
}

/* =====================================================
   VISTA: USUARIOS
===================================================== */
function viewUsers() {
  setNav('users');
  view().innerHTML = `
  <section class="page">
    <div class="page-head">
      <div><h1>Usuarios <span class="count">${DB.data.users.length}</span></h1>
      <p class="muted-p">Los usuarios son globales: pueden escribir en cualquier canal.</p></div>
    </div>
    <div class="card">
      <label class="field"><span>Añadir usuarios <small>· separados por comas</small></span>
        <div class="row"><input id="bulkUsers" placeholder="usuario1, usuario2, usuario3" autocomplete="off"><button class="btn primary" id="bulkAdd">Añadir</button></div>
      </label>
    </div>
    <div class="toolbar">
      <input id="userSearch" class="search" placeholder="Buscar usuario…" autocomplete="off">
    </div>
    <div class="user-list" id="userList"></div>
  </section>`;

  const renderList = () => {
    const q = $('#userSearch').value.trim().toLowerCase();
    const users = DB.data.users.filter(u => u.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
    $('#userList').innerHTML = users.length ? users.map(u => {
      const owns = DB.channelsOwnedBy(u.id);
      return `
      <div class="user-row" data-uid="${u.id}">
        <button class="avatar-btn" data-act="avatar" title="Cambiar avatar">${avatarHTML(u, 36)}</button>
        <input class="name-in" value="${esc(u.name)}" data-act="rename" style="color:${readableColor(u.color)}">
        <input type="color" value="${esc(u.color)}" data-act="color" title="Color del nombre">
        <button class="btn ghost xs" data-act="rnd" title="Color aleatorio">🎲</button>
        <label class="check sm" title="Insignia de verificado"><input type="checkbox" data-act="verified"${u.verified ? ' checked' : ''}><img src="img/badges/verified.png" width="16" alt=""></label>
        ${owns.length ? `<span class="pill">canal</span>` : ''}
        <button class="icon-btn danger" data-act="delete" title="Borrar">✕</button>
      </div>`;
    }).join('') : `<p class="muted-p">No hay usuarios${q ? ' con ese nombre' : ''}.</p>`;
  };
  renderList();

  $('#bulkAdd').onclick = () => {
    const [created, existing] = DB.bulkUsers($('#bulkUsers').value);
    DB.save(); refreshUsersDatalist();
    $('#bulkUsers').value = '';
    renderList();
    if (created.length) toast(`✅ ${created.length} usuario(s) creado(s)` + (existing.length ? ` · ${existing.length} ya existían` : ''));
    else if (existing.length) toast('Esos usuarios ya existían');
  };
  $('#bulkUsers').addEventListener('keydown', e => { if (e.key === 'Enter') $('#bulkAdd').click(); });
  $('#userSearch').addEventListener('input', renderList);

  const list = $('#userList');
  list.addEventListener('change', e => {
    const row = e.target.closest('.user-row'); if (!row) return;
    const u = DB.user(row.dataset.uid); const act = e.target.dataset.act;
    if (act === 'rename') {
      if (!DB.renameUser(u.id, e.target.value)) { toast('Ese nombre ya existe o no es válido', 'error'); e.target.value = u.name; return; }
    } else if (act === 'color') u.color = e.target.value;
    else if (act === 'verified') u.verified = e.target.checked;
    DB.save(); refreshUsersDatalist(); renderList();
  });
  list.addEventListener('input', e => {
    if (e.target.dataset.act === 'color') e.target.closest('.user-row').querySelector('.name-in').style.color = readableColor(e.target.value);
  });
  list.addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const row = btn.closest('.user-row'); const u = DB.user(row.dataset.uid);
    if (btn.dataset.act === 'rnd') { u.color = randomColor(); DB.save(); renderList(); }
    if (btn.dataset.act === 'avatar') {
      const img = await pickImage(128);
      if (img) { u.avatar = img; DB.save(); renderList(); }
    }
    if (btn.dataset.act === 'delete') {
      const owns = DB.channelsOwnedBy(u.id);
      if (owns.length) { toast('Es dueño de un canal. Borra antes el canal.', 'error'); return; }
      if (await confirmModal(`¿Borrar a <b>${esc(u.name)}</b>? Sus mensajes antiguos se quedan con su nombre.`)) {
        DB.data.channels.forEach(ch => ch.messages.forEach(m => {
          if (m.userId === u.id) m.snap = { name: u.name, color: u.color };
          if (m.toId === u.id) m.toSnap = { name: u.name, color: u.color };
        }));
        DB.deleteUser(u.id); DB.save(); refreshUsersDatalist(); renderList();
      }
    }
  });
}

/* =====================================================
   VISTA: EMOTES
===================================================== */
function viewEmotes() {
  setNav('emotes');
  view().innerHTML = `
  <section class="page">
    <div class="page-head">
      <div><h1>Emotes</h1><p class="muted-p">Escribe el código del emote en un mensaje (separado por espacios) y aparecerá la imagen.</p></div>
    </div>
    <div class="card">
      <h3 class="card-title">Tus emotes / stickers</h3>
      <p class="muted-p small">Sube PNG, WEBP o GIF (los GIF pequeños mantienen la animación). Códigos estilo Twitch: <code>canalHola</code>, <code>canalRisa</code>…</p>
      <div class="row">
        <input id="emoCode" placeholder="Código, p. ej. canalHola" autocomplete="off">
        <button class="btn primary" id="emoAdd">Subir imagen…</button>
      </div>
      <div class="emote-grid" id="ownEmotes"></div>
    </div>
    <div class="card">
      <h3 class="card-title">Emotes globales de Twitch</h3>
      <div class="emote-grid">${Object.keys(TWITCH_EMOTES).map(code =>
        `<div class="emote-cell"><img src="${twitchEmoteURL(TWITCH_EMOTES[code])}" alt="" loading="lazy"><code>${esc(code)}</code></div>`).join('')}</div>
    </div>
  </section>`;
  const renderOwn = () => {
    $('#ownEmotes').innerHTML = DB.data.emotes.length ? DB.data.emotes.map(e =>
      `<div class="emote-cell"><img src="${esc(e.src)}" alt=""><code>${esc(e.code)}</code><button class="icon-btn danger xs" data-del="${e.id}" title="Borrar">✕</button></div>`).join('')
      : '<p class="muted-p small">Todavía no has subido ninguno.</p>';
  };
  renderOwn();
  $('#emoAdd').onclick = async () => {
    const code = $('#emoCode').value.trim().replace(/\s+/g, '');
    if (!code) { toast('Escribe primero el código', 'error'); $('#emoCode').focus(); return; }
    if (DB.emoteByCode(code) || TWITCH_EMOTES[code]) { toast('Ese código ya existe', 'error'); return; }
    const src = await pickImage(112);
    if (!src) return;
    DB.data.emotes.push({ id: uid(), code, src });
    if (DB.save()) { $('#emoCode').value = ''; renderOwn(); toast('Emote añadido: ' + code); }
    else DB.data.emotes.pop();
  };
  $('#ownEmotes').onclick = e => {
    const id = e.target.closest('[data-del]')?.dataset.del; if (!id) return;
    DB.data.emotes = DB.data.emotes.filter(x => x.id !== id); DB.save(); renderOwn();
  };
}


/* =====================================================
   VISTA: CHAT (elegir de qué canal)
===================================================== */
function viewChatPicker() {
  setNav('chat');
  const chans = DB.data.channels.slice().sort((a, b) => (b.lastChat || 0) - (a.lastChat || 0));
  view().innerHTML = `
  <section class="page">
    <div class="page-head">
      <div><h1>Chat</h1><p class="muted-p">Elige de qué canal quieres abrir el chat.</p></div>
    </div>
    ${chans.length ? `
      <input id="chatSearch" class="search" placeholder="Buscar canal…" autocomplete="off" style="margin-bottom:12px">
      <div class="chat-pick" id="chatPick">${chans.map(ch => {
        const o = DB.user(ch.ownerId) || { name: '?', color: '#9147ff' };
        const last = ch.messages.filter(m => m.type === 'msg').slice(-1)[0];
        const lu = last ? msgUser(last) : null;
        return `
        <a class="chat-pick-row" href="#/c/${ch.id}" data-name="${esc(o.name.toLowerCase())}">
          <span class="prof-avatar sm${ch.live ? ' live' : ''}">${avatarHTML(o, 44)}</span>
          <span class="chat-pick-meta">
            <b>${esc(o.name)}${o.verified ? VERIFIED_SVG : ''}</b>
            <span class="muted-p small">${last ? `<b style="color:${readableColor(lu.color)}">${esc(lu.name)}</b>: ${esc((last.text || '').slice(0, 70))}` : 'Chat vacío'}</span>
          </span>
          <span class="chat-pick-side">
            ${ch.live ? '<span class="live-pill static">EN DIRECTO</span>' : '<span class="muted-p small">Desconectado</span>'}
            <span class="muted-p small">${ch.messages.length} mensajes</span>
          </span>
        </a>`;
      }).join('')}</div>` : `
      <div class="empty">
        <div class="empty-ico">💬</div>
        <h2>No hay canales todavía</h2>
        <p class="muted-p">Crea un canal en <a href="#/">Canales</a> para empezar a hacer chats.</p>
      </div>`}
  </section>`;
  $('#chatSearch')?.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    $$('.chat-pick-row').forEach(r => { r.hidden = !r.dataset.name.includes(q); });
  });
}

/* =====================================================
   VISTA: CANAL (chat)
===================================================== */
let CH = null;           // canal abierto
let replyTarget = null;  // mensaje al que se responde

function viewChannel(id) {
  setNav('chat');
  CH = DB.channel(id);
  if (!CH) { location.hash = '#/chat'; return; }
  replyTarget = null;
  CH.lastChat = Date.now(); DB.save();
  const owner = DB.user(CH.ownerId) || { name: '?', color: '#9147ff' };
  const s = CH.settings;

  view().innerHTML = `
  <div class="ch-layout">
    <aside class="ctrl">
      <div class="ctrl-head">
        <a href="#/p/${CH.id}" class="icon-btn" title="Ver perfil del canal">←</a>
        <a href="#/p/${CH.id}" class="head-av" title="Ver perfil">${avatarHTML(owner, 34)}</a>
        <div class="ctrl-head-meta"><b>${esc(owner.name)}</b><span>${esc(CH.title || 'Sin título')}</span></div>
        <button class="icon-btn" id="chSettings" title="Ajustes del canal">⚙️</button>
      </div>

      <div class="card">
        <div class="field desk-compose"><span>Escribir como</span>
          <div class="row">
            <input id="who" list="usersDL" autocomplete="off" placeholder="nombre de usuario" value="${esc(s.lastUser || owner.name)}">
            <button class="btn ghost" id="rndUser" title="Usuario aleatorio">🎲</button>
          </div>
        </div>
        <div class="who-preview desk-compose" id="whoPreview"></div>
        <label class="check sm"><input type="checkbox" id="randomAfter"${s.randomAfter ? ' checked' : ''}><span>Elegir usuario aleatorio después de enviar</span></label>

        <div class="reply-bar desk-compose" id="replyBar" hidden></div>
        <div class="composer desk-compose">
          <textarea id="msgText" rows="3" placeholder="Mensaje…  (Enter envía · Shift+Enter salto)"></textarea>
          <button class="emote-toggle" id="emoteToggle" title="Emotes">${ICONS.smile}</button>
          <div class="emote-pop" id="emotePop" hidden></div>
        </div>
        <div class="row wrap">
          <label class="check sm"><input type="checkbox" id="optHighlight"><span>Destacado</span></label>
          <label class="check sm"><input type="checkbox" id="optFirst"><span>Primer mensaje</span></label>
          <span class="grow"></span>
          <button class="btn primary desk-compose" id="sendBtn">Enviar</button>
        </div>
        <p class="hint desk-compose">/me acción · @usuario · códigos de emotes</p>
      </div>

      <div class="card">
        <h3 class="card-title">Eventos</h3>
        <div class="btn-grid">
          <button class="btn evt" data-evt="sub">⭐ Sub</button>
          <button class="btn evt" data-evt="gift">🎁 Regalo</button>
          <button class="btn evt" data-evt="raid">⚔️ Raid</button>
          <button class="btn evt" data-evt="bits">💎 Bits</button>
          <button class="btn evt" data-evt="announce">📣 Anuncio</button>
          <button class="btn evt" data-evt="pin">📌 Fijar</button>
          <button class="btn evt" data-evt="unpin">Quitar fijado</button>
          <button class="btn evt" data-evt="system">💬 Sistema</button>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">Chat</h3>
        <div class="btn-grid">
          <button class="btn ghost" id="undoBtn">↶ Deshacer</button>
          <button class="btn ghost" id="clearBtn">Vaciar chat</button>
          <button class="btn ghost" id="scriptBtn">📝 Pegar guion</button>
          <button class="btn ghost" id="pngBtn">🖼️ Descargar PNG</button>
        </div>
        <button class="btn capture" id="captureBtn">Modo captura</button>
      </div>

      <div class="card">
        <h3 class="card-title">Vista</h3>
        <label class="check sm"><input type="checkbox" id="optTs"${s.showTs ? ' checked' : ''}><span>Mostrar hora</span></label>
        <div class="grid2">
          <label class="field"><span>Hora fija <small>(vacío = real)</small></span><input id="optClock" placeholder="21:37" value="${esc(s.clock)}"></label>
          <label class="field"><span>Puntos del canal</span><input id="optPoints" value="${esc(s.points)}"></label>
          <label class="field"><span>Ancho</span><input id="optW" type="number" min="260" max="600" value="${s.width}"></label>
          <label class="field"><span>Alto</span><input id="optH" type="number" min="300" max="1400" value="${s.height}"></label>
        </div>
        <label class="field"><span>Aviso sobre el chat <small>(p. ej. “Modo lento (30 s)”)</small></span><input id="optMode" value="${esc(s.chatMode)}"></label>
        <label class="field"><span>Punto de vista <small>(sus menciones se resaltan)</small></span><input id="optPov" list="usersDL" autocomplete="off" placeholder="nadie" value="${esc((DB.user(s.povUserId) || {}).name || '')}"></label>
      </div>
    </aside>

    <section class="stage">${chatPanelHTML()}</section>
  </div>
  <button class="exit-capture" id="exitCapture" title="Salir (Esc)">✕ Salir del modo captura</button>`;

  renderChat(CH);
  bindChannel();
  updateWhoPreview();
}

function saveCH() { DB.save(); }

function currentTime() { return CH.settings.clock || nowHHMM(); }

function pushItem(m) {
  m.id = uid();
  m.time = m.time || currentTime();
  CH.messages.push(m);
  saveCH();
  renderChat(CH);
}

function resolveWho() {
  const name = $('#who').value;
  const existed = !!DB.userByName(name);
  const u = DB.ensureUser(name);
  if (!u) { toast('Escribe un nombre de usuario', 'error'); $('#who').focus(); return null; }
  if (!existed) { refreshUsersDatalist(); toast('Usuario nuevo creado: ' + u.name); }
  return u;
}

function updateWhoPreview() {
  renderSender();
  const u = DB.userByName($('#who').value);
  const el = $('#whoPreview');
  if (!u) { el.innerHTML = $('#who').value.trim() ? '<span class="muted-p small">Usuario nuevo (se creará al enviar)</span>' : ''; return; }
  const roles = [];
  if (CH.ownerId === u.id) roles.push('streamer');
  if (CH.mods.includes(u.id)) roles.push('mod');
  if (CH.vips.includes(u.id)) roles.push('vip');
  if (CH.subs[u.id]) roles.push('sub');
  el.innerHTML = `<span class="tw-badges">${badgesHTML(CH, u)}</span><b style="color:${readableColor(u.color)}">${esc(u.name)}</b>` +
    (roles.length ? `<span class="muted-p small"> · ${roles.join(', ')}</span>` : '');
}

function pickRandomUser() {
  const last = CH.messages.length ? CH.messages[CH.messages.length - 1].userId : null;
  let pool = DB.data.users.filter(u => u.id !== last);
  if (!pool.length) pool = DB.data.users;
  if (!pool.length) { toast('Todavía no hay usuarios. Créalos en la pestaña Usuarios.', 'error'); return; }
  const u = pool[Math.floor(Math.random() * pool.length)];
  $('#who').value = u.name;
  CH.settings.lastUser = u.name; saveCH();
  updateWhoPreview();
}

function setReply(m) {
  replyTarget = m;
  const bar = $('#replyBar'), inPanel = $('#twReplyIn');
  if (!m) { bar.hidden = true; bar.innerHTML = ''; inPanel.hidden = true; inPanel.innerHTML = ''; return; }
  const u = msgUser(m);
  const html = `<span>${ICONS.reply} Respondiendo a <b>@${esc(u.name)}</b>: ${esc((m.text || '').slice(0, 60))}</span><button class="icon-btn xs" data-cancel-reply>✕</button>`;
  bar.hidden = false; bar.innerHTML = html;
  inPanel.hidden = false; inPanel.innerHTML = html;
  $$('[data-cancel-reply]').forEach(b => b.onclick = () => setReply(null));
  (isMobile() ? $('#twInput') : $('#msgText')).focus();
}

const isMobile = () => matchMedia('(max-width: 820px)').matches;

function sendMessage(ta = $('#msgText')) {
  const text = ta.value.trim();
  if (!text) return;
  const u = resolveWho(); if (!u) return;
  const m = { type: 'msg', userId: u.id, text };
  if ($('#optHighlight').checked) m.highlight = true;
  if ($('#optFirst').checked) m.first = true;
  if (replyTarget) {
    const ru = msgUser(replyTarget);
    m.replyTo = { userId: replyTarget.userId, text: replyTarget.text, snap: { name: ru.name, color: ru.color } };
    // Twitch añade la mención automáticamente
    if (!new RegExp('^@' + ru.name + '\\b', 'i').test(m.text)) m.text = '@' + ru.name + ' ' + m.text;
  }
  pushItem(m);
  ta.value = '';
  $('#optHighlight').checked = false; $('#optFirst').checked = false;
  setReply(null);
  CH.settings.lastUser = u.name; saveCH();
  if ($('#randomAfter').checked) pickRandomUser(); else updateWhoPreview();
  ta.focus();
  if (ta.id === 'twInput') autoGrow(ta);
}

function autoGrow(ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 110) + 'px'; }

/* ---------- Quién lo envía (en el móvil, dentro del chat, como en twt2015) ---------- */
function renderSender() {
  const box = $('#twSender'); if (!box) return;
  const name = $('#who').value.trim();
  const u = DB.userByName(name);
  const open = !!$('#senderMenu') && !$('#senderMenu').hidden;
  box.innerHTML = `
    <div class="sender-box">
      <button class="sender-btn" id="senderBtn" aria-haspopup="listbox">
        ${u ? avatarHTML(u, 28) : '<span class="avatar" style="width:28px;height:28px"></span>'}
        <span class="sender-txt"><small>Lo envía</small><b style="color:${u ? readableColor(u.color) : 'inherit'}">${esc(u ? u.name : (name || '¿Quién?'))}</b></span>
        <span class="sender-arrow">▾</span>
      </button>
      <button class="sender-dice" id="senderDice" title="Usuario aleatorio">🎲</button>
      <div class="sender-menu" id="senderMenu" role="listbox"${open ? '' : ' hidden'}>
        <input id="senderSearch" placeholder="Buscar o crear usuario…" autocomplete="off">
        <div class="sender-list" id="senderList"></div>
      </div>
    </div>`;
  $('#senderBtn').onclick = () => {
    const m = $('#senderMenu'); m.hidden = !m.hidden;
    if (!m.hidden) { renderSenderList(); }
  };
  $('#senderDice').onclick = pickRandomUser;
  $('#senderSearch').oninput = renderSenderList;
  $('#senderSearch').onkeydown = e => {
    if (e.key === 'Enter') { e.preventDefault(); const first = $('#senderList [data-pick]'); if (first) first.click(); }
  };
  $('#senderList').onclick = e => {
    const b = e.target.closest('[data-pick]'); if (!b) return;
    const u = DB.ensureUser(b.dataset.pick);
    refreshUsersDatalist();
    $('#who').value = u.name; CH.settings.lastUser = u.name; saveCH();
    $('#senderMenu').hidden = true;
    updateWhoPreview();
    $('#twInput').focus();
  };
  if (open) renderSenderList();
}

function renderSenderList() {
  const q = ($('#senderSearch')?.value || '').trim();
  const ql = q.toLowerCase();
  const rank = u => (u.id === CH.ownerId ? 0 : CH.mods.includes(u.id) ? 1 : CH.vips.includes(u.id) ? 2 : CH.subs[u.id] ? 3 : 4);
  const users = DB.data.users.filter(u => u.name.toLowerCase().includes(ql))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  const cur = $('#who').value.trim().toLowerCase();
  const exact = users.some(u => u.name.toLowerCase() === cleanName(q).toLowerCase());
  $('#senderList').innerHTML =
    (q && !exact ? `<button class="sender-op new" data-pick="${esc(cleanName(q))}"><span class="sender-plus">+</span><span>Crear <b>${esc(cleanName(q))}</b></span></button>` : '') +
    users.map(u => `
      <button class="sender-op${u.name.toLowerCase() === cur ? ' sel' : ''}" data-pick="${esc(u.name)}" role="option">
        ${avatarHTML(u, 32)}
        <span class="sender-op-txt"><b><span class="tw-badges">${badgesHTML(CH, u)}</span><span style="color:${readableColor(u.color)}">${esc(u.name)}</span></b></span>
      </button>`).join('') +
    (!users.length && !q ? '<p class="muted-p small" style="padding:8px">Todavía no hay usuarios. Escribe un nombre para crearlo.</p>' : '');
}

/* Emotes en una hoja desde abajo (para el móvil) */
function emoteSheet(ta) {
  const own = DB.data.emotes.map(e => `<button class="emo" data-code="${esc(e.code)}" title="${esc(e.code)}"><img src="${esc(e.src)}" alt=""></button>`).join('');
  const tw = Object.keys(TWITCH_EMOTES).map(c => `<button class="emo" data-code="${esc(c)}" title="${esc(c)}"><img src="${twitchEmoteURL(TWITCH_EMOTES[c])}" alt="" loading="lazy"></button>`).join('');
  openModal({
    title: 'Emotes',
    body: (own ? `<div class="emo-sec">Tus emotes</div><div class="emo-grid">${own}</div>` : '') + `<div class="emo-sec">Twitch</div><div class="emo-grid">${tw}</div>`,
    onMount(el, close) {
      el.querySelector('.modal-body').onclick = e => {
        const b = e.target.closest('[data-code]'); if (!b) return;
        const sep = ta.value && !/\s$/.test(ta.value) ? ' ' : '';
        ta.value += sep + b.dataset.code + ' ';
        close(); ta.focus(); autoGrow(ta);
      };
    }
  });
}

function bindChannel() {
  const s = CH.settings;
  $('#sendBtn').onclick = () => sendMessage();
  const twIn = $('#twInput');
  twIn.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(twIn); } });
  twIn.addEventListener('input', () => autoGrow(twIn));
  twIn.addEventListener('focus', () => { const m = $('#senderMenu'); if (m) m.hidden = true; });
  $('#twSendBtn').onclick = () => { if (isMobile()) sendMessage(twIn); };
  $('#twEmoteBtn').onclick = () => { if (isMobile()) emoteSheet(twIn); };
  $('#msgText').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  $('#who').addEventListener('input', updateWhoPreview);
  $('#who').addEventListener('change', () => { s.lastUser = $('#who').value.trim(); saveCH(); });
  $('#rndUser').onclick = pickRandomUser;
  $('#randomAfter').onchange = e => { s.randomAfter = e.target.checked; saveCH(); };

  /* Emote picker */
  const pop = $('#emotePop');
  $('#emoteToggle').onclick = () => {
    if (!pop.hidden) { pop.hidden = true; return; }
    const own = DB.data.emotes.map(e => `<button class="emo" data-code="${esc(e.code)}" title="${esc(e.code)}"><img src="${esc(e.src)}" alt=""></button>`).join('');
    const tw = Object.keys(TWITCH_EMOTES).map(c => `<button class="emo" data-code="${esc(c)}" title="${esc(c)}"><img src="${twitchEmoteURL(TWITCH_EMOTES[c])}" alt="" loading="lazy"></button>`).join('');
    pop.innerHTML = (own ? `<div class="emo-sec">Tus emotes</div><div class="emo-grid">${own}</div>` : `<div class="emo-sec">Tus emotes · <a href="#/emotes">subir</a></div>`) +
      `<div class="emo-sec">Twitch</div><div class="emo-grid">${tw}</div>`;
    pop.hidden = false;
  };
  pop.addEventListener('click', e => {
    const b = e.target.closest('[data-code]'); if (!b) return;
    const ta = $('#msgText');
    const pos = ta.selectionStart ?? ta.value.length;
    const before = ta.value.slice(0, pos), after = ta.value.slice(pos);
    const ins = (before && !/\s$/.test(before) ? ' ' : '') + b.dataset.code + ' ';
    ta.value = before + ins + after;
    ta.focus(); ta.selectionStart = ta.selectionEnd = pos + ins.length;
  });
  document.addEventListener('mousedown', closeEmotePop);

  /* Acciones sobre mensajes del chat */
  $('#twList').addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) {   // en el móvil, tocar un mensaje enseña sus opciones
      const item = e.target.closest('[data-mid]');
      if (!item || document.body.classList.contains('capture')) return;
      const was = item.classList.contains('show-act');
      $$('#twList .show-act').forEach(x => x.classList.remove('show-act'));
      if (!was) item.classList.add('show-act');
      return;
    }
    btn.closest('[data-mid]').classList.remove('show-act');
    const id = btn.closest('[data-mid]').dataset.mid;
    const m = CH.messages.find(x => x.id === id); if (!m) return;
    const act = btn.dataset.act;
    if (act === 'del') { CH.messages = CH.messages.filter(x => x.id !== id); saveCH(); renderChat(CH, { keepScroll: true }); }
    if (act === 'reply') setReply(m);
    if (act === 'pin') { CH.pinned = { userId: m.userId, text: m.text, snap: m.snap, byId: CH.ownerId }; saveCH(); renderChat(CH, { keepScroll: true }); }
    if (act === 'edit') editMessage(m);
  });

  /* Eventos */
  $$('[data-evt]').forEach(b => b.addEventListener('click', () => EVENTS[b.dataset.evt]()));

  /* Chat */
  $('#undoBtn').onclick = () => { CH.messages.pop(); saveCH(); renderChat(CH); };
  $('#clearBtn').onclick = async () => {
    if (await confirmModal('¿Vaciar todos los mensajes de este chat?', 'Vaciar')) { CH.messages = []; CH.pinned = null; saveCH(); renderChat(CH); }
  };
  $('#scriptBtn').onclick = scriptModal;
  $('#pngBtn').onclick = () => downloadPNG();
  $('#captureBtn').onclick = enterCapture;
  $('#exitCapture').onclick = exitCapture;
  $('#chSettings').onclick = () => channelSettings();

  /* Vista */
  $('#optTs').onchange = e => { s.showTs = e.target.checked; saveCH(); renderChat(CH, { keepScroll: true }); };
  $('#optClock').onchange = e => { s.clock = e.target.value.trim(); saveCH(); };
  $('#optPoints').oninput = e => { s.points = e.target.value; saveCH(); renderChat(CH, { keepScroll: true }); };
  $('#optMode').oninput = e => { s.chatMode = e.target.value; saveCH(); renderChat(CH, { keepScroll: true }); };
  const size = () => {
    s.width = Math.min(600, Math.max(260, Number($('#optW').value) || 340));
    s.height = Math.min(1400, Math.max(300, Number($('#optH').value) || 640));
    saveCH(); renderChat(CH, { keepScroll: true });
  };
  $('#optW').onchange = size; $('#optH').onchange = size;
  $('#optPov').onchange = e => {
    const v = e.target.value.trim();
    const u = v ? DB.userByName(v) : null;
    if (v && !u) { toast('Ese usuario no existe', 'error'); e.target.value = ''; }
    s.povUserId = u ? u.id : null; saveCH(); renderChat(CH, { keepScroll: true });
  };
}

function closeEmotePop(e) {
  const pop = $('#emotePop');
  if (!pop || pop.hidden) return;
  if (e.target.closest('#emotePop') || e.target.closest('#emoteToggle')) return;
  pop.hidden = true;
}

function editMessage(m) {
  const u = msgUser(m);
  formModal({
    title: 'Editar mensaje',
    submitLabel: 'Guardar',
    fields: [
      { key: 'user', label: 'Usuario', type: 'user', value: u.name, required: true },
      { key: 'text', label: 'Mensaje', type: 'textarea', value: m.text },
      { key: 'time', label: 'Hora', value: m.time || '' },
      { key: 'bits', label: 'Bits (0 = ninguno)', type: 'number', value: m.bits || 0, min: 0 },
      { key: 'highlight', label: 'Mensaje destacado', type: 'check', value: m.highlight },
      { key: 'first', label: 'Primer mensaje', type: 'check', value: m.first },
      { key: 'deleted', label: 'Mostrar como <mensaje eliminado>', type: 'check', value: m.deleted }
    ],
    onSubmit(v) {
      const nu = DB.ensureUser(v.user); if (!nu) return false;
      Object.assign(m, { userId: nu.id, text: v.text, time: v.time, bits: v.bits > 0 ? v.bits : 0, highlight: v.highlight, first: v.first, deleted: v.deleted });
      saveCH(); refreshUsersDatalist(); renderChat(CH, { keepScroll: true });
    }
  });
}

/* ---------- Eventos (sub, regalo, raid…) ---------- */
function autoSubBadge(user, months = 1) {
  if (!CH.subBadges.length || CH.subs[user.id] || user.id === CH.ownerId) return;
  const sorted = CH.subBadges.slice().sort((a, b) => (a.months || 0) - (b.months || 0));
  let pick = sorted[0];
  sorted.forEach(b => { if ((b.months || 0) <= months) pick = b; });
  CH.subs[user.id] = pick.id;
}
const BADGE_PRESETS = [
  { src: 'img/presets/sub_1.png', name: '1 mes', months: 1 },
  { src: 'img/presets/sub_3.png', name: '3 meses', months: 3 },
  { src: 'img/presets/sub_6.png', name: '6 meses', months: 6 },
  { src: 'img/presets/sub_12.png', name: '1 año', months: 12 }
];
const tierOptions = [{ value: '1', label: 'Nivel 1' }, { value: '2', label: 'Nivel 2' }, { value: '3', label: 'Nivel 3' }];
const whoNow = () => $('#who').value.trim();

const EVENTS = {
  sub() {
    formModal({
      title: 'Suscripción', submitLabel: 'Añadir',
      fields: [
        { key: 'user', label: 'Usuario', type: 'user', value: whoNow(), required: true },
        { key: 'tier', label: 'Tipo', type: 'select', value: '1', options: [...tierOptions, { value: 'prime', label: 'Prime' }] },
        { key: 'months', label: 'Meses suscrito (1 = sub nueva)', type: 'number', value: 1, min: 1 },
        { key: 'streak', label: 'Racha (meses seguidos, opcional)', type: 'number', value: 0, min: 0 },
        { key: 'text', label: 'Mensaje (opcional)', type: 'textarea', rows: 2 },
        { key: 'badge', label: 'Darle la insignia de sub del canal', type: 'check', value: true }
      ],
      onSubmit(v) {
        const u = DB.ensureUser(v.user); if (!u) return false;
        if (v.badge) autoSubBadge(u, v.months);
        pushItem({ type: 'sub', userId: u.id, tier: v.tier, months: v.months || 1, streak: v.streak || 0, text: v.text });
        refreshUsersDatalist(); updateWhoPreview();
      }
    });
  },
  gift() {
    formModal({
      title: 'Regalar suscripciones', submitLabel: 'Añadir',
      fields: [
        { key: 'user', label: 'Quién regala', type: 'user', value: whoNow() },
        { key: 'anon', label: 'Regalo anónimo', type: 'check' },
        { key: 'to', label: 'Receptores', placeholder: 'usuario1, usuario2', hint: 'Separados por comas. Si son varios (o pones cantidad) sale como regalo a la comunidad.' },
        { key: 'count', label: 'Cantidad total (opcional)', type: 'number', value: 0, min: 0 },
        { key: 'tier', label: 'Nivel', type: 'select', value: '1', options: tierOptions },
        { key: 'total', label: 'Total regalado en el canal (opcional)', type: 'number', value: 0, min: 0 },
        { key: 'badge', label: 'Dar insignia de sub a los receptores', type: 'check', value: true }
      ],
      onSubmit(v) {
        const g = v.anon ? null : DB.ensureUser(v.user);
        if (!v.anon && !g) { toast('Falta quién regala', 'error'); return false; }
        const rec = String(v.to || '').split(/[,\n;]+/).map(cleanName).filter(Boolean).map(n => DB.ensureUser(n));
        const n = Math.max(v.count || 0, rec.length);
        if (!n) { toast('Pon al menos un receptor o una cantidad', 'error'); return false; }
        const base = { userId: g ? g.id : null, anon: v.anon, tier: v.tier };
        const time = currentTime();
        if (n === 1 && rec.length === 1) {
          CH.messages.push({ ...base, id: uid(), time, type: 'gift', toId: rec[0].id, total: v.total || 0 });
        } else {
          CH.messages.push({ ...base, id: uid(), time, type: 'giftbomb', count: n, total: v.total || 0 });
          rec.forEach(r => CH.messages.push({ ...base, id: uid(), time, type: 'gift', toId: r.id }));
        }
        if (v.badge) rec.forEach(r => autoSubBadge(r, 1));
        saveCH(); refreshUsersDatalist(); renderChat(CH); updateWhoPreview();
      }
    });
  },
  raid() {
    formModal({
      title: 'Raid', submitLabel: 'Añadir',
      fields: [
        { key: 'raider', label: 'Canal que hace la raid', type: 'user', required: true },
        { key: 'viewers', label: 'Espectadores', type: 'number', value: 84, min: 1 }
      ],
      onSubmit(v) { pushItem({ type: 'raid', raider: cleanName(v.raider), viewers: (v.viewers || 1).toLocaleString('es-ES') }); }
    });
  },
  bits() {
    formModal({
      title: 'Bits (cheer)', submitLabel: 'Enviar',
      fields: [
        { key: 'user', label: 'Usuario', type: 'user', value: whoNow(), required: true },
        { key: 'bits', label: 'Cantidad de bits', type: 'number', value: 100, min: 1 },
        { key: 'text', label: 'Mensaje (opcional)', type: 'textarea', rows: 2 }
      ],
      onSubmit(v) {
        const u = DB.ensureUser(v.user); if (!u || !(v.bits > 0)) return false;
        pushItem({ type: 'msg', userId: u.id, text: v.text, bits: v.bits });
        refreshUsersDatalist();
      }
    });
  },
  announce() {
    formModal({
      title: 'Anuncio', submitLabel: 'Publicar',
      fields: [
        { key: 'user', label: 'Usuario (streamer o mod)', type: 'user', value: (DB.user(CH.ownerId) || {}).name, required: true },
        { key: 'text', label: 'Texto', type: 'textarea', required: true },
        { key: 'color', label: 'Color', type: 'select', value: 'primary', options: [
          { value: 'primary', label: 'Principal' }, { value: 'purple', label: 'Morado' }, { value: 'blue', label: 'Azul' },
          { value: 'green', label: 'Verde' }, { value: 'orange', label: 'Naranja' }] }
      ],
      onSubmit(v) {
        const u = DB.ensureUser(v.user); if (!u) return false;
        pushItem({ type: 'announce', userId: u.id, text: v.text, color: v.color });
      }
    });
  },
  pin() {
    formModal({
      title: 'Fijar mensaje', submitLabel: 'Fijar',
      fields: [
        { key: 'user', label: 'Autor del mensaje', type: 'user', value: whoNow(), required: true },
        { key: 'text', label: 'Mensaje', type: 'textarea', required: true },
        { key: 'by', label: 'Fijado por', type: 'user', value: (DB.user(CH.ownerId) || {}).name },
        { key: 'add', label: 'Enviarlo también al chat', type: 'check', value: true }
      ],
      onSubmit(v) {
        const u = DB.ensureUser(v.user); if (!u) return false;
        const by = DB.ensureUser(v.by) || DB.user(CH.ownerId);
        CH.pinned = { userId: u.id, text: v.text, byId: by.id };
        if (v.add) pushItem({ type: 'msg', userId: u.id, text: v.text });
        else { saveCH(); renderChat(CH, { keepScroll: true }); }
        refreshUsersDatalist();
      }
    });
  },
  unpin() { CH.pinned = null; saveCH(); renderChat(CH, { keepScroll: true }); },
  system() {
    formModal({
      title: 'Mensaje del sistema', submitLabel: 'Añadir',
      fields: [{ key: 'text', label: 'Texto (gris, sin usuario)', type: 'textarea', required: true, placeholder: 'El chat está en modo solo emotes.' }],
      onSubmit(v) { pushItem({ type: 'system', text: v.text }); }
    });
  }
};

/* ---------- Pegar guion: "usuario: mensaje" por línea ---------- */
function scriptModal() {
  openModal({
    title: 'Pegar guion',
    wide: true,
    body: `
      <p class="muted-p small">Una línea por mensaje con el formato <code>usuario: mensaje</code>. Los usuarios que no existan se crean solos.
      Las líneas sin “:” se añaden como mensaje del sistema.</p>
      <textarea id="scriptText" rows="12" placeholder="usuario1: hola chat!&#10;usuario2: @usuario1 holaa&#10;usuario3: /me saluda"></textarea>`,
    footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="scriptGo">Añadir al chat</button>`,
    onMount(el, close) {
      $('#scriptText', el).focus();
      $('#scriptGo', el).onclick = () => {
        const lines = $('#scriptText', el).value.split('\n').map(l => l.trim()).filter(Boolean);
        let n = 0;
        lines.forEach(line => {
          const i = line.indexOf(':');
          const name = i > 0 ? line.slice(0, i).trim() : '';
          if (i > 0 && name && !/\s/.test(name) && !/^https?$/i.test(name)) {
            const u = DB.ensureUser(name);
            CH.messages.push({ id: uid(), time: currentTime(), type: 'msg', userId: u.id, text: line.slice(i + 1).trim() });
          } else {
            CH.messages.push({ id: uid(), time: currentTime(), type: 'system', text: line });
          }
          n++;
        });
        saveCH(); refreshUsersDatalist(); renderChat(CH); close();
        toast(`✅ ${n} línea(s) añadidas`);
      };
    }
  });
}

/* ---------- Captura ---------- */
function enterCapture() { document.body.classList.add('capture'); renderChat(CH); }
function exitCapture() { document.body.classList.remove('capture'); }

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}
async function downloadPNG(sel = '#twChat', baseName = null) {
  try {
    if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    document.body.classList.add('shooting');
    const canvas = await html2canvas($(sel), { backgroundColor: sel === '#twChat' ? '#18181b' : '#0e0e10', scale: 2, useCORS: true, logging: false });
    document.body.classList.remove('shooting');
    const a = document.createElement('a');
    const o = DB.user(CH.ownerId) || { name: 'chat' };
    a.download = `${baseName || 'chat_' + o.name}_${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  } catch (e) {
    document.body.classList.remove('shooting');
    console.error(e);
    toast('No se pudo generar la imagen (¿sin conexión?). Usa el modo captura y haz una captura de pantalla.', 'error');
  }
}

/* ---------- Ajustes del canal ---------- */
function channelSettings(tab = 'general', onChange = null) {
  const owner = DB.user(CH.ownerId);
  const tabs = [['general', 'Perfil'], ['roles', 'Mods · VIPs · Subs'], ['badges', 'Insignias de sub'], ['danger', 'Borrar']];
  const refreshAll = () => {
    saveCH(); refreshUsersDatalist();
    if ($('#twList')) { renderChat(CH, { keepScroll: true }); updateWhoPreview(); viewRefreshHead(); }
    if (onChange) onChange();
  };

  const TABS = {
    general(body) {
      const linksText = (CH.links || []).map(l => `${l.label} | ${l.url}`).join('\n');
      body.innerHTML = `
        <div class="banner-edit" style="${CH.banner ? `background-image:url('${CH.banner}')` : ''}">
          ${CH.banner ? '' : '<span>Sin banner</span>'}
          <div class="banner-edit-btns">
            <button class="btn ghost sm" id="setBanner">${CH.banner ? 'Cambiar banner' : 'Subir banner'}</button>
            ${CH.banner ? '<button class="btn ghost sm" id="delBanner">Quitar</button>' : ''}
          </div>
        </div>
        <p class="hint" style="margin:-6px 0 12px">Tamaño recomendado del banner: 1200 × 480. En el móvil se ve la franja del centro, como en Twitch.</p>
        <div class="settings-general">
          <div class="avatar-edit">
            <button class="avatar-btn big" id="setAvatar" title="Cambiar foto">${avatarHTML(owner, 72)}</button>
            <small class="muted-p">Foto de perfil</small>
          </div>
          <div class="form">
            <div class="grid2">
              <label class="field"><span>Nombre del canal</span><input id="setName" value="${esc(owner.name)}"></label>
              <label class="field"><span>Color del nombre</span><input type="color" id="setColor" value="${esc(owner.color)}"></label>
            </div>
            <label class="check"><input type="checkbox" id="setVerified"${owner.verified ? ' checked' : ''}><span>Verificado (partner)</span></label>
            <label class="field"><span>Biografía</span><textarea id="setBio" rows="3" placeholder="Cuéntale al mundo algo sobre el canal…">${esc(CH.bio)}</textarea></label>
            <div class="grid2">
              <label class="field"><span>Seguidores</span><input id="setFollowers" type="number" min="0" value="${CH.followers || 0}"></label>
              <label class="field"><span>Espectadores (si está en directo)</span><input id="setViewers" type="number" min="0" value="${CH.viewers || 0}"></label>
            </div>
            <label class="check"><input type="checkbox" id="setLive"${CH.live ? ' checked' : ''}><span>Está en directo ahora</span></label>
            <label class="field"><span>Último directo <small>· sale cuando está desconectado</small></span><input id="setLastLive" value="${esc(CH.lastLive || '')}" placeholder="el 21 de octubre"></label>
            <label class="field"><span>Título del directo</span><input id="setTitle" value="${esc(CH.title)}" placeholder="Título del directo"></label>
            <label class="field"><span>Categoría</span><input id="setCat" value="${esc(CH.category)}" placeholder="Just Chatting"></label>
            <div class="field"><span>Miniatura del directo</span>
              <div class="row"><button class="btn ghost" id="setThumb">Subir imagen…</button>${CH.thumb ? '<button class="btn ghost" id="delThumb">Quitar</button>' : ''}</div></div>
            <label class="field"><span>Redes sociales <small>· una por línea: Nombre | enlace</small></span>
              <textarea id="setLinks" rows="3" placeholder="Instagram | https://instagram.com/usuario&#10;YouTube | https://youtube.com/@usuario">${esc(linksText)}</textarea></label>
          </div>
        </div>`;
      const again = () => TABS.general(body);
      $('#setBanner', body).onclick = async () => { const i = await pickImage(1200); if (i) { CH.banner = i; refreshAll(); again(); } };
      const db = $('#delBanner', body); if (db) db.onclick = () => { CH.banner = null; refreshAll(); again(); };
      $('#setAvatar', body).onclick = async () => { const i = await pickImage(160); if (i) { owner.avatar = i; refreshAll(); again(); } };
      $('#setName', body).onchange = e => {
        if (!DB.renameUser(owner.id, e.target.value)) { toast('Ese nombre ya existe', 'error'); e.target.value = owner.name; return; }
        refreshAll();
      };
      $('#setColor', body).onchange = e => { owner.color = e.target.value; refreshAll(); };
      $('#setVerified', body).onchange = e => { owner.verified = e.target.checked; refreshAll(); };
      $('#setBio', body).onchange = e => { CH.bio = e.target.value; refreshAll(); };
      $('#setFollowers', body).onchange = e => { CH.followers = Number(e.target.value) || 0; refreshAll(); };
      $('#setViewers', body).onchange = e => { CH.viewers = Number(e.target.value) || 0; refreshAll(); };
      $('#setLive', body).onchange = e => { CH.live = e.target.checked; refreshAll(); };
      $('#setLastLive', body).onchange = e => { CH.lastLive = e.target.value.trim(); refreshAll(); };
      $('#setTitle', body).onchange = e => { CH.title = e.target.value; refreshAll(); };
      $('#setCat', body).onchange = e => { CH.category = e.target.value; refreshAll(); };
      $('#setThumb', body).onclick = async () => { const i = await pickImage(640); if (i) { CH.thumb = i; refreshAll(); again(); } };
      const del = $('#delThumb', body); if (del) del.onclick = () => { CH.thumb = null; refreshAll(); again(); };
      $('#setLinks', body).onchange = e => {
        CH.links = e.target.value.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
          const i = l.indexOf('|');
          if (i < 0) return { label: l.replace(/^https?:\/\//, '').replace(/\/$/, ''), url: l };
          return { label: l.slice(0, i).trim(), url: l.slice(i + 1).trim() };
        });
        refreshAll();
      };
    },

    roles(body) {
      const badgeOpts = CH.subBadges.map(b => `<option value="${b.id}">${esc(b.name || 'Sub')}${b.months ? ` (${b.months} m)` : ''}</option>`).join('');
      body.innerHTML = `
        <div class="card inner">
          <div class="field"><span>Añadir varios a la vez <small>· nombres separados por comas (se crean si no existen)</small></span>
            <div class="row wrap">
              <input id="bulkNames" placeholder="usuario1, usuario2" class="grow">
              <select id="bulkRole">
                <option value="mod">Moderador</option><option value="vip">VIP</option>
                ${CH.subBadges.length ? CH.subBadges.map(b => `<option value="sub:${b.id}">Sub · ${esc(b.name || 'Sub')}</option>`).join('') : '<option value="" disabled>Sub (crea antes una insignia)</option>'}
              </select>
              <button class="btn primary" id="bulkRoleGo">Añadir</button>
            </div>
          </div>
        </div>
        <div class="row"><input id="roleSearch" class="search grow" placeholder="Buscar usuario…"><label class="check sm"><input type="checkbox" id="onlyRoles"><span>Solo con rol</span></label></div>
        <div class="roles-table">
          <div class="roles-row head"><span>Usuario</span><span>Mod</span><span>VIP</span><span>Sub</span></div>
          <div id="rolesRows"></div>
        </div>
        ${CH.subBadges.length ? '' : '<p class="muted-p small">Para poner subs, primero crea al menos una insignia en la pestaña “Insignias de sub”.</p>'}`;

      const rows = () => {
        const q = $('#roleSearch', body).value.trim().toLowerCase();
        const only = $('#onlyRoles', body).checked;
        const users = DB.data.users.filter(u => u.id !== CH.ownerId && u.name.toLowerCase().includes(q))
          .filter(u => !only || CH.mods.includes(u.id) || CH.vips.includes(u.id) || CH.subs[u.id])
          .sort((a, b) => a.name.localeCompare(b.name));
        $('#rolesRows', body).innerHTML = users.map(u => `
          <div class="roles-row" data-uid="${u.id}">
            <span class="r-name"><span class="tw-badges">${badgesHTML(CH, u)}</span><b style="color:${readableColor(u.color)}">${esc(u.name)}</b></span>
            <span><input type="checkbox" data-r="mod"${CH.mods.includes(u.id) ? ' checked' : ''}></span>
            <span><input type="checkbox" data-r="vip"${CH.vips.includes(u.id) ? ' checked' : ''}></span>
            <span><select data-r="sub"${CH.subBadges.length ? '' : ' disabled'}><option value="">—</option>${badgeOpts}</select></span>
          </div>`).join('') || '<p class="muted-p small" style="padding:10px">No hay usuarios.</p>';
        $$('select[data-r="sub"]', body).forEach(sel => { sel.value = CH.subs[sel.closest('[data-uid]').dataset.uid] || ''; });
      };
      rows();
      $('#roleSearch', body).oninput = rows;
      $('#onlyRoles', body).onchange = rows;
      $('#rolesRows', body).addEventListener('change', e => {
        const uidv = e.target.closest('[data-uid]').dataset.uid; const r = e.target.dataset.r;
        if (r === 'mod' || r === 'vip') {
          const arr = r === 'mod' ? CH.mods : CH.vips;
          const i = arr.indexOf(uidv);
          if (e.target.checked && i < 0) arr.push(uidv);
          if (!e.target.checked && i >= 0) arr.splice(i, 1);
        } else if (r === 'sub') {
          if (e.target.value) CH.subs[uidv] = e.target.value; else delete CH.subs[uidv];
        }
        refreshAll(); rows();
      });
      $('#bulkRoleGo', body).onclick = () => {
        const role = $('#bulkRole', body).value; if (!role) return;
        const names = $('#bulkNames', body).value.split(/[,\n;]+/).map(cleanName).filter(Boolean);
        if (!names.length) return;
        names.forEach(n => {
          const u = DB.ensureUser(n); if (u.id === CH.ownerId) return;
          if (role === 'mod' && !CH.mods.includes(u.id)) CH.mods.push(u.id);
          else if (role === 'vip' && !CH.vips.includes(u.id)) CH.vips.push(u.id);
          else if (role.startsWith('sub:')) CH.subs[u.id] = role.slice(4);
        });
        $('#bulkNames', body).value = '';
        refreshAll(); rows();
        toast(`✅ ${names.length} usuario(s) actualizados`);
      };
    },

    badges(body) {
      body.innerHTML = `
        <p class="muted-p small">Las insignias de sub son propias de cada canal. Puedes subir tu imagen (cuadrada, mejor 72×72) o usar una de las incluidas.
        Los “meses” sirven para que al poner una sub/resub se elija la insignia que toca.</p>
        <div class="badge-list" id="badgeList"></div>
        <div class="card inner">
          <h4 class="card-title">Nueva insignia</h4>
          <div class="row wrap">
            <input id="bName" placeholder="Nombre (p. ej. Sub 1 mes)" class="grow">
            <input id="bMonths" type="number" min="0" value="0" style="width:90px" title="Desde cuántos meses">
            <button class="btn primary" id="bUpload">Subir imagen…</button>
          </div>
          <div class="presets"><small class="muted-p">O usa una incluida:</small>
            ${BADGE_PRESETS.map(p => `<button class="preset" data-preset="${p.src}" data-name="${p.name}" data-months="${p.months}" title="${p.name}"><img src="${p.src}" alt=""></button>`).join('')}
          </div>
        </div>`;
      const list = () => {
        $('#badgeList', body).innerHTML = CH.subBadges.length ? CH.subBadges.map(b => `
          <div class="badge-row" data-bid="${b.id}">
            <img src="${esc(b.src)}" alt="">
            <input value="${esc(b.name)}" data-f="name" class="grow">
            <label class="months">desde <input type="number" min="0" value="${b.months || 0}" data-f="months"> meses</label>
            <span class="muted-p small">${Object.values(CH.subs).filter(x => x === b.id).length} subs</span>
            <button class="icon-btn danger" data-del>✕</button>
          </div>`).join('') : '<p class="muted-p small">Sin insignias todavía.</p>';
      };
      list();
      const add = src => {
        const name = $('#bName', body).value.trim() || 'Suscriptor';
        CH.subBadges.push({ id: uid(), name, src, months: Number($('#bMonths', body).value) || 0 });
        $('#bName', body).value = ''; $('#bMonths', body).value = 0;
        refreshAll(); list();
      };
      $('#bUpload', body).onclick = async () => { const i = await pickImage(72); if (i) add(i); };
      $$('[data-preset]', body).forEach(b => b.onclick = () => {
        if (!$('#bName', body).value.trim()) { $('#bName', body).value = b.dataset.name; $('#bMonths', body).value = b.dataset.months; }
        add(b.dataset.preset);
      });
      $('#badgeList', body).addEventListener('change', e => {
        const b = CH.subBadges.find(x => x.id === e.target.closest('[data-bid]').dataset.bid);
        if (e.target.dataset.f === 'name') b.name = e.target.value;
        if (e.target.dataset.f === 'months') b.months = Number(e.target.value) || 0;
        refreshAll();
      });
      $('#badgeList', body).addEventListener('click', async e => {
        if (!e.target.closest('[data-del]')) return;
        const id = e.target.closest('[data-bid]').dataset.bid;
        if (!(await confirmModal('¿Borrar esta insignia? Los subs que la tengan se quedarán sin insignia.'))) return;
        CH.subBadges = CH.subBadges.filter(x => x.id !== id);
        Object.keys(CH.subs).forEach(k => { if (CH.subs[k] === id) delete CH.subs[k]; });
        refreshAll(); list();
      });
    },

    danger(body, close) {
      body.innerHTML = `
        <p class="muted-p">Borrar el canal elimina su chat, roles e insignias. El usuario <b>${esc(owner.name)}</b> se mantiene.</p>
        <button class="btn danger" id="delCh">Borrar canal</button>`;
      $('#delCh', body).onclick = async () => {
        if (!(await confirmModal(`¿Borrar el canal <b>${esc(owner.name)}</b> para siempre?`))) return;
        DB.deleteChannel(CH.id); DB.save(); close(); location.hash = '#/';
      };
    }
  };

  openModal({
    title: 'Ajustes del canal',
    wide: true,
    body: `<div class="tabs">${tabs.map(([k, l]) => `<button class="tab${k === tab ? ' active' : ''}" data-tab="${k}">${l}</button>`).join('')}</div><div id="tabBody"></div>`,
    onMount(el, close) {
      const body = $('#tabBody', el);
      const show = t => {
        $$('.tab', el).forEach(b => b.classList.toggle('active', b.dataset.tab === t));
        TABS[t](body, close);
      };
      el.addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (t) show(t.dataset.tab); });
      show(tab);
    }
  });
}

function viewRefreshHead() {
  const owner = DB.user(CH.ownerId);
  const head = $('.ctrl-head');
  if (!head) return;
  head.querySelector('.avatar').outerHTML = avatarHTML(owner, 34);
  head.querySelector('.ctrl-head-meta').innerHTML = `<b>${esc(owner.name)}</b><span>${esc(CH.title || 'Sin título')}</span>`;
}


/* =====================================================
   VISTA: PERFIL DEL CANAL (banner, acerca de, vídeos)
===================================================== */
const VIDEO_TYPES = { past: 'Emisión anterior', highlight: 'Destacado', upload: 'Subida', clip: 'Clip' };
const fmtCompact = n => new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n) || 0);
const VERIFIED_SVG = '<svg class="verified-ico" viewBox="0 0 16 16" width="18" height="18" aria-label="Verificado"><path fill="#a970ff" fill-rule="evenodd" d="M12.5 3.5 8 2 3.5 3.5 2 8l1.5 4.5L8 14l4.5-1.5L14 8l-1.5-4.5ZM7 11l4.5-4.5L10 5 7 8 5.5 6.5 4 8l3 3Z"/></svg>';
const STAR_FILLED = '<svg viewBox="0 0 20 20" width="20" height="20"><path fill="currentColor" d="M8.944 2.654c.406-.872 1.706-.872 2.112 0l1.754 3.77 4.2.583c.932.13 1.318 1.209.664 1.853l-3.128 3.083.755 4.272c.163.92-.876 1.603-1.722 1.132L10 15.354l-3.579 1.993c-.846.47-1.885-.212-1.722-1.132l.755-4.272L2.326 8.86c-.654-.644-.268-1.723.664-1.853l4.2-.583 1.754-3.77z"/></svg>';
const LINK_SVG = '<svg viewBox="0 0 20 20" width="18" height="18"><path fill="currentColor" d="M6 8h2V6H6a4 4 0 000 8h2v-2H6a2 2 0 010-4zm8-2h-2v2h2a2 2 0 010 4h-2v2h2a4 4 0 000-8zm-1 5V9H7v2h6z"/></svg>';

let profileTab = 'home';
let videoFilter = 'all';

function videoCardHTML(ch, v, editable) {
  const o = DB.user(ch.ownerId) || { name: '', color: '#9147ff' };
  const thumb = v.thumb ? `background-image:url('${v.thumb}')` : `background:linear-gradient(135deg, ${readableColor(o.color)}66, #18181b 75%)`;
  return `
    <div class="vid-card" data-vid="${v.id}">
      <div class="vid-thumb" style="${thumb}">
        ${v.duration ? `<span class="vid-pill tl">${esc(v.duration)}</span>` : ''}
        ${v.views !== '' && v.views != null ? `<span class="vid-pill bl">${fmtCompact(v.views)} visualizaciones</span>` : ''}
        ${v.date ? `<span class="vid-pill br">${esc(v.date)}</span>` : ''}
        ${editable ? '<span class="vid-edit">Editar</span>' : ''}
      </div>
      <div class="vid-info">
        ${avatarHTML(o, 30)}
        <div class="vid-meta">
          <b class="vid-title">${esc(v.title || 'Sin título')}</b>
          <span>${esc(o.name)}</span>
          ${v.category ? `<span>${esc(v.category)}</span>` : ''}
        </div>
      </div>
    </div>`;
}

function videoForm(ch, v, after, newType = 'past') {
  const isNew = !v;
  v = v || { type: newType, title: ch.title || '', category: ch.category || '', duration: newType === 'clip' ? '0:28' : '2:14:37', date: 'hace 2 días', views: Math.floor(500 + Math.random() * 20000), thumb: null };
  formModal({
    title: isNew ? 'Añadir vídeo' : 'Editar vídeo',
    submitLabel: isNew ? 'Añadir' : 'Guardar',
    extraFooter: isNew ? '' : '<button class="btn danger" data-extra="del">Borrar</button>',
    onExtra: async act => {
      if (act === 'del' && await confirmModal('¿Borrar este vídeo?')) {
        ch.videos = ch.videos.filter(x => x.id !== v.id); DB.save(); after();
      }
    },
    fields: [
      { key: 'title', label: 'Título', value: v.title, required: true, placeholder: 'Título del vídeo' },
      { key: 'type', label: 'Tipo', type: 'select', value: v.type, options: Object.entries(VIDEO_TYPES).map(([value, label]) => ({ value, label })) },
      { key: 'category', label: 'Categoría', value: v.category, placeholder: 'Just Chatting' },
      { key: 'duration', label: 'Duración', value: v.duration, placeholder: '2:14:37' },
      { key: 'date', label: 'Fecha', value: v.date, placeholder: 'hace 2 días', hint: 'Escríbela como quieras que salga: “hace 2 días”, “ayer”, “12 oct 2026”…' },
      { key: 'views', label: 'Visualizaciones', type: 'number', value: v.views, min: 0 },
      { key: 'thumb', label: 'Miniatura', type: 'image', value: v.thumb, max: 640, hint: 'Sin imagen se usa un degradado con el color del canal.' }
    ],
    onSubmit(val) {
      Object.assign(v, val);
      if (isNew) { v.id = uid(); ch.videos.unshift(v); }
      DB.save(); after();
    }
  });
}

/* Iconos de redes (se eligen por el nombre o el enlace) */
const SOCIAL_ICONS = {
  twitter: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M22 5.8c-.7.3-1.5.5-2.3.6.8-.5 1.5-1.3 1.8-2.2-.8.5-1.7.8-2.6 1a4.1 4.1 0 00-7 3.7A11.6 11.6 0 013.4 4.6a4.1 4.1 0 001.3 5.5c-.7 0-1.3-.2-1.9-.5 0 2 1.4 3.7 3.3 4.1-.6.2-1.2.2-1.9.1.5 1.6 2 2.8 3.8 2.9A8.3 8.3 0 012 18.4 11.6 11.6 0 008.3 20c7.5 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.5-1.3 2-2z"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M21.6 7.2a2.5 2.5 0 00-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 002.4 7.2 26 26 0 002 12a26 26 0 00.4 4.8 2.5 2.5 0 001.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 001.8-1.8A26 26 0 0022 12a26 26 0 00-.4-4.8zM10 15V9l5.2 3L10 15z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm0 2a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H7zm5 3.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9zm0 2a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM17.3 5.4a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M16.6 3c.4 2 1.9 3.5 3.9 3.8v3a7 7 0 01-3.9-1.2v6.6A6.2 6.2 0 1110.4 9v3.1a3.1 3.1 0 102.2 3V3h4z"/></svg>',
  link: '<svg viewBox="0 0 20 20" width="20" height="20"><path fill="currentColor" d="M6 8h2V6H6a4 4 0 000 8h2v-2H6a2 2 0 010-4zm8-2h-2v2h2a2 2 0 010 4h-2v2h2a4 4 0 000-8zm-1 5V9H7v2h6z"/></svg>'
};
function socialIcon(l) {
  const t = (l.label + ' ' + l.url).toLowerCase();
  if (/twitter/.test(t)) return SOCIAL_ICONS.twitter;
  if (/youtu/.test(t)) return SOCIAL_ICONS.youtube;
  if (/insta/.test(t)) return SOCIAL_ICONS.instagram;
  if (/tiktok/.test(t)) return SOCIAL_ICONS.tiktok;
  if (/(^|\W)x(\.com)?(\W|$)/.test(t)) return SOCIAL_ICONS.x;
  return SOCIAL_ICONS.link;
}
const linksHTML = ch => ch.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${socialIcon(l)}<span>${esc(l.label)}</span></a>`).join('');
const HEART = '<svg viewBox="0 0 20 20" width="20" height="20"><path fill="currentColor" fill-rule="evenodd" d="M9.17 4.33A4.5 4.5 0 002 8.06c0 1.2.47 2.34 1.32 3.18L10 18l6.68-6.76A4.5 4.5 0 0018 8.06a4.5 4.5 0 00-7.17-3.73L10 5l-.83-.67z"/></svg>';
const BELL = '<svg viewBox="0 0 20 20" width="20" height="20"><path fill="currentColor" d="M10 2a5 5 0 00-5 5v3.6L3.3 14h13.4L15 10.6V7a5 5 0 00-5-5zm-2 14a2 2 0 004 0H8z"/></svg>';
const CHEVRON = '<svg viewBox="0 0 20 20" width="14" height="14"><path fill="currentColor" d="M5 7.5L10 12.5 15 7.5z"/></svg>';
const EYE = '<svg viewBox="0 0 20 20" width="18" height="18"><path fill="currentColor" d="M10 4C5 4 2 10 2 10s3 6 8 6 8-6 8-6-3-6-8-6zm0 10a4 4 0 110-8 4 4 0 010 8zm0-2a2 2 0 100-4 2 2 0 000 4z"/></svg>';
const DOTS = '<svg viewBox="0 0 20 20" width="22" height="22"><path fill="currentColor" d="M4 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/></svg>';
const TYPE_PILL = { past: 'Emisión anterior', highlight: 'Destacados', upload: 'Subida', clip: 'Clip' };

function viewProfile(id) {
  setNav('home');
  CH = DB.channel(id);
  if (!CH) { location.hash = '#/'; return; }
  const ch = CH;
  const o = DB.user(ch.ownerId) || { name: '?', color: '#9147ff' };
  const tab = profileTab;
  const banner = ch.banner ? `background-image:url('${ch.banner}')` : `background:linear-gradient(120deg, ${readableColor(o.color)}55, #18181b 60%, #0e0e10)`;
  const thumb = ch.thumb ? `background-image:url('${ch.thumb}')` : banner;
  const viewers = Number(ch.viewers || 0).toLocaleString('es-ES');

  /* ---------- Cabecera de ordenador ---------- */
  const deskTop = ch.live ? `
      <div class="prof-player" style="${thumb}">
        <div class="prof-player-top"><span class="live-pill">EN DIRECTO</span><span class="viewers-pill">${viewers} espectadores</span></div>
        <div class="prof-player-title"><b>${esc(ch.title || 'Sin título')}</b>${ch.category ? `<span>${esc(ch.category)}</span>` : ''}</div>
      </div>` : `
      <div class="prof-off">
        <div class="prof-banner" style="${banner}"></div>
        <div class="offline-card">
          <span class="offline-pill">DESCONECTADO</span>
          <b>${esc(o.name)} está desconectado.</b>
          ${ch.lastLive ? `<span class="muted-p small">Último directo ${esc(ch.lastLive)}</span>` : ''}
        </div>
      </div>`;
  const deskHead = `
    <div class="prof-head desk-only">
      <div class="prof-avatar${ch.live ? ' live' : ''}">${avatarHTML(o, 64)}${ch.live ? '<span class="live-tag">EN DIRECTO</span>' : ''}</div>
      <div class="prof-id">
        <h1>${esc(o.name)}${o.verified ? VERIFIED_SVG : ''}</h1>
        <span>${fmtCompact(ch.followers)} seguidores</span>
      </div>
      <div class="prof-actions">
        <button class="tw-btn-follow${ch.following ? ' on' : ''}" data-act="follow" title="${ch.following ? 'Dejar de seguir' : 'Seguir'}">${HEART}${ch.following ? '' : 'Seguir'}</button>
        <button class="tw-btn-sub${ch.subscribed ? ' on' : ''}" data-act="sub">${ch.subscribed ? STAR_FILLED + 'Suscrito' : ICONS.star + 'Suscribirse'}</button>
      </div>
    </div>`;

  /* ---------- Cabecera del móvil (como la app de Twitch) ---------- */
  const mobHead = `
    <div class="pm mob-only-block">
      ${ch.live ? `<div class="pm-player" style="${thumb}"><span class="live-pill">EN DIRECTO</span><span class="viewers-pill">${viewers}</span></div>`
                : `<div class="pm-banner" style="${banner}"></div>`}
      <button class="pm-dots" data-act="menu" aria-label="Opciones">${DOTS}</button>
      <div class="pm-id${ch.live ? ' is-live' : ''}">
        <div class="pm-av${ch.live ? ' live' : ''}">${avatarHTML(o, 92)}</div>
        <div class="pm-name">
          <h1>${esc(o.name)}${o.verified ? VERIFIED_SVG : ''}</h1>
          <span>${ch.live ? `<b class="pm-live">EN DIRECTO</b> · ${viewers} espectadores` : (ch.lastLive ? `Último directo ${esc(ch.lastLive)}` : 'Desconectado')}</span>
        </div>
      </div>
      ${ch.live && ch.title ? `<p class="pm-title">${esc(ch.title)}${ch.category ? ` <span>${esc(ch.category)}</span>` : ''}</p>` : ''}
      ${ch.bio ? `<p class="pm-bio">${esc(ch.bio).replace(/\n/g, '<br>')}</p>` : ''}
      <p class="pm-f"><b>${fmtCompact(ch.followers)}</b> seguidores</p>
      ${ch.links.length ? `<div class="pm-links">${linksHTML(ch)}</div>` : ''}
      <div class="pm-btns">
        ${ch.following
          ? `<button class="pm-btn gray" data-act="follow" title="Dejar de seguir">${HEART}${CHEVRON}</button><button class="pm-btn gray" tabindex="-1">${BELL}${CHEVRON}</button>`
          : `<button class="pm-btn purple grow2" data-act="follow">${HEART}Seguir</button>`}
        <button class="pm-btn purple grow2" data-act="sub">${ch.subscribed ? ICONS.gift + 'Regalar una sub' : ICONS.star + 'Suscribirse'}</button>
      </div>
    </div>`;

  /* ---------- Contenido de las pestañas ---------- */
  const aboutHTML = `
    <div class="about">
      <h3>Acerca de ${esc(o.name)}</h3>
      <p class="about-f"><b>${fmtCompact(ch.followers)}</b> seguidores</p>
      ${ch.bio ? `<p class="about-bio">${esc(ch.bio).replace(/\n/g, '<br>')}</p>` : '<p class="muted-p">Este canal todavía no tiene biografía.</p>'}
      ${ch.links.length ? `<div class="about-links">${linksHTML(ch)}</div>` : ''}
    </div>`;
  const filter = tab === 'clips' ? 'clip' : videoFilter;
  const vids = filter === 'all' ? ch.videos : ch.videos.filter(v => v.type === filter);
  const addCard = `<button class="vid-add" data-act="add"><span>+</span>Añadir vídeo</button>`;
  const grid = (list, cls = '') => `<div class="vid-grid ${cls}">${list.map(v => videoCardHTML(ch, v, true)).join('')}${addCard}</div>`;

  // Inicio en el móvil: destacado grande + fila deslizable
  const feat = ch.videos.find(v => v.type === 'highlight') || ch.videos[0];
  const clips = ch.videos.filter(v => v.type === 'clip');
  const rest = ch.videos.filter(v => v !== feat && v.type !== 'clip');
  const mobHome = `
    <div class="mob-only-block">
      ${feat ? `
        <div class="pm-feat" data-vid="${feat.id}">
          <div class="vid-thumb" style="${feat.thumb ? `background-image:url('${feat.thumb}')` : banner}">
            ${feat.duration ? `<span class="vid-pill tl">${esc(feat.duration)}</span>` : ''}
          </div>
          <span class="pm-feat-label">${feat.type === 'highlight' ? 'Destacado reciente' : 'Vídeo reciente'}</span>
          <b class="pm-feat-title">${esc(feat.title || 'Sin título')}</b>
          <span class="muted-p">${esc(o.name)}</span>
          <span class="muted-p">${fmtCompact(feat.views)} visualizaciones${feat.date ? ' · ' + esc(feat.date) : ''}</span>
        </div>` : ''}
      <div class="pm-row">
        ${clips.length ? `<button class="pm-card pm-clips" data-ptab="clips" style="--c:${readableColor(o.color)}">${avatarHTML(o, 44)}${avatarHTML(o, 44)}<b>Clips destacados</b><span class="pm-more">Mostrar todo</span></button>` : ''}
        ${[...clips.slice(0, 1), ...rest].slice(0, 8).map(v => `
          <div class="pm-card" data-vid="${v.id}" style="${v.thumb ? `background-image:url('${v.thumb}')` : banner}">
            <span class="pm-type">${TYPE_PILL[v.type] || 'Vídeo'}</span>
            <div class="pm-card-foot"><b>${esc(v.title || 'Sin título')}</b><span>${EYE}${fmtCompact(v.views)}</span></div>
          </div>`).join('')}
        <button class="pm-card pm-add" data-act="add"><span>+</span>Añadir vídeo</button>
      </div>
    </div>`;

  let body = '';
  if (tab === 'home') {
    body = `<div class="desk-only-block">${aboutHTML}
      <div class="prof-sec-head"><h3>Vídeos recientes</h3>${ch.videos.length > 4 ? '<button class="link-btn" data-ptab="videos">Ver todo</button>' : ''}</div>
      ${grid(ch.videos.slice(0, 4))}</div>${mobHome}`;
  } else if (tab === 'about') {
    body = aboutHTML;
  } else if (tab === 'clips') {
    body = grid(vids) + (vids.length ? '' : '<p class="muted-p">Todavía no hay clips. Añade un vídeo de tipo “Clip”.</p>');
  } else if (tab === 'videos') {
    body = `
      <div class="chips">${[['all', 'Todos'], ...Object.entries(VIDEO_TYPES)].map(([k, l]) =>
        `<button class="chip-btn${videoFilter === k ? ' active' : ''}" data-vfilter="${k}">${l}</button>`).join('')}</div>
      ${grid(vids)}${vids.length ? '' : '<p class="muted-p">No hay vídeos de este tipo todavía.</p>'}`;
  }
  const tabBtn = (k, l) => `<button data-ptab="${k}" class="${tab === k ? 'active' : ''}">${l}</button>`;

  view().innerHTML = `
  <div class="prof-tools desk-only-flex">
    <a href="#/" class="btn ghost sm">← Canales</a>
    <span class="grow"></span>
    <button class="btn ghost sm live-toggle${ch.live ? ' on' : ''}" data-act="live" title="Cambiar entre en directo y desconectado">${ch.live ? '🔴 En directo' : '⚫ Desconectado'}</button>
    <button class="btn ghost sm" data-act="edit">✏️ Editar perfil</button>
    <button class="btn ghost sm" data-act="png">🖼️ Descargar PNG</button>
    <button class="btn capture sm" data-act="capture">Modo captura</button>
  </div>
  <div class="prof" id="profPage">
    <div class="desk-only-block">${deskTop}</div>
    ${mobHead}
    ${deskHead}
    <nav class="prof-tabs">
      ${tabBtn('home', 'Inicio')}${tabBtn('about', 'Acerca de')}${tabBtn('clips', 'Clips')}${tabBtn('videos', 'Vídeos')}
      <a href="#/c/${ch.id}" class="prof-chat-tab">Chat</a>
    </nav>
    <div class="prof-body">${body}</div>
  </div>
  <button class="exit-capture" id="exitCapture" title="Salir (Esc)">✕ Salir del modo captura</button>`;

  const rerender = () => viewProfile(id);
  const ACTIONS = {
    follow() { ch.following = !ch.following; DB.save(); rerender(); },
    sub() { ch.subscribed = !ch.subscribed; DB.save(); rerender(); },
    live() { ch.live = !ch.live; DB.save(); rerender(); },
    edit() { channelSettings('general', rerender); },
    png() { downloadPNG('#profPage', o.name + '_perfil'); },
    capture() { document.body.classList.add('capture'); },
    add() { videoForm(ch, null, rerender); },
    addclip() { videoForm(ch, null, rerender, 'clip'); },
    menu() {
      openModal({
        title: o.name,
        body: `<div class="stack">
          <button class="btn ghost wide" data-m="edit">✏️ Editar perfil</button>
          <button class="btn ghost wide" data-m="live">${ch.live ? '⚫ Poner desconectado' : '🔴 Poner en directo'}</button>
          <button class="btn ghost wide" data-m="add">➕ Añadir vídeo</button>
          <button class="btn ghost wide" data-m="chat">💬 Abrir chat</button>
          <button class="btn ghost wide" data-m="png">🖼️ Descargar PNG</button>
          <button class="btn capture wide" data-m="capture">Modo captura</button></div>`,
        onMount(el, close) {
          el.querySelector('.stack').onclick = e => {
            const b = e.target.closest('[data-m]'); if (!b) return;
            close();
            if (b.dataset.m === 'chat') location.hash = '#/c/' + ch.id; else ACTIONS[b.dataset.m]();
          };
        }
      });
    }
  };
  view().onclick = e => {
    const t = e.target.closest('[data-ptab]');
    if (t) { profileTab = t.dataset.ptab; return rerender(); }
    const f = e.target.closest('[data-vfilter]');
    if (f) { videoFilter = f.dataset.vfilter; return rerender(); }
    const a = e.target.closest('[data-act]');
    if (a && ACTIONS[a.dataset.act]) return ACTIONS[a.dataset.act]();
    const c = e.target.closest('[data-vid]');
    if (c) videoForm(ch, ch.videos.find(v => v.id === c.dataset.vid), rerender);
  };
  $('#exitCapture').onclick = e => { e.stopPropagation(); exitCapture(); };
}

/* =====================================================
   Copia de seguridad
===================================================== */
function exportData() {
  const blob = new Blob([JSON.stringify(DB.data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const d = new Date();
  a.download = `faketv_copia_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function importData() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'application/json,.json';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data || !Array.isArray(data.users) || !Array.isArray(data.channels)) throw new Error('formato');
      if (!(await confirmModal('Esto <b>reemplaza</b> todos tus datos actuales por los de la copia. ¿Seguir?', 'Importar'))) return;
      await DB.replaceAll(data); refreshUsersDatalist(); route();
      toast('✅ Copia importada');
    } catch (e) { toast('Archivo no válido', 'error'); }
  };
  inp.click();
}

/* =====================================================
   Router + arranque
===================================================== */
function route() {
  exitCapture();
  view().onclick = null;
  document.removeEventListener('mousedown', closeEmotePop);
  const parts = (location.hash.slice(1) || '/').split('/').filter(Boolean);
  if (parts[0] === 'c' && parts[1]) return viewChannel(parts[1]);
  if (parts[0] === 'p' && parts[1]) {
    if (!CH || CH.id !== parts[1]) { profileTab = 'home'; videoFilter = 'all'; }
    return viewProfile(parts[1]);
  }
  if (parts[0] === 'users') return viewUsers();
  if (parts[0] === 'emotes') return viewEmotes();
  if (parts[0] === 'chat') return viewChatPicker();
  viewHome();
}

/* =====================================================
   INSTALAR COMO APP (igual que en twt2015)
===================================================== */
const APP_URL = 'poufortnite.github.io/fake-tv';
let installEvt = null;     // lo que da Chrome/Edge para enseñar su ventana de "Instalar"
let installSystem = null;  // 'android' | 'ios' | 'pc'

const isInstalled = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = () => /android/i.test(navigator.userAgent);
const isSafariIOS = () => isIOS() && !/crios|fxios|edgios|opios|gsa\//i.test(navigator.userAgent);
const IOS_SHARE_ICON = '<svg class="ico-step" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9H6.5A1.5 1.5 0 0 0 5 10.5v9A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 17.5 9H16"/><path d="M12 3v11M8.5 6.5 12 3l3.5 3.5"/></g></svg>';

function installSteps(sys) {
  const now = installEvt && sys !== 'ios'
    ? `<button class="btn primary wide" data-inst="now">Instalar ahora</button>
       <p class="muted-p small inst-or">o, si prefieres hacerlo a mano:</p>` : '';
  if (sys === 'android') return `${now}
    <ol class="steps">
      <li>Abre <b>${APP_URL}</b> en <b>Chrome</b>.</li>
      <li>Toca el menú de los tres puntos <b>⋮</b> (arriba a la derecha).</li>
      <li>Toca <b>Instalar app</b> o <b>Añadir a pantalla de inicio</b>, y luego <b>Instalar</b>.</li>
    </ol>
    <p class="muted-p small">Te sale el icono en el móvil como cualquier otra app, y funciona también sin internet.</p>`;
  if (sys === 'ios') return `
    ${isIOS() && !isSafariIOS() ? '<p class="inst-warn">Ahora no estás en Safari. Copia el enlace y ábrelo en <b>Safari</b>: en otros navegadores del iPhone puede no salir la opción.</p>' : ''}
    <ol class="steps">
      <li>Abre <b>${APP_URL}</b> en <b>Safari</b>.</li>
      <li>Toca el botón <b>Compartir</b> ${IOS_SHARE_ICON} (el cuadrado con la flecha hacia arriba, abajo en el centro).</li>
      <li>Baja y toca <b>Añadir a pantalla de inicio</b>.</li>
      <li>Toca <b>Añadir</b>, arriba a la derecha.</li>
    </ol>
    <p class="inst-warn">En el iPhone, la app instalada y Safari guardan los datos por separado. Instálala <b>antes</b> de crear nada, o pásate lo de Safari con <b>Guardar copia</b> / <b>Cargar copia</b>.</p>`;
  return `${now}
    <ol class="steps">
      <li>Ábrela en <b>Chrome</b> o <b>Edge</b>.</li>
      <li>Toca el iconito de instalar a la derecha de la barra de direcciones (una pantalla con una flecha), o abre el menú <b>⋮</b> → <b>Instalar fake.tv</b> (en Chrome puede estar en <b>Enviar, guardar y compartir</b>).</li>
      <li>Confirma con <b>Instalar</b>.</li>
    </ol>`;
}

function paintInstall(body) {
  const opt = (k, t) => `<button class="${installSystem === k ? 'active' : ''}" data-sys="${k}">${t}</button>`;
  body.innerHTML = `
    <p class="inst-q">¿Dónde la quieres instalar?</p>
    <div class="seg">${opt('android', 'Android')}${opt('ios', 'iPhone')}${opt('pc', 'Ordenador')}</div>
    <div class="inst-steps">${installSteps(installSystem)}</div>`;
}

let installModal = null;
function openInstall() {
  if (!installSystem) installSystem = isIOS() ? 'ios' : isAndroid() ? 'android' : 'pc';
  installModal = openModal({
    title: 'Instalar la app',
    body: '<div class="inst" id="instBody"></div>',
    onMount(el, close) {
      const body = $('#instBody', el);
      paintInstall(body);
      body.addEventListener('click', async e => {
        const b = e.target.closest('[data-sys]');
        if (b) { installSystem = b.dataset.sys; return paintInstall(body); }
        if (e.target.closest('[data-inst="now"]') && installEvt) {
          installEvt.prompt();
          const { outcome } = await installEvt.userChoice;
          installEvt = null;
          if (outcome === 'accepted') close(); else paintInstall(body);
        }
      });
    }
  });
}

function setupInstall() {
  // Guarda los archivos de la app para que abra sin internet, y se actualiza sola
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    const hadVersion = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    }).catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadVersion) return;   // primera instalación: no hace falta recargar
      const reload = async () => {
        const busy = $('#modalRoot .modal-back') || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
        if (busy) return setTimeout(reload, 3000);
        await DB.flush();
        location.reload();
      };
      reload();
    });
  }
  // El botón "Instalar" está siempre (menos dentro de la app ya instalada)
  const btn = $('#installBtn');
  if (isInstalled()) return;
  btn.hidden = false;
  btn.onclick = openInstall;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installEvt = e;   // Chrome/Edge dejan instalarla con un botón
    const body = $('#instBody'); if (body) paintInstall(body);
  });
  window.addEventListener('appinstalled', () => {
    btn.hidden = true; installEvt = null;
    if (installModal) installModal.close();
    toast('✅ ¡App instalada!');
  });
}

/* =====================================================
   Arranque
===================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  setupInstall();
  $('#exportBtn').onclick = exportData;
  $('#importBtn').onclick = importData;
  $('#moreBtn').onclick = () => openModal({
    title: 'Copia de tus datos',
    body: `<p class="muted-p small">Tus datos solo están en este dispositivo. Guarda una copia de vez en cuando para no perderlos o para pasarlos a otro móvil u ordenador.</p>
      <div class="stack"><button class="btn ghost wide" data-m="export">Guardar copia</button><button class="btn ghost wide" data-m="import">Cargar copia</button></div>`,
    onMount(el, close) {
      el.querySelector('[data-m=export]').onclick = () => { close(); exportData(); };
      el.querySelector('[data-m=import]').onclick = () => { close(); importData(); };
    }
  });
  await DB.load();
  refreshUsersDatalist();
  window.addEventListener('hashchange', route);
  route();
  // Pedir que el navegador no borre los datos por falta de espacio
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
});

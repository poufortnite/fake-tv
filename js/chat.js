/* =====================================================
   fake.tv — chat.js
   Pinta el chat con la misma estructura visual que Twitch (PC)
===================================================== */
'use strict';

/* ---------- Emotes globales de Twitch (se cargan desde el CDN de Twitch) ---------- */
const TWITCH_EMOTES = {
  ':)': 1, ':(': 2, ':D': 3, '<3': 9,
  'Kappa': 25, 'KappaPride': 55338, 'Keepo': 1902, 'PogChamp': 305954156,
  'LUL': 425618, 'BibleThump': 86, 'Kreygasm': 41, 'ResidentSleeper': 245,
  '4Head': 354, 'NotLikeThis': 58765, 'SeemsGood': 64138, 'HeyGuys': 30259,
  'VoHiYo': 81274, 'CoolCat': 58127, 'DansGame': 33, 'SwiftRage': 34,
  'WutFace': 28087, 'EleGiggle': 4339, 'TwitchUnity': 196892, 'PJSalt': 36,
  'MrDestructoid': 28, 'CoolStoryBob': 123171, 'FailFish': 360, 'BloodTrail': 69,
  'OSFrog': 81248, 'TehePelo': 160393, 'SMOrc': 52, 'GivePLZ': 112291,
  'TakeNRG': 112292, 'HSWP': 446979, 'TwitchLit': 166263, 'Jebaited': 114836,
  'KomodoHype': 81273, 'StinkyCheese': 90076, 'CorgiDerp': 49106, 'GlitchCat': 304486301
};
const twitchEmoteURL = id => `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`;

function emoteSrc(code) {
  const own = DB.emoteByCode(code);
  if (own) return own.src;
  if (Object.prototype.hasOwnProperty.call(TWITCH_EMOTES, code)) return twitchEmoteURL(TWITCH_EMOTES[code]);
  return null;
}

/* ---------- Bits ---------- */
const BITS_TIERS = [
  { min: 10000, color: '#f43021' },
  { min: 5000, color: '#0099fe' },
  { min: 1000, color: '#1db2a5' },
  { min: 100, color: '#9c3ee8' },
  { min: 1, color: '#979797' }
];
const bitsTier = n => BITS_TIERS.find(t => n >= t.min) || BITS_TIERS[4];
function bitsHTML(n) {
  const t = bitsTier(n);
  const fallback = `this.outerHTML='<svg class=&quot;cheer-gem&quot; viewBox=&quot;0 0 20 20&quot;><path fill=&quot;${t.color}&quot; d=&quot;M10 2l7 7-7 9-7-9z&quot;/></svg>'`;
  return `<span class="cheer"><img class="cheer-img" alt="cheer${n}" src="https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/animated/${t.min}/2.gif" onerror="${fallback}"><span class="cheer-amt" style="color:${t.color}">${n}</span></span> `;
}

/* ---------- Colores de nombre: Twitch aclara los colores oscuros en modo oscuro ---------- */
function readableColor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#a970ff';
  const n = parseInt(m[1], 16);
  let r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const lin = c => c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
  const L = .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b);
  if (L >= .13) return '#' + m[1];
  // a HSL, subir luminosidad
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > .5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  l = Math.max(l, .66);
  const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0');
  return '#' + toHex(f(h + 1 / 3)) + toHex(f(h)) + toHex(f(h - 1 / 3));
}

/* ---------- Iconos (SVG propios, estilo Twitch) ---------- */
const ICONS = {
  collapse: '<svg viewBox="0 0 20 20" width="20" height="20"><path fill="currentColor" d="M4 16V4H2v12h2zM13 15l-5-5 5-5 1.5 1.5L11 10l3.5 3.5L13 15z"/><path fill="currentColor" d="M8 9h10v2H8z"/></svg>',
  users: '<svg viewBox="0 0 20 20" width="20" height="20"><path fill="currentColor" fill-rule="evenodd" d="M7 2a4 4 0 100 8 4 4 0 000-8zM5 6a2 2 0 114 0 2 2 0 01-4 0zm8.5 1.2a3 3 0 11.01 0zM1 16.5C1 13.46 3.69 11 7 11s6 2.46 6 5.5V18H1v-1.5zm2.1-.5h7.8c-.33-1.7-1.95-3-3.9-3s-3.57 1.3-3.9 3zM14 18h5v-1.5c0-2.2-1.6-4.04-3.8-4.68.5.66.8 1.47.8 2.36V18z"/></svg>',
  smile: '<svg viewBox="0 0 20 20" width="20" height="20"><path fill="currentColor" d="M7 11a1 1 0 100-2 1 1 0 000 2zM14 10a1 1 0 11-2 0 1 1 0 012 0zM10 14a2 2 0 002-2H8a2 2 0 002 2z"/><path fill="currentColor" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"/></svg>',
  gear: '<svg viewBox="0 0 20 20" width="20" height="20"><path fill="currentColor" d="M10 8a2 2 0 100 4 2 2 0 000-4z"/><path fill="currentColor" fill-rule="evenodd" d="M9 2h2a2.01 2.01 0 001.93 1.47 2 2 0 001.4-.6l1.4 1.4a2 2 0 001.4 3.4A2 2 0 0018 9v2a2 2 0 00-1.47 1.93 2 2 0 00.6 1.4l-1.4 1.4a2 2 0 00-3.4 1.4A2 2 0 0011 18H9a2 2 0 00-1.93-1.47 2 2 0 00-1.4.6l-1.4-1.4a2 2 0 00-1.4-3.4A2 2 0 002 11V9a2 2 0 001.47-1.93 2 2 0 00-.6-1.4l1.4-1.4a2 2 0 003.4-1.4A2 2 0 009 2zm1 12a4 4 0 100-8 4 4 0 000 8z"/></svg>',
  points: '<svg viewBox="0 0 20 20" width="20" height="20"><path fill="currentColor" d="M10 6a4 4 0 014 4h-2a2 2 0 00-2-2V6z"/><path fill="currentColor" fill-rule="evenodd" d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm2 0a6 6 0 1112 0 6 6 0 01-12 0z"/></svg>',
  reply: '<svg viewBox="0 0 20 20" width="16" height="16"><path fill="currentColor" d="M8.5 5.5L7.09 4.09 1.18 10l5.91 5.91L8.5 14.5 5 11h7a4 4 0 014 4v1h2v-1a6 6 0 00-6-6H5l3.5-3.5z"/></svg>',
  pin: '<svg viewBox="0 0 20 20" width="16" height="16"><path fill="currentColor" d="M13 2l5 5-1.4 1.4-1-1L12.4 10.6l.3 3.7-1.4 1.4-3.2-3.2L4.4 16.2 3 14.8l3.7-3.7-3.2-3.2 1.4-1.4 3.7.3L11.8 3.6l-1-1L12.2 1.2z"/></svg>',
  star: '<svg viewBox="0 0 20 20" width="20" height="20"><path fill="currentColor" d="M11.456 8.255L10 5.125l-1.456 3.13-3.49.485 2.552 2.516-.616 3.485L10 13.064l3.01 1.677-.616-3.485 2.553-2.516-3.491-.485zM7.19 6.424l-4.2.583c-.932.13-1.318 1.209-.664 1.853l3.128 3.083-.755 4.272c-.163.92.876 1.603 1.722 1.132L10 15.354l3.579 1.993c.846.47 1.885-.212 1.722-1.132l-.755-4.272 3.128-3.083c.654-.644.268-1.723-.664-1.853l-4.2-.583-1.754-3.77c-.406-.872-1.706-.872-2.112 0L7.19 6.424z"/></svg>',
  crown: '<svg viewBox="0 0 20 20" width="20" height="20"><path fill="currentColor" d="M18 5v8a2 2 0 01-2 2H4a2.002 2.002 0 01-2-2V5l4 3 4-4 4 4 4-3z"/></svg>',
  gift: '<svg viewBox="0 0 20 20" width="20" height="20"><path fill="currentColor" fill-rule="evenodd" d="M16 6h2v6h-1v6H3v-6H2V6h2V4.793c0-2.507 3.03-3.762 4.803-1.99.131.131.249.275.352.429L10 4.5l.845-1.268a2.81 2.81 0 01.352-.429C12.969 1.031 16 2.286 16 4.793V6zM6 4.793V6h2.596L7.49 4.341A.814.814 0 006 4.793zm8 0V6h-2.596l1.106-1.659a.814.814 0 011.49.451zM16 8v2h-5V8h5zm-1 8v-4h-4v4h4zM9 8v2H4V8h5zm0 4H5v4h4v-4z"/></svg>',
  raid: '<svg viewBox="0 0 20 20" width="20" height="20"><path fill="currentColor" fill-rule="evenodd" d="M4 2h4v2H6v12h2v2H4V2zm12 0h-4v2h2v12h-2v2h4V2zm-6.5 4.5L13 10l-3.5 3.5L8 12l1-1H6V9h3L8 8l1.5-1.5z"/></svg>',
  megaphone: '<svg viewBox="0 0 20 20" width="20" height="20"><path fill="currentColor" fill-rule="evenodd" d="M15 3l-9 3H3a1 1 0 00-1 1v5a1 1 0 001 1h1l1 5h2l-1-5 9 3h2V3h-2zm-1 2.4L7 7.7v3.6l7 2.3V5.4zM4 8h1v3H4V8z"/></svg>',
  sparkle: '<svg viewBox="0 0 20 20" width="16" height="16"><path fill="currentColor" d="M10 1l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5zM16 13l1 2.5 2.5 1-2.5 1L16 20l-1-2.5-2.5-1 2.5-1L16 13z"/></svg>',
  trash: '<svg viewBox="0 0 20 20" width="16" height="16"><path fill="currentColor" d="M12 2H8v1H3v2h14V3h-5V2zM4 7v9a2 2 0 002 2h8a2 2 0 002-2V7h-2v9H6V7H4z"/><path fill="currentColor" d="M11 7H9v7h2V7z"/></svg>',
  edit: '<svg viewBox="0 0 20 20" width="16" height="16"><path fill="currentColor" d="M14.6 2.6l2.8 2.8-10 10H4.6v-2.8l10-10zM3 17h14v2H3z"/></svg>'
};

/* ---------- Insignias ---------- */
const BUILTIN_BADGES = {
  broadcaster: { src: 'img/badges/broadcaster.png', title: 'Streamer' },
  mod: { src: 'img/badges/mod.png', title: 'Moderador' },
  vip: { src: 'img/badges/vip.png', title: 'VIP' },
  verified: { src: 'img/badges/verified.png', title: 'Verificado' }
};

function badgesFor(ch, user) {
  if (!user) return [];
  const out = [];
  if (ch.ownerId === user.id) out.push(BUILTIN_BADGES.broadcaster);
  else if (ch.mods.includes(user.id)) out.push(BUILTIN_BADGES.mod);
  if (ch.vips.includes(user.id) && ch.ownerId !== user.id) out.push(BUILTIN_BADGES.vip);
  if (user.verified) out.push(BUILTIN_BADGES.verified);
  const subId = ch.subs[user.id];
  if (subId) {
    const b = ch.subBadges.find(x => x.id === subId);
    if (b) out.push({ src: b.src, title: b.name || 'Suscriptor' });
  }
  return out;
}
const badgesHTML = (ch, user) => badgesFor(ch, user)
  .map(b => `<img class="tw-badge" src="${esc(b.src)}" alt="${esc(b.title)}" title="${esc(b.title)}">`).join('');

/* ---------- Texto del mensaje: emotes, menciones, enlaces ---------- */
function renderText(text, ch) {
  const pov = ch && ch.settings.povUserId ? DB.user(ch.settings.povUserId) : null;
  return String(text || '').split(/(\s+)/).map(tok => {
    if (!tok) return '';
    if (/^\s+$/.test(tok)) return ' ';
    const src = emoteSrc(tok);
    if (src) return `<img class="tw-emote"${src.startsWith('https://static-cdn') ? ' crossorigin="anonymous"' : ''} src="${esc(src)}" alt="${esc(tok)}" title="${esc(tok)}" onerror="this.replaceWith(document.createTextNode(this.alt))">`;
    const mm = /^@([\wÀ-￿]+)(.*)$/.exec(tok);
    if (mm) {
      const isMe = pov && mm[1].toLowerCase() === pov.name.toLowerCase();
      return `<span class="tw-mention${isMe ? ' me' : ''}">@${esc(mm[1])}</span>${esc(mm[2])}`;
    }
    if (/^https?:\/\/\S+$/.test(tok)) return `<a class="tw-link" href="${esc(tok)}" target="_blank" rel="noopener">${esc(tok)}</a>`;
    return esc(tok);
  }).join('');
}

function mentionsPov(text, ch) {
  const pov = ch.settings.povUserId ? DB.user(ch.settings.povUserId) : null;
  if (!pov) return false;
  return new RegExp('(^|\\s)@' + pov.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\b|$)', 'i').test(text || '');
}

/* ---------- Usuario de un mensaje (usa el actual; si se borró, la copia guardada) ---------- */
function msgUser(m, key = 'userId', snap = 'snap') {
  const u = DB.user(m[key]);
  if (u) return u;
  if (m[snap]) return { id: null, name: m[snap].name, color: m[snap].color, verified: false };
  return { id: null, name: 'usuario', color: '#a970ff' };
}
const nameHTML = u => `<span class="tw-name" style="color:${readableColor(u.color)}">${esc(u.name)}</span>`;
const tsHTML = (ch, m) => ch.settings.showTs && m.time ? `<span class="tw-ts">${esc(m.time)}</span>` : '';

/** Línea de chat "normal" (sin acciones ni contenedor) */
function lineBody(ch, m, opts = {}) {
  const u = msgUser(m);
  let text = m.text || '';
  let isAction = false;
  if (text.startsWith('/me ')) { isAction = true; text = text.slice(4); }
  const color = readableColor(u.color);
  const content = m.deleted
    ? `<span class="tw-deleted">&lt;mensaje eliminado&gt;</span>`
    : (m.bits ? bitsHTML(m.bits) : '') + renderText(text, ch);
  return `${opts.noTs ? '' : tsHTML(ch, m)}<span class="tw-badges">${badgesHTML(ch, u)}</span>${nameHTML(u)}` +
    (isAction ? ` <span class="tw-text action" style="color:${color}">${content}</span>`
              : `<span class="tw-colon">: </span><span class="tw-text">${content}</span>`);
}

/* ---------- Un elemento del chat (mensaje o aviso) ---------- */
function renderItem(ch, m) {
  const actions = `<div class="tw-actions">
      ${m.type === 'msg' ? `<button data-act="reply" title="Responder">${ICONS.reply}</button><button data-act="pin" title="Fijar">${ICONS.pin}</button><button data-act="edit" title="Editar">${ICONS.edit}</button>` : ''}
      <button data-act="del" title="Borrar">${ICONS.trash}</button></div>`;
  const ownerName = (DB.user(ch.ownerId) || { name: 'canal' }).name;

  switch (m.type) {
    case 'msg': {
      const cls = ['tw-line'];
      if (m.highlight) cls.push('highlighted');
      if (m.first) cls.push('first');
      if (!m.deleted && mentionsPov(m.text, ch)) cls.push('mentioned');
      let head = '';
      if (m.first) head += `<div class="tw-first-head">${ICONS.sparkle}<span>Primer mensaje</span></div>`;
      if (m.replyTo) {
        const ru = msgUser(m.replyTo, 'userId', 'snap');
        head += `<div class="tw-reply-head">${ICONS.reply}<span>Respondiendo a @${esc(ru.name)}: ${esc(m.replyTo.text || '')}</span></div>`;
      }
      return `<div class="${cls.join(' ')}" data-mid="${m.id}">${head}<div class="tw-msg">${lineBody(ch, m)}</div>${actions}</div>`;
    }
    case 'sub': {
      const u = msgUser(m);
      let txt;
      if (m.tier === 'prime') txt = `<b>${esc(u.name)}</b> se ha suscrito con Prime.`;
      else txt = `<b>${esc(u.name)}</b> se ha suscrito con el nivel ${esc(m.tier || 1)}.`;
      if (m.months > 1) txt += ` ¡Lleva suscrito/a <b>${m.months} meses</b>${m.streak > 1 ? `, ${m.streak} seguidos` : ''}!`;
      const icon = m.tier === 'prime' ? ICONS.crown : ICONS.star;
      const msgLine = m.text ? `<div class="tw-msg">${lineBody(ch, { ...m, type: 'msg' }, { noTs: true })}</div>` : '';
      return `<div class="tw-notice" data-mid="${m.id}"><div class="tw-notice-head">${tsHTML(ch, m)}<span class="tw-notice-ico">${icon}</span><span>${txt}</span></div>${msgLine}${actions}</div>`;
    }
    case 'gift': {
      const g = m.anon ? null : msgUser(m);
      const gname = g ? `<b>${esc(g.name)}</b>` : '<b>Un regalador anónimo</b>';
      const r = msgUser(m, 'toId', 'toSnap');
      return `<div class="tw-notice" data-mid="${m.id}"><div class="tw-notice-head">${tsHTML(ch, m)}<span class="tw-notice-ico">${ICONS.gift}</span><span>${gname} ha regalado una suscripción de nivel ${esc(m.tier || 1)} a <b>${esc(r.name)}</b>.${m.total > 1 ? ` ¡Ha regalado un total de ${m.total} meses en el canal!` : ''}</span></div>${actions}</div>`;
    }
    case 'giftbomb': {
      const g = m.anon ? null : msgUser(m);
      const gname = g ? `<b>${esc(g.name)}</b>` : '<b>Un regalador anónimo</b>';
      const n = m.count;
      return `<div class="tw-notice" data-mid="${m.id}"><div class="tw-notice-head">${tsHTML(ch, m)}<span class="tw-notice-ico">${ICONS.gift}</span><span>${gname} está regalando ${n} ${n === 1 ? 'suscripción' : 'suscripciones'} de nivel ${esc(m.tier || 1)} a la comunidad de ${esc(ownerName)}.${m.total > n ? ` ¡Ha regalado un total de ${m.total} en el canal!` : ''}</span></div>${actions}</div>`;
    }
    case 'raid':
      return `<div class="tw-notice raid" data-mid="${m.id}"><div class="tw-notice-head">${tsHTML(ch, m)}<span class="tw-notice-ico">${ICONS.raid}</span><span><b>${esc(m.viewers)}</b> espectadores de <b>${esc(m.raider)}</b> se han unido mediante una raid.</span></div>${actions}</div>`;
    case 'announce':
      return `<div class="tw-announce c-${esc(m.color || 'primary')}" data-mid="${m.id}"><div class="tw-announce-head">${ICONS.megaphone}<span>Anuncio</span></div><div class="tw-msg">${lineBody(ch, { ...m, type: 'msg' })}</div>${actions}</div>`;
    case 'system':
    default:
      return `<div class="tw-system" data-mid="${m.id}">${tsHTML(ch, m)}${renderText(m.text, null)}${actions}</div>`;
  }
}

/* ---------- Panel completo ---------- */
function chatPanelHTML() {
  return `
  <div class="tw-chat" id="twChat">
    <div class="tw-head">
      <button class="tw-icon-btn" tabindex="-1">${ICONS.collapse}</button>
      <h4>Chat del stream</h4>
      <button class="tw-icon-btn" tabindex="-1">${ICONS.users}</button>
    </div>
    <div class="tw-pinned" id="twPinned" hidden></div>
    <div class="tw-scroll" id="twScroll"><div class="tw-list" id="twList"></div></div>
    <div class="tw-foot">
      <div class="tw-mode" id="twMode" hidden></div>
      <div class="tw-input"><span class="tw-placeholder">Enviar un mensaje</span><span class="tw-input-emote">${ICONS.smile}</span></div>
      <div class="tw-foot-row">
        <div class="tw-points">${ICONS.points}<span id="twPoints"></span></div>
        <div class="tw-foot-right">
          <button class="tw-icon-btn" tabindex="-1">${ICONS.gear}</button>
          <button class="tw-chat-btn" tabindex="-1">Chat</button>
        </div>
      </div>
    </div>
  </div>`;
}

function renderPinned(ch) {
  const el = document.getElementById('twPinned');
  if (!el) return;
  const p = ch.pinned;
  if (!p) { el.hidden = true; el.innerHTML = ''; return; }
  const by = DB.user(p.byId) || DB.user(ch.ownerId) || { name: '' };
  el.hidden = false;
  el.innerHTML = `
    <div class="tw-pinned-card">
      <div class="tw-pinned-top">${ICONS.pin}<span>Fijado por <b>${esc(by.name)}</b></span></div>
      <div class="tw-msg">${lineBody(ch, { ...p, type: 'msg' }, { noTs: true })}</div>
    </div>`;
}

function renderChat(ch, { keepScroll = false } = {}) {
  const list = document.getElementById('twList');
  const scroll = document.getElementById('twScroll');
  if (!list) return;
  const atBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 40;
  list.innerHTML = `<div class="tw-system welcome">¡Te damos la bienvenida al chat!</div>` +
    ch.messages.map(m => renderItem(ch, m)).join('');
  renderPinned(ch);
  const chatEl = document.getElementById('twChat');
  chatEl.style.width = ch.settings.width + 'px';
  chatEl.style.height = ch.settings.height + 'px';
  const mode = document.getElementById('twMode');
  mode.hidden = !ch.settings.chatMode;
  mode.textContent = ch.settings.chatMode || '';
  document.getElementById('twPoints').textContent = ch.settings.points || '';
  if (!keepScroll || atBottom) { scroll.scrollTop = scroll.scrollHeight; stickToBottom = true; }
  watchScroll(scroll, list);
}

/* Mantener el chat abajo aunque las imágenes (emotes) tarden en cargar */
let stickToBottom = true;
function watchScroll(scroll, list) {
  if (scroll._watched) return;
  scroll._watched = true;
  scroll.addEventListener('scroll', () => {
    stickToBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 40;
  });
  new ResizeObserver(() => { if (stickToBottom) scroll.scrollTop = scroll.scrollHeight; }).observe(list);
  new ResizeObserver(() => { if (stickToBottom) scroll.scrollTop = scroll.scrollHeight; }).observe(scroll);
}

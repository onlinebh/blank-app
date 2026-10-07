/* Interactive bilingual mind map (vanilla SVG, collapsible tree, pan / zoom / search) */
(function () {
'use strict';
const A = window.App, B = window.BOOK;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const svg = $('#mapSvg'), box = $('#mapBox'), info = $('#mapInfo');
const NS = 'http://www.w3.org/2000/svg';
const GAP_X = 56, GAP_Y = 10, LINE_H = 18, PAD_X = 14, PAD_Y = 8;
let root = null, built = false, depthLimit = 1, impOnly = false, query = '', selected = null, view = { x: 40, y: 40, k: 1 };
let vp = null, nodes = [];

const isAr = () => A.S.lang === 'ar';
const label = n => isAr() ? (n.ar || n.en) : (n.en || n.ar);
const note = n => isAr() ? (n.na || n.ne) : (n.ne || n.na);
const cv = document.createElement('canvas').getContext('2d');
function textW(s, ar) { cv.font = ar ? '15px Amiri, "Noto Naskh Arabic", serif' : '13px Inter, system-ui, sans-serif'; return cv.measureText(s).width; }
function wrap(s, ar) {
  const max = ar ? 190 : 200, words = String(s).replace(/\s+/g, ' ').trim().split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && textW(t, ar) > max) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  if (lines.length > 3) { lines.length = 3; lines[2] = lines[2].replace(/\s*\S*$/, '') + '…'; }
  return lines;
}

function build() {
  root = JSON.parse(JSON.stringify(B.map));
  let uid = 0;
  (function walk(n, d, p, hue) {
    n._id = ++uid; n._d = d; n._p = p; n._h = hue;
    (n.k || []).forEach((k, i) => walk(k, d + 1, n, d === 0 ? Math.round((i * 360 / Math.max(1, n.k.length) + 18) % 360) : hue));
  })(root, 0, null, 30);
  applyDepth(depthLimit);
  built = true;
}
function allNodes(n, out) { out = out || []; out.push(n); (n.k || []).forEach(k => allNodes(k, out)); return out; }
function applyDepth(d) { depthLimit = d; allNodes(root).forEach(n => { n._col = n.k ? n._d >= d : false; }); }
const kids = n => (n._col || !n.k) ? [] : (impOnly ? n.k.filter(k => (k.imp || 1) >= 2 || k._hit) : n.k);

/* ---- layout ---- */
function layout() {
  nodes = [];
  const ar = isAr();
  (function measure(n) {
    n._lines = wrap(label(n), ar);
    n._w = Math.max(...n._lines.map(l => textW(l, ar))) + PAD_X * 2 + (n.k ? 14 : 0);
    n._hgt = n._lines.length * LINE_H + PAD_Y * 2;
    nodes.push(n); kids(n).forEach(measure);
  })(root);
  const colW = []; nodes.forEach(n => colW[n._d] = Math.max(colW[n._d] || 0, n._w));
  const xs = [0]; for (let i = 1; i < colW.length; i++) xs[i] = xs[i - 1] + (colW[i - 1] || 0) + GAP_X;
  let cursor = 0;
  (function place(n) {
    const ks = kids(n);
    if (!ks.length) { n._y = cursor + n._hgt / 2; cursor += n._hgt + GAP_Y; }
    else { ks.forEach(place); n._y = (ks[0]._y + ks[ks.length - 1]._y) / 2; }
    n._x = ar ? -(xs[n._d] + n._w) : xs[n._d];
  })(root);
}

/* ---- draw ---- */
const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };
function colors(n) {
  const dk = A.isDark(), h = n._h, i = n.imp || 1;
  if (n._d === 0) return { fill: 'var(--accent)', stroke: 'var(--accent)', text: 'var(--bg)' };
  if (i >= 3) return { fill: `hsl(${h},${dk ? 42 : 52}%,${dk ? 60 : 36}%)`, stroke: `hsl(${h},55%,${dk ? 72 : 26}%)`, text: dk ? '#101010' : '#fff' };
  if (i === 2) return { fill: `hsl(${h},${dk ? 30 : 55}%,${dk ? 24 : 89}%)`, stroke: `hsl(${h},45%,${dk ? 55 : 52}%)`, text: 'var(--fg)' };
  return { fill: 'var(--card)', stroke: `hsl(${h},25%,${dk ? 42 : 68}%)`, text: 'var(--fg)' };
}
function draw() {
  svg.innerHTML = ''; vp = el('g', {}, svg);
  const links = el('g', {}, vp), nds = el('g', {}, vp), ar = isAr();
  const q = query.trim().toLowerCase();
  nodes.forEach(n => {
    kids(n).forEach(k => {
      const x1 = ar ? n._x : n._x + n._w, x2 = ar ? k._x + k._w : k._x, mx = (x1 + x2) / 2;
      const c = colors(k);
      el('path', { class: 'ml', d: `M${x1},${n._y} C${mx},${n._y} ${mx},${k._y} ${x2},${k._y}`, stroke: n._d === 0 ? c.stroke : `hsl(${k._h},40%,${A.isDark() ? 55 : 55}%)`, 'stroke-width': (k.imp || 1) >= 3 ? 3 : 2 }, links);
    });
    const c = colors(n), g = el('g', { class: `mn i${n.imp || 1}` + (n === selected ? ' sel' : '') + (n._hit ? ' hit' : ''), transform: `translate(${n._x},${n._y - n._hgt / 2})` }, nds);
    g._n = n;
    el('rect', { width: n._w, height: n._hgt, rx: 11, fill: c.fill, stroke: c.stroke }, g);
    const t = el('text', { direction: ar ? 'rtl' : 'ltr', 'text-anchor': ar ? 'end' : 'start', x: ar ? n._w - PAD_X - (n.k ? 14 : 0) + (n.k ? 0 : 0) : PAD_X, y: PAD_Y + 13 }, g);
    t.style.fill = c.text;
    n._lines.forEach((l, i) => { const s = el('tspan', { x: t.getAttribute('x'), dy: i ? LINE_H : 0 }, t); s.textContent = l; });
    if (n._d && (n.imp || 1) >= 3) { const st = el('text', { x: ar ? 6 : n._w - 16, y: 14, class: 'tog' }, g); st.style.fill = c.text; st.textContent = '★'; }
    if (n.k) {
      const cx = ar ? 11 : n._w - 11, cy = n._hgt / 2;
      el('circle', { cx, cy, r: 8, fill: 'var(--bg)', stroke: c.stroke, 'stroke-width': 1.3 }, g);
      const tt = el('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', class: 'tog' }, g); tt.textContent = n._col ? n.k.length : '−';
      tt.style.fontSize = '10px';
    }
  });
  applyView();
}
function applyView() { vp && vp.setAttribute('transform', `translate(${view.x},${view.y}) scale(${view.k})`); }
function bbox() {
  let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
  nodes.forEach(n => { x1 = Math.min(x1, n._x); x2 = Math.max(x2, n._x + n._w); y1 = Math.min(y1, n._y - n._hgt / 2); y2 = Math.max(y2, n._y + n._hgt / 2); });
  return { x1, y1, x2, y2 };
}
function fit() {
  const b = bbox(), W = box.clientWidth, H = box.clientHeight, pad = 30;
  const kf = Math.min((W - pad * 2) / (b.x2 - b.x1), (H - pad * 2) / (b.y2 - b.y1));
  const k = Math.max(.55, Math.min(1.1, kf));
  view.k = k; view.x = (W - (b.x2 - b.x1) * k) / 2 - b.x1 * k;
  // tall maps: keep text readable and centre on the root instead of shrinking to dust
  view.y = (b.y2 - b.y1) * k <= H - pad * 2 ? (H - (b.y2 - b.y1) * k) / 2 - b.y1 * k : H / 2 - root._y * k;
  applyView();
}
function relayout(keepView) { if (!built) return; layout(); draw(); if (!keepView) fit(); updateLv(); }
function centerOn(n, k) {
  const W = box.clientWidth, H = box.clientHeight; view.k = k || Math.max(view.k, .9);
  view.x = W / 2 - (n._x + n._w / 2) * view.k; view.y = H / 2 - n._y * view.k; applyView();
}
function updateLv() { $$('#mapTools .lv').forEach(b => b.classList.toggle('on', +b.dataset.d === depthLimit)); }

/* ---- info panel ---- */
function showInfo(n) {
  selected = n; $$('.mn', svg).forEach(g => g.classList.toggle('sel', g._n === n));
  if (!n || n._d === 0) { info.hidden = true; return; }
  const imp = n.imp || 1, tag = imp >= 3 ? A.t('nodeCore') : imp === 2 ? A.t('nodeImp') : A.t('nodeDet');
  const path = []; for (let p = n._p; p && p._d > 0; p = p._p) path.unshift(label(p));
  info.dir = isAr() ? 'rtl' : 'ltr';
  const go = n.c ? `<a class="go" href="#/read/${n.c}${n.b ? '/' + n.b : ''}">${A.t('read2')} ${isAr() ? '←' : '→'}</a>` : '';
  info.innerHTML = `<button class="x" aria-label="Close">✕</button><span class="tag">${tag}</span>` +
    (path.length ? `<div style="font-size:12px;color:var(--muted)">${path.slice(-3).join(' › ')}</div>` : '') +
    `<h3>${label(n)}</h3>` + (note(n) ? `<p>${note(n)}</p>` : '') +
    (n.k ? `<p style="color:var(--muted);font-size:12px">${n.k.length} ${A.t('hits') === 'نتيجة' ? 'عناصر فرعية' : 'sub-ideas'}</p>` : '') + go;
  info.hidden = false; $('.x', info).onclick = () => { info.hidden = true; selected = null; $$('.mn.sel', svg).forEach(g => g.classList.remove('sel')); };
}

/* ---- interactions ---- */
let drag = null, pts = new Map(), pinch = null;
box.addEventListener('pointerdown', e => {
  try { box.setPointerCapture(e.pointerId); } catch (_) {} pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: view.k }; drag = null; }
  else drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false, target: e.target };
});
box.addEventListener('pointermove', e => {
  if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pts.size === 2) {
    const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), r = box.getBoundingClientRect();
    zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, pinch.k * d / pinch.d, true); return;
  }
  if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 5) { drag.moved = true; box.classList.add('drag'); }
  if (drag.moved) { view.x = drag.vx + dx; view.y = drag.vy + dy; applyView(); }
});
const end = e => {
  pts.delete(e.pointerId); if (pts.size < 2) pinch = null; box.classList.remove('drag');
  if (drag && !drag.moved && e.type === 'pointerup') { const g = drag.target.closest && drag.target.closest('.mn'); if (g) clickNode(g._n); }
  if (!pts.size) drag = null;
};
box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
function zoomAt(px, py, k, abs) {
  k = Math.max(.12, Math.min(2.6, abs ? k : view.k * k)); const f = k / view.k;
  view.x = px - (px - view.x) * f; view.y = py - (py - view.y) * f; view.k = k; applyView();
}
box.addEventListener('wheel', e => {
  e.preventDefault(); const r = box.getBoundingClientRect();
  if (e.ctrlKey || Math.abs(e.deltaY) > 0 && !e.shiftKey && Math.abs(e.deltaX) < 2) zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0016)));
  else { view.x -= e.deltaX; view.y -= e.deltaY; applyView(); }
}, { passive: false });
function clickNode(n) {
  showInfo(n);
  if (n.k) { n._col = !n._col; const before = { x: n._x, y: n._y }; layout(); // keep clicked node where it is on screen
    view.x += (before.x - n._x) * view.k; view.y += (before.y - n._y) * view.k; draw(); }
}
$('#mZoomIn').onclick = () => zoomAt(box.clientWidth / 2, box.clientHeight / 2, 1.25);
$('#mZoomOut').onclick = () => zoomAt(box.clientWidth / 2, box.clientHeight / 2, .8);
$('#mFit').onclick = fit;
$$('#mapTools .lv').forEach(b => b.onclick = () => { applyDepth(+b.dataset.d); layout(); draw(); fit(); updateLv(); });
$('#mImp').onchange = e => { impOnly = e.target.checked; relayout(); };
let st;
$('#mSearch').addEventListener('input', e => {
  clearTimeout(st); st = setTimeout(() => {
    query = e.target.value.trim().toLowerCase(); const hits = [];
    allNodes(root).forEach(n => { n._hit = !!query && ((n.en + ' ' + n.ar + ' ' + (n.ne || '') + ' ' + (n.na || '')).toLowerCase().includes(query)); if (n._hit) hits.push(n); });
    hits.forEach(n => { for (let p = n._p; p; p = p._p) p._col = false; });
    layout(); draw();
    if (hits.length) { centerOn(hits[0], .9); } else if (!query) fit();
  }, 220);
});
window.addEventListener('resize', () => { if (document.body.dataset.view === 'map') applyView(); });
window.addEventListener('b123theme', () => { if (built) draw(); });

/* ---- public ---- */
window.MM = {
  show() { if (!built) build(); layout(); draw(); fit(); updateLv(); },
  relayout() { relayout(); },
  focusChapter(id) {
    if (!built) build();
    const n = allNodes(root).find(x => x.c === id && x._d === 2) || allNodes(root).find(x => x.c === id);
    if (!n) return; for (let p = n._p; p; p = p._p) p._col = false; layout(); draw(); centerOn(n, .9); showInfo(n);
  }
};
if (document.body.dataset.view === 'map') { window.MM.show(); const h = location.hash.split('/')[2]; if (h) window.MM.focusChapter(h); }
})();

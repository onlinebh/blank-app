/* Everything Is a 1-2-3 — bilingual calm reader */
(function () {
'use strict';
const B = window.BOOK;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const CH = {}; const CHD = {}; const waiting = {};
const chapById = {}; B.chapters.forEach(c => chapById[c.id] = c);
const partById = {}; B.parts.forEach(p => partById[p.id] = p);
const order = B.chapters.map(c => c.id);
const totalWords = B.chapters.reduce((a, c) => a + c.words, 0);

/* ---------- storage ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('b123.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('b123.' + k, JSON.stringify(v)); } catch (e) {} }
};
const DEF = { theme: 'paper', fEn: 'lora', fAr: 'amiri', size: 21, lh: 1.85, w: 720, just: false, warm: 0, dim: 0,
  hl: 'on', snd: 'off', vol: 30, focus: false, terms: true, custom: null,
  lang: (navigator.language || '').toLowerCase().startsWith('ar') ? 'ar' : 'en' };
const S = Object.assign({}, DEF, store.get('settings', {}));
const saveS = () => store.set('settings', S);

/* ---------- UI strings ---------- */
const T = {
  en: { read: 'Read', map: 'Mind map', fit: 'Fit', levels: 'Levels', all: 'All', onlyImp: 'Important only', core: 'Core idea', important: 'Important', detail: 'Detail',
    mapSearch: 'Find in map…', appearance: 'Appearance', theme: 'Calm colours', custom: 'Make your own', cBg: 'Background', cFg: 'Text', cAc: 'Accent', cHl: 'Highlight', reset: 'Reset',
    type: 'Typography', fontEn: 'English font', fontAr: 'Arabic font', size: 'Text size', lh: 'Line spacing', width: 'Column width', justify: 'Justify text',
    eyes: 'Eye comfort', warm: 'Warm light filter', dim: 'Dim brightness', hl: 'Highlights', hlOn: 'Show', hlOnly: 'Skim only', hlOff: 'Hide',
    sound: 'Calm sound', sOff: 'Off', sRain: 'Rain', sOcean: 'Ocean', sWind: 'Wind', vol: 'Volume', more: 'More', focus: 'Focus mode (hide bars)',
    terms: 'Mark English terms in Arabic', print: 'Print / PDF', full: 'Full screen', keys: 'Keys: ← → chapters · T contents · A appearance · M mind map',
    search: 'Search the book…', prev: 'Previous', next: 'Next', min: 'min', left: 'left', noRes: 'No results', untr: 'Not translated yet', read2: 'Read this passage', hits: 'results',
    nodeCore: 'Core idea', nodeImp: 'Important', nodeDet: 'Detail', words: 'words', part: 'Part', start: 'Start' },
  ar: { read: 'القراءة', map: 'الخريطة الذهنية', fit: 'ملاءمة', levels: 'المستويات', all: 'الكل', onlyImp: 'المهم فقط', core: 'فكرة محورية', important: 'مهم', detail: 'تفصيل',
    mapSearch: 'ابحث في الخريطة…', appearance: 'المظهر', theme: 'ألوان هادئة', custom: 'صمّم ألوانك', cBg: 'الخلفية', cFg: 'النص', cAc: 'اللون المميز', cHl: 'التظليل', reset: 'إعادة',
    type: 'الخطوط', fontEn: 'الخط الإنجليزي', fontAr: 'الخط العربي', size: 'حجم النص', lh: 'تباعد الأسطر', width: 'عرض العمود', justify: 'ضبط النص',
    eyes: 'راحة العين', warm: 'فلتر الضوء الدافئ', dim: 'خفض السطوع', hl: 'التظليل', hlOn: 'إظهار', hlOnly: 'تصفّح سريع', hlOff: 'إخفاء',
    sound: 'صوت هادئ', sOff: 'إيقاف', sRain: 'مطر', sOcean: 'بحر', sWind: 'رياح', vol: 'مستوى الصوت', more: 'المزيد', focus: 'وضع التركيز (إخفاء الأشرطة)',
    terms: 'تمييز المصطلحات الإنجليزية في العربية', print: 'طباعة / PDF', full: 'ملء الشاشة', keys: 'اختصارات: ← → الفصول · T الفهرس · A المظهر · M الخريطة',
    search: 'ابحث في الكتاب…', prev: 'السابق', next: 'التالي', min: 'د', left: 'متبقية', noRes: 'لا توجد نتائج', untr: 'لم تُترجم بعد', read2: 'اقرأ هذا المقطع', hits: 'نتيجة',
    nodeCore: 'فكرة محورية', nodeImp: 'مهم', nodeDet: 'تفصيل', words: 'كلمة', part: 'القسم', start: 'البداية' }
};
const uiLang = () => S.lang === 'ar' ? 'ar' : 'en';
const t = k => T[uiLang()][k] || T.en[k] || k;
const L = (o, k) => (uiLang() === 'ar' ? (o[k + 'a'] || o.ar) : (o[k + 'e'] || o.en));
const title = o => uiLang() === 'ar' ? (o.ar || o.en) : o.en;
function applyI18n() {
  $$('[data-i]').forEach(e => e.textContent = t(e.dataset.i));
  $$('[data-ip]').forEach(e => e.placeholder = t(e.dataset.ip));
  $('#q').placeholder = t('search');
}

/* ---------- appearance ---------- */
const THEMES = [
  ['auto', 'Auto', '#f7f3ea', '#17171a'], ['paper', 'Paper', '#f7f3ea', '#8a5a2b'], ['sepia', 'Sepia', '#f0e2c4', '#9a5b1f'],
  ['mint', 'Mint', '#e4f0e7', '#2f7d5b'], ['sky', 'Sky', '#e3edf7', '#2f6db0'], ['lavender', 'Lilac', '#ebe7f5', '#6a52b3'],
  ['rose', 'Rose', '#f6e5e6', '#b5495b'], ['peach', 'Peach', '#f9e8d8', '#c0622a'], ['dusk', 'Dusk', '#1f2733', '#7fb4e8'],
  ['night', 'Night', '#17171a', '#e0b36a'], ['forest', 'Forest', '#16211b', '#8bcf9b'], ['amoled', 'Black', '#000000', '#e0b36a']
];
const FONTS_EN = { lora: "'Lora',Georgia,serif", literata: "'Literata',Georgia,serif", inter: "'Inter',system-ui,sans-serif", georgia: "Georgia,'Times New Roman',serif" };
const FONTS_AR = { amiri: "'Amiri','Noto Naskh Arabic',serif", naskh: "'Noto Naskh Arabic','Amiri',serif", cairo: "'Cairo','Tajawal',sans-serif", tajawal: "'Tajawal','Cairo',sans-serif" };
const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
const lum = h => { const [r, g, b] = hex2rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
const mix = (a, b, p) => { const A = hex2rgb(a), B2 = hex2rgb(b); return '#' + A.map((v, i) => Math.round(v * (1 - p) + B2[i] * p).toString(16).padStart(2, '0')).join(''); };
let dark = false;
function applyTheme() {
  const root = document.documentElement; const st = root.style;
  ['--bg', '--fg', '--muted', '--card', '--accent', '--line', '--mark', '--key', '--keyline'].forEach(v => st.removeProperty(v));
  if (S.custom) {
    const c = S.custom; root.dataset.theme = 'custom'; dark = lum(c.bg) < .3;
    st.setProperty('--bg', c.bg); st.setProperty('--fg', c.fg); st.setProperty('--accent', c.ac);
    st.setProperty('--card', mix(c.bg, dark ? '#ffffff' : '#ffffff', dark ? .05 : .55));
    st.setProperty('--line', mix(c.bg, c.fg, .16)); st.setProperty('--muted', mix(c.fg, c.bg, .42));
    const [r, g, b] = hex2rgb(c.hl);
    st.setProperty('--mark', `rgba(${r},${g},${b},${dark ? .26 : .42})`); st.setProperty('--key', `rgba(${r},${g},${b},${dark ? .42 : .7})`); st.setProperty('--keyline', c.hl);
    root.style.colorScheme = dark ? 'dark' : 'light';
  } else {
    let th = S.theme;
    if (th === 'auto') th = matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'paper';
    root.dataset.theme = th; dark = ['dusk', 'night', 'forest', 'amoled'].includes(th);
    root.style.colorScheme = '';
  }
  const meta = $('meta[name=theme-color]') || Object.assign(document.head.appendChild(document.createElement('meta')), { name: 'theme-color' });
  meta.content = getComputedStyle(root).getPropertyValue('--bg').trim() || '#f7f3ea';
  window.dispatchEvent(new Event('b123theme'));
}
function applyVars() {
  const st = document.documentElement.style;
  st.setProperty('--fs', S.size + 'px'); st.setProperty('--lh', S.lh); st.setProperty('--measure', S.w + 'px');
  st.setProperty('--warm', S.warm); st.setProperty('--dim', S.dim);
  st.setProperty('--f-en', FONTS_EN[S.fEn]); st.setProperty('--f-ar', FONTS_AR[S.fAr]);
  $('#page').classList.toggle('justify', S.just);
  document.body.dataset.hl = S.hl;
  document.body.classList.toggle('terms', S.terms);
  document.body.classList.toggle('focus', S.focus);
}
function buildSettings() {
  const box = $('#themes');
  THEMES.forEach(([id, name, bg, ac]) => {
    const b = document.createElement('button'); b.className = 'sw'; b.dataset.t = id; b.title = name; b.style.background = bg;
    b.innerHTML = `<span style="color:${lum(bg) < .3 ? '#ddd' : '#333'}">${name}</span><i style="background:${ac}"></i>`;
    b.onclick = () => { S.theme = id; S.custom = null; saveS(); applyTheme(); syncSettings(); };
    box.appendChild(b);
  });
  const bind = (sel, key, num) => $(sel).addEventListener('input', e => { S[key] = num ? +e.target.value : e.target.value; saveS(); applyVars(); });
  bind('#fEn', 'fEn'); bind('#fAr', 'fAr'); bind('#rSize', 'size', 1); bind('#rLh', 'lh', 1); bind('#rW', 'w', 1); bind('#rWarm', 'warm', 1); bind('#rDim', 'dim', 1);
  $('#kJ').onchange = e => { S.just = e.target.checked; saveS(); applyVars(); };
  $('#kTerms').onchange = e => { S.terms = e.target.checked; saveS(); applyVars(); };
  $('#kFocus').onchange = e => { S.focus = e.target.checked; saveS(); applyVars(); };
  $$('#hlSeg button').forEach(b => b.onclick = () => { S.hl = b.dataset.h; saveS(); applyVars(); syncSettings(); });
  $$('#sndSeg button').forEach(b => b.onclick = () => { S.snd = b.dataset.s; saveS(); Snd.set(S.snd); syncSettings(); });
  $('#rVol').oninput = e => { S.vol = +e.target.value; saveS(); Snd.vol(); };
  const cust = () => { S.custom = { bg: $('#cBg').value, fg: $('#cFg').value, ac: $('#cAc').value, hl: $('#cHl').value }; saveS(); applyTheme(); syncSettings(true); };
  ['#cBg', '#cFg', '#cAc', '#cHl'].forEach(s => $(s).addEventListener('input', cust));
  $('#cReset').onclick = () => { S.custom = null; saveS(); applyTheme(); syncSettings(); };
  $('#bPrint').onclick = () => window.print();
  $('#bFull').onclick = () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); };
}
function syncSettings(skipColors) {
  $$('#themes .sw').forEach(b => b.classList.toggle('on', !S.custom && b.dataset.t === S.theme));
  $('#fEn').value = S.fEn; $('#fAr').value = S.fAr; $('#rSize').value = S.size; $('#rLh').value = S.lh; $('#rW').value = S.w;
  $('#rWarm').value = S.warm; $('#rDim').value = S.dim; $('#kJ').checked = S.just; $('#kTerms').checked = S.terms; $('#kFocus').checked = S.focus;
  $('#rVol').value = S.vol;
  $$('#hlSeg button').forEach(b => b.classList.toggle('on', b.dataset.h === S.hl));
  $$('#sndSeg button').forEach(b => b.classList.toggle('on', b.dataset.s === S.snd));
  if (!skipColors) {
    const cs = getComputedStyle(document.documentElement);
    const hx = v => { const m = cs.getPropertyValue(v).trim(); return /^#[0-9a-f]{6}$/i.test(m) ? m : null; };
    $('#cBg').value = S.custom ? S.custom.bg : (hx('--bg') || '#f7f3ea');
    $('#cFg').value = S.custom ? S.custom.fg : (hx('--fg') || '#2b2a27');
    $('#cAc').value = S.custom ? S.custom.ac : (hx('--accent') || '#8a5a2b');
    $('#cHl').value = S.custom ? S.custom.hl : (dark ? '#e9a23b' : '#ffd24f');
  }
}

/* ---------- calm sound (Web Audio, no files) ---------- */
const Snd = {
  ctx: null, src: null, g: null, lfo: null,
  buf(kind) {
    const c = this.ctx, n = c.sampleRate * 5, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); let last = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (kind === 'brown') { last = (last + .02 * w) / 1.02; d[i] = last * 3.4; } else d[i] = w * .6; }
    // cross-fade ends for a seamless loop
    const f = 2000; for (let i = 0; i < f; i++) { const a = i / f; d[i] = d[i] * a + d[n - f + i] * (1 - a); }
    return b;
  },
  stop() { try { this.src && this.src.stop(); this.lfo && this.lfo.stop(); } catch (e) {} this.src = this.lfo = null; },
  vol() { if (this.g) this.g.gain.setTargetAtTime(S.vol / 100 * .6, this.ctx.currentTime, .2); },
  set(kind) {
    this.stop(); if (kind === 'off') return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    if (!this.ctx) this.ctx = new AC(); const c = this.ctx; c.resume && c.resume();
    const s = c.createBufferSource(); s.loop = true; s.buffer = this.buf(kind === 'rain' ? 'white' : 'brown');
    const g = c.createGain(); g.gain.value = S.vol / 100 * .6; this.g = g;
    let node = s;
    if (kind === 'rain') {
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7500;
      s.connect(hp); hp.connect(lp); node = lp;
    } else if (kind === 'ocean') {
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650; s.connect(lp);
      const sw = c.createGain(); sw.gain.value = .55; lp.connect(sw); node = sw;
      const o = c.createOscillator(); o.frequency.value = .09; const og = c.createGain(); og.gain.value = .45; o.connect(og); og.connect(sw.gain); o.start(); this.lfo = o;
    } else {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 380; bp.Q.value = .8; s.connect(bp); node = bp;
      const o = c.createOscillator(); o.frequency.value = .12; const og = c.createGain(); og.gain.value = 220; o.connect(og); og.connect(bp.frequency); o.start(); this.lfo = o;
    }
    node.connect(g); g.connect(c.destination); s.start(); this.src = s;
  }
};

/* ---------- chapter loading ---------- */
window.__ch = (id, rows) => { CHD[id] = rows; (waiting[id] || []).forEach(f => f(rows)); delete waiting[id]; };
function loadCh(id) {
  if (CHD[id]) return Promise.resolve(CHD[id]);
  return new Promise((res, rej) => {
    (waiting[id] = waiting[id] || []).push(res);
    if (waiting[id].length > 1) return;
    const s = document.createElement('script'); s.src = `data/${id}.js`; s.onerror = () => rej(new Error('load ' + id)); document.head.appendChild(s);
  });
}

/* ---------- rendering ---------- */
function mk(tag, inner, cls) {
  const c = cls ? ` class="${cls}"` : '';
  if (tag === 'table') return `<div class="tw"><table>${inner}</table></div>`;
  if (tag === 'ul' || tag === 'ol') return `<${tag}${c}>${inner}</${tag}>`;
  return `<${tag}${c}>${inner}</${tag}>`;
}
function rowHtml(r, mode) {
  const hasMark = /<mark/.test(r.e) || (r.a && /<mark/.test(r.a));
  const head = /^h[12]$/.test(r.t);
  const cls = 'blk' + (hasMark || head ? ' hm' : '') + (r.cap ? ' cap' : '');
  if (r.i) return `<div class="blk hm" id="${r.id}"><figure>${r.e}</figure></div>`;
  const tag = r.cap ? 'p' : r.t, tc = r.cap ? 'cap' : '';
  if (mode === 'en') return `<div class="${cls}" id="${r.id}">${mk(tag, r.e, tc)}</div>`;
  if (mode === 'ar') return r.a
    ? `<div class="${cls}" id="${r.id}">${mk(tag, r.a, tc)}</div>`
    : `<div class="${cls} untr" id="${r.id}" dir="ltr" title="${t('untr')}">${mk(tag, r.e, tc)}</div>`;
  const ar = r.a ? mk(tag, r.a, tc) : `<p class="untr" dir="ltr">${t('untr')}</p>`;
  return `<div class="${cls} pair" id="${r.id}"><div class="col en" lang="en">${mk(tag, r.e, tc)}</div><div class="col ar" lang="ar" dir="rtl">${ar}</div></div>`;
}
let cur = null, curRows = null, blkEls = [];
async function openCh(id, bid, noPush) {
  if (!chapById[id]) id = order[0];
  cur = id; store.set('last', id);
  const c = chapById[id];
  $('#page').innerHTML = '<p style="text-align:center;opacity:.5;font-family:var(--f-ui)">…</p>';
  let rows; try { rows = await loadCh(id); } catch (e) { $('#page').textContent = 'Could not load chapter data.'; return; }
  if (cur !== id) return;
  curRows = rows;
  const mode = S.lang;
  const part = partById[c.part];
  const eyebrow = part && part.chapters[0] !== id ? `<div class="eyebrow">${title(part)}</div>` : '';
  const page = $('#page');
  page.className = (S.just ? 'justify ' : '') + (mode === 'both' ? '' : mode);
  page.innerHTML = eyebrow + rows.map(r => rowHtml(r, mode)).join('');
  blkEls = $$('.blk', page);
  applyVars();
  $$('#tocList .tc').forEach(a => a.classList.toggle('on', a.dataset.c === id));
  const on = $('#tocList .tc.on'); if (on && document.body.classList.contains('toc-open')) on.scrollIntoView({ block: 'center' });
  buildPager(id); updateCrumb(); document.title = `${title(c).replace(/\s+/g, ' ')} · 1-2-3`;
  const pos = bid || (store.get('pos', {})[id]);
  requestAnimationFrame(() => {
    if (bid) { const e = document.getElementById(bid); if (e) { e.scrollIntoView({ block: 'center' }); e.classList.add('flash'); setTimeout(() => e.classList.remove('flash'), 2600); } }
    else if (pos && pos !== rows[0].id && document.getElementById(pos)) document.getElementById(pos).scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
    onScroll();
  });
}
function buildPager(id) {
  const i = order.indexOf(id), p = chapById[order[i - 1]], n = chapById[order[i + 1]];
  const a = (c, cls, lab) => c ? `<a class="${cls}" href="#/read/${c.id}"><small>${lab}</small>${title(c).replace(/\s+/g, ' ')}</a>` : `<a class="${cls} empty"></a>`;
  $('#pager').innerHTML = a(p, 'pv', '← ' + t('prev')) + a(n, 'nx', t('next') + ' →');
  if (uiLang() === 'ar') $('#pager').innerHTML = a(n, 'nx', t('next') + ' ←').replace('nx', 'pv') + a(p, 'pv', '→ ' + t('prev')).replace('pv', 'nx');
}
function updateCrumb() {
  if (!cur) return;
  const c = chapById[cur], pct = scrollPct();
  const mins = Math.max(0, Math.round(c.words * (1 - pct) / 230));
  $('#crumb').textContent = `${title(c).replace(/\s+/g, ' ')} · ${mins} ${t('min')} ${t('left')}`;
}
const scrollPct = () => { const h = document.documentElement.scrollHeight - innerHeight; return h > 0 ? Math.min(1, scrollY / h) : 0; };
let tick = 0;
function onScroll() {
  if (document.body.dataset.view !== 'read' || !cur) return;
  const pct = scrollPct();
  // overall progress
  let before = 0; for (const id of order) { if (id === cur) break; before += chapById[id].words; }
  const all = (before + chapById[cur].words * pct) / totalWords;
  $('#progress i').style.width = (all * 100).toFixed(2) + '%';
  const now = Date.now(); if (now - tick < 250) return; tick = now;
  updateCrumb();
  let first = null; for (const e of blkEls) { if (e.getBoundingClientRect().bottom > 90) { first = e; break; } }
  if (first) { const pos = store.get('pos', {}); pos[cur] = first.id; store.set('pos', pos); }
  if (pct > .93) { const d = store.get('done', {}); if (!d[cur]) { d[cur] = 1; store.set('done', d); const a = $(`#tocList .tc[data-c="${cur}"]`); a && a.classList.add('done'); } }
}
addEventListener('scroll', onScroll, { passive: true });

/* ---------- TOC ---------- */
function buildToc() {
  const done = store.get('done', {}); let h = '';
  B.parts.forEach(p => {
    h += `<div class="tp" data-p="${p.id}">${title(p).replace(/\s+/g, ' ')}</div>`;
    p.chapters.forEach(id => {
      const c = chapById[id]; if (id === p.chapters[0] && p.chapters.length > 1 && c.words < 40 && c.en === p.en) return;
      h += `<a class="tc${done[id] ? ' done' : ''}" data-c="${id}" href="#/read/${id}"><span>${title(c).replace(/\s+/g, ' ')}</span><span class="w">${Math.max(1, Math.round(c.words / 230))} ${t('min')}</span></a>`;
    });
  });
  $('#tocList').innerHTML = h;
}

/* ---------- search ---------- */
let idx = null;
const norm = s => s.toLowerCase().replace(/[ً-ٰٟـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
const strip = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
async function buildIdx() {
  if (idx) return idx; idx = [];
  await Promise.all(order.map(loadCh));
  order.forEach(id => CHD[id].forEach(r => { if (r.i) return; idx.push({ c: id, b: r.id, e: strip(r.e), a: r.a ? strip(r.a) : '' }); }));
  idx.forEach(x => { x.ne = norm(x.e); x.na = norm(x.a); });
  return idx;
}
let qTimer;
$('#q').addEventListener('input', e => {
  clearTimeout(qTimer); const q = e.target.value.trim();
  if (q.length < 2) { $('#qres').innerHTML = ''; return; }
  qTimer = setTimeout(async () => {
    const ix = await buildIdx(), nq = norm(q), out = [];
    for (const x of ix) {
      const useAr = /[؀-ۿ]/.test(q);
      const h = useAr ? x.na : x.ne, raw = useAr ? x.a : x.e; const p = h.indexOf(nq); if (p < 0) continue;
      const s = Math.max(0, p - 40), snip = raw.substr(s, 130).replace(/[<>&]/g, '');
      const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'i');
      out.push(`<a href="#/read/${x.c}/${x.b}"><small>${title(chapById[x.c]).replace(/\s+/g, ' ')}</small>…${snip.replace(re, '<mark>$1</mark>')}…</a>`);
      if (out.length >= 40) break;
    }
    $('#qres').innerHTML = out.length ? out.join('') : `<p style="padding:8px;color:var(--muted)">${t('noRes')}</p>`;
  }, 200);
});

/* ---------- routing / chrome ---------- */
function setView(v) {
  document.body.dataset.view = v;
  $('#reader').hidden = v !== 'read'; $('#mapView').hidden = v !== 'map';
  $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  if (v === 'map' && window.MM) window.MM.show();
  if (v === 'read') onScroll();
}
function route() {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  closePanels();
  if (h[0] === 'map') { setView('map'); if (h[1] && window.MM) window.MM.focusChapter(h[1]); return; }
  setView('read');
  const id = h[0] === 'read' && chapById[h[1]] ? h[1] : (store.get('last', order[0]));
  if (id === cur && !h[2]) return;
  if (id === cur && h[2]) { const e = document.getElementById(h[2]); if (e) { e.scrollIntoView({ block: 'center' }); e.classList.add('flash'); setTimeout(() => e.classList.remove('flash'), 2600); return; } }
  openCh(id, h[2]);
}
function closePanels() { document.body.classList.remove('toc-open'); $('#settings').hidden = true; $('#scrim').hidden = true; }
function openPanel(which) {
  const wasOpen = which === 'toc' ? document.body.classList.contains('toc-open') : !$('#settings').hidden;
  closePanels(); if (wasOpen) return;
  if (which === 'toc') document.body.classList.add('toc-open'); else { $('#settings').hidden = false; syncSettings(); }
  $('#scrim').hidden = false;
}
function setLang(l) {
  S.lang = l; saveS();
  document.documentElement.lang = l === 'ar' ? 'ar' : 'en';
  document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  document.body.dataset.lang = l;
  $$('#langSeg button').forEach(b => b.classList.toggle('on', b.dataset.l === l));
  applyI18n(); buildToc();
  if (document.body.dataset.view === 'read' && cur) { const keep = firstVisible(); openCh(cur, null).then(() => { if (keep) { const e = document.getElementById(keep); e && e.scrollIntoView({ block: 'start' }); } }); }
  else if (window.MM) window.MM.relayout();
}
function firstVisible() { for (const e of blkEls) if (e.getBoundingClientRect().bottom > 90) return e.id; return null; }

$('#btnToc').onclick = () => openPanel('toc');
$('#btnSet').onclick = () => openPanel('set');
$('#sClose').onclick = closePanels; $('#scrim').onclick = closePanels;
$$('#langSeg button').forEach(b => b.onclick = () => setLang(b.dataset.l));
$$('.tabs button').forEach(b => b.onclick = () => { location.hash = b.dataset.v === 'map' ? '#/map' : '#/read/' + (cur || store.get('last', order[0])); });
$('#page').addEventListener('click', e => { if (e.target.tagName === 'IMG') { const lb = $('#lightbox'); lb.querySelector('img').src = e.target.src; lb.hidden = false; } });
$('#lightbox').onclick = () => $('#lightbox').hidden = true;
addEventListener('keydown', e => {
  if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') { closePanels(); $('#lightbox').hidden = true; }
  else if (k === 't') openPanel('toc'); else if (k === 'a') openPanel('set');
  else if (k === 'm') location.hash = document.body.dataset.view === 'map' ? '#/read/' + cur : '#/map';
  else if ((k === 'arrowright' || k === 'arrowleft') && document.body.dataset.view === 'read' && !e.altKey) {
    const dir = (k === 'arrowright') === (document.documentElement.dir !== 'rtl') ? 1 : -1;
    const n = order[order.indexOf(cur) + dir]; if (n) location.hash = '#/read/' + n;
  }
});
// focus mode: reveal the bar when the pointer reaches the top
addEventListener('mousemove', e => { if (S.focus) document.body.classList.toggle('showbar', e.clientY < 50); });
matchMedia('(prefers-color-scheme: dark)').addEventListener && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S.theme === 'auto' && !S.custom) applyTheme(); });

// extra css for flash
const st = document.createElement('style');
st.textContent = '.flash{animation:fl 2.6s ease-out}@keyframes fl{0%,40%{background:color-mix(in srgb,var(--accent) 22%,transparent);box-shadow:0 0 0 8px color-mix(in srgb,var(--accent) 22%,transparent);border-radius:8px}100%{background:transparent;box-shadow:0 0 0 8px transparent}}';
document.head.appendChild(st);

/* ---------- boot ---------- */
buildSettings(); applyTheme(); applyVars();
window.App = { S, B, chapById, partById, order, title, t, uiLang, isDark: () => dark, openCh, store, saveS };
setLang(S.lang);          // builds toc + i18n (renders chapter via route below)
$$('.sw').forEach(() => {});
window.addEventListener('hashchange', route);
if (S.snd !== 'off') { const once = () => { Snd.set(S.snd); removeEventListener('pointerdown', once); }; addEventListener('pointerdown', once); }
if (!location.hash) { const last = store.get('last', order[0]); history.replaceState(null, '', '#/read/' + last); }
route();
})();

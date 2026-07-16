/* SOP hub — PIN gate, menu bar + dropdowns, image-first manuals, pinch-zoom viewer */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const img = (slug, n) => 'assets/' + slug + '/' + String(n).padStart(2, '0') + '.webp';

const D = window.SOP;
const BY = Object.fromEntries(D.topics.map((t) => [t.slug, t]));
const CAT_OF = {};
D.tax.categories.forEach((c) => c.slugs.forEach((s) => { CAT_OF[s] = c.id; }));

/* ── PIN gate ────────────────────────────────────────────────── */
const KEY = 'sop.ok.v1';
let pin = '';

async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
function paintDots() {
  $('#gate .dots').replaceChildren(...Array.from({ length: 4 }, (_, i) => el('div', 'dot' + (i < pin.length ? ' on' : ''))));
}
async function push(d) {
  if (pin.length >= 4) return;
  pin += d; paintDots();
  if (pin.length < 4) return;
  if (await sha(pin) === D.pinHash) {
    try { localStorage.setItem(KEY, D.pinHash); } catch {}
    open_();
  } else {
    const g = $('#gate');
    g.classList.add('bad'); $('#gateErr').textContent = 'รหัสไม่ถูกต้อง ลองใหม่';
    navigator.vibrate?.(180);
    setTimeout(() => { g.classList.remove('bad'); pin = ''; paintDots(); }, 420);
  }
}
function open_() { $('#gate').remove(); $('#app').hidden = false; buildNav(); route(); }
function initGate() {
  try { if (localStorage.getItem(KEY) === D.pinHash) return open_(); } catch {}
  paintDots();
  $('#gate .pad').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.k === 'del') { pin = pin.slice(0, -1); paintDots(); $('#gateErr').textContent = ''; }
    else push(b.dataset.k);
  });
  addEventListener('keydown', (e) => {
    if (/^\d$/.test(e.key)) push(e.key);
    else if (e.key === 'Backspace') { pin = pin.slice(0, -1); paintDots(); }
  });
}

/* ── menu bar + dropdown ─────────────────────────────────────── */
function buildNav() {
  const n = $('#nav'); n.replaceChildren();
  D.tax.categories.forEach((c) => {
    const b = el('button', null); b.dataset.cat = c.id;
    b.append(el('span', null, c.name), el('span', 'ca', '▾'));
    b.onclick = (e) => { e.stopPropagation(); toggleDD(c.id); };
    n.append(b);
  });
}

let openCat = null;
function toggleDD(id) {
  if (openCat === id) return closeDD();
  openCat = id;
  const c = D.tax.categories.find((x) => x.id === id);
  const dd = $('#dd'); dd.replaceChildren();
  c.slugs.filter((s) => BY[s]).forEach((s) => {
    const t = BY[s];
    const a = el('a'); a.href = '#/t/' + s;
    a.append(el('span', 'ico', t.icon), el('b', null, t.title), el('small', null, t.pages.length + ' รูป'));
    a.onclick = closeDD;
    dd.append(a);
  });
  dd.style.top = $('header.top').getBoundingClientRect().bottom + 'px';
  $('#ddWrap').hidden = false;
  markNav();
}
function closeDD() { openCat = null; $('#ddWrap').hidden = true; markNav(); }
function markNav() {
  const cur = location.hash.startsWith('#/t/') ? CAT_OF[decodeURIComponent(location.hash.slice(4))] : null;
  $('#nav').querySelectorAll('button').forEach((b) => {
    b.classList.toggle('on', b.dataset.cat === openCat || (!openCat && b.dataset.cat === cur));
  });
}
$('#ddWrap').onclick = (e) => { if (e.target.id === 'ddWrap') closeDD(); };

/* ── search ──────────────────────────────────────────────────── */
const hay = (t) => [t.title, t.subtitle, t.summary, ...(t.keywords || []),
  ...(t.steps || []).flatMap((s) => [s.title, s.detail]),
  ...(t.chapters || []).flatMap((c) => [c.name, c.summary, ...(c.steps || [])]),
  ...(t.warnings || []), ...t.pages.map((p) => p.caption || p.short || '')].join(' ').toLowerCase();
D.topics.forEach((t) => { t._hay = hay(t); });

function why(t, q) {
  for (const s of t.steps || []) if ((s.title + ' ' + s.detail).toLowerCase().includes(q)) return s.title + ' — ' + s.detail;
  for (const c of t.chapters || []) if ((c.name + ' ' + c.summary).toLowerCase().includes(q)) return c.name + ' — ' + c.summary;
  for (const w of t.warnings || []) if (w.toLowerCase().includes(q)) return '⚠️ ' + w;
  for (const p of t.pages) { const s = p.caption || p.short || ''; if (s.toLowerCase().includes(q)) return 'รูป ' + p.n + ' — ' + s; }
  const k = (t.keywords || []).find((x) => x.toLowerCase().includes(q));
  return k ? 'คำค้น: ' + k : t.subtitle;
}
const snip = (s, q) => {
  const i = s.toLowerCase().indexOf(q);
  if (i < 0) return esc(s.slice(0, 60));
  const a = Math.max(0, i - 18);
  return (a ? '…' : '') + esc(s.slice(a, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length, i + q.length + 40)) + '…';
};

/* ── home: cover tiles ───────────────────────────────────────── */
function tile(t, sub) {
  const a = el('a', 'tile'); a.href = '#/t/' + t.slug;
  const th = el('div', 'thumb');
  const im = el('img'); im.src = 'assets/covers/' + t.slug + '.webp';
  im.loading = 'lazy'; im.decoding = 'async'; im.alt = '';
  th.append(im, el('span', 'em', t.icon), el('span', 'n', t.pages.length + ' รูป'));
  const l = el('div', 'lab'); l.append(el('b', null, t.title));
  const s = el('small'); s.innerHTML = sub || esc(t.subtitle); l.append(s);
  a.append(th, l);
  return a;
}

function home(q) {
  const v = $('#view'); v.replaceChildren();
  const list = q ? D.topics.filter((t) => t._hay.includes(q)) : D.topics;
  if (!list.length) { v.append(el('p', 'hint', 'ไม่พบคู่มือที่ตรงกับ “' + q + '”')); return; }
  const g = el('div', 'tiles');
  list.forEach((t) => g.append(tile(t, q ? snip(why(t, q), q) : null)));
  v.append(g);
}

/* ── topic: images first, text in drawers ────────────────────── */
function figures(t, from, to) {
  const g = el('div', 'grid');
  t.pages.filter((p) => p.n >= from && p.n <= to).forEach((p) => {
    if (p.placeholder) {
      // real photo removed because it showed a customer's ID — keep the instruction
      const f = el('figure', 'ph');
      const box = el('div', 'ph-box');
      box.append(el('div', 'ph-ic', '📷'), el('div', 'ph-t', p.short || p.caption || ''),
        el('div', 'ph-note', 'รูปตัวอย่างถอดออก (มีข้อมูลลูกค้า) — ถ่ายตามคำอธิบาย'));
      const c = el('figcaption');
      c.append(el('span', 'pg', String(p.n)), el('span', null, p.short || p.caption || ''));
      f.append(box, c); g.append(f);
      return;
    }
    const f = el('figure');
    const im = el('img');
    im.src = img(t.slug, p.n); im.loading = 'lazy'; im.decoding = 'async';
    im.alt = p.short || p.caption || '';
    im.addEventListener('click', () => lbOpen(t, p.n));
    f.append(im);
    const text = p.short || p.caption;
    if (text) {
      const c = el('figcaption');
      c.append(el('span', 'pg', String(p.n)), el('span', null, text));
      f.append(c);
    }
    g.append(f);
  });
  return g;
}

function drawerTabs(t, v) {
  const bar = el('div', 'tabs');
  const drawers = [];
  const add = (label, cls, build) => {
    const b = el('button', 'tab' + (cls ? ' ' + cls : ''), label);
    const d = el('div', 'drawer'); d.hidden = true; d.append(build());
    b.onclick = () => {
      const opening = d.hidden;
      drawers.forEach(([bb, dd]) => { dd.hidden = true; bb.classList.remove('on'); });
      if (opening) { d.hidden = false; b.classList.add('on'); }
    };
    drawers.push([b, d]); bar.append(b); v.append(d);
    return d;
  };

  if (t.warnings?.length) add('⚠️ ข้อควรระวัง ' + t.warnings.length, 'warn-tab', () => {
    const p = el('div', 'panel warn'); const u = el('ul');
    t.warnings.forEach((w) => u.append(el('li', null, w)));
    p.append(u); return p;
  });

  if (t.steps?.length) add('📋 ขั้นตอน ' + t.steps.length, null, () => {
    const p = el('div', 'panel'); const o = el('ol', 'steps');
    t.steps.forEach((s, i) => {
      const li = el('li'); li.append(el('div', 'n', String(i + 1)));
      const d = el('div'); d.append(el('b', null, s.title), el('p', null, s.detail));
      li.append(d); o.append(li);
    });
    p.append(o); return p;
  });

  if (t.copyText) add('💬 ข้อความสำเร็จรูป', null, () => {
    const p = el('div', 'panel copy'); p.append(el('pre', null, t.copyText));
    const cp = el('button', 'cp', '📋 คัดลอกข้อความ');
    cp.onclick = async () => {
      try { await navigator.clipboard.writeText(t.copyText); cp.textContent = '✓ คัดลอกแล้ว'; }
      catch { cp.textContent = 'คัดลอกไม่ได้ — กดค้างที่ข้อความแทน'; }
      setTimeout(() => { cp.textContent = '📋 คัดลอกข้อความ'; }, 1600);
    };
    p.append(cp); return p;
  });

  if (t.files?.length) add('📄 ไฟล์ PDF ' + t.files.length, null, () => {
    const p = el('div', 'panel'); const w = el('div', 'files');
    t.files.forEach((f) => {
      const a = el('a', 'file'); a.href = 'assets/' + f.path; a.target = '_blank'; a.rel = 'noopener';
      a.append(el('span', null, '📄'), el('span', null, f.name), el('span', 'sz', f.size + ' MB'));
      w.append(a);
    });
    p.append(w); return p;
  });

  return bar.children.length ? bar : null;
}

function topic(slug) {
  const t = BY[slug]; const v = $('#view'); v.replaceChildren();
  if (!t) { v.append(el('p', 'hint', 'ไม่พบคู่มือนี้')); return; }

  const b = el('a', 'back'); b.href = '#/'; b.textContent = '‹ คู่มือทั้งหมด'; v.append(b);
  const h = el('div', 't-head');
  const h1 = el('h1'); h1.append(el('span', 'em', t.icon), el('span', null, t.title));
  h.append(h1, el('p', null, t.subtitle));
  v.append(h);

  const bar = drawerTabs(t, v);
  if (bar) v.insertBefore(bar, v.children[2]);

  if (t.chapters?.length) {
    const chips = el('div', 'chips');
    t.chapters.forEach((c, i) => {
      const cb = el('button', 'chip', c.name);
      cb.onclick = () => $('#ch' + i).scrollIntoView({ behavior: 'smooth', block: 'start' });
      chips.append(cb);
    });
    v.append(chips);
    t.chapters.forEach((c, i) => {
      const hd = el('div', 'ch-head'); hd.id = 'ch' + i;
      hd.append(el('b', null, c.name), el('small', null, 'รูป ' + c.from + '–' + c.to));
      v.append(hd);
      if (c.steps?.length) {
        const bar = el('div', 'tabs');
        const b = el('button', 'tab', '📋 ขั้นตอน ' + c.steps.length);
        const d = el('div', 'drawer'); d.hidden = true;
        const p = el('div', 'panel'); const o = el('ol', 'steps');
        c.steps.forEach((s, k) => {
          const li = el('li'); li.append(el('div', 'n', String(k + 1)));
          const w = el('div'); w.append(el('b', null, s)); li.append(w); o.append(li);
        });
        p.append(o); d.append(p);
        b.onclick = () => { d.hidden = !d.hidden; b.classList.toggle('on', !d.hidden); };
        bar.append(b); v.append(bar, d);
      }
      v.append(figures(t, c.from, c.to));
    });
  } else {
    v.append(figures(t, 1, 1e9));
  }
  scrollTo(0, 0);
}

/* ── lightbox: swipe + pinch + pan (real photos only) ────────── */
const LB = { t: null, pages: [], i: 0, sc: 1, tx: 0, ty: 0, w: 0 };
const cap = (p) => p.short || p.caption || '';

function lbRender() {
  const tr = $('#lbTrack'); tr.replaceChildren();
  LB.pages.forEach((p) => {
    const s = el('div', 'lb-slide');
    const im = el('img'); im.decoding = 'async'; im.src = img(LB.t.slug, p.n); im.alt = cap(p);
    s.append(im); tr.append(s);
  });
}
function lbApply(anim) {
  LB.w = innerWidth;
  const tr = $('#lbTrack');
  tr.style.transition = anim ? 'transform .25s' : 'none';
  tr.style.transform = 'translateX(' + (-LB.i * LB.w) + 'px)';
  const im = tr.children[LB.i]?.firstChild;
  if (im) im.style.transform = `translate(${LB.tx}px,${LB.ty}px) scale(${LB.sc})`;
  $('#lbBar .num').textContent = (LB.i + 1) + ' / ' + LB.pages.length;
  $('#lbBar .cap').textContent = cap(LB.pages[LB.i]);
}
function lbGo(i) {
  LB.i = Math.max(0, Math.min(LB.pages.length - 1, i));
  LB.sc = 1; LB.tx = 0; LB.ty = 0;
  [...$('#lbTrack').children].forEach((s) => { s.firstChild.style.transform = ''; });
  lbApply(true);
}
function lbOpen(t, n) {
  LB.t = t; LB.pages = t.pages.filter((p) => !p.placeholder);
  LB.i = LB.pages.findIndex((p) => p.n === n); if (LB.i < 0) LB.i = 0;
  LB.sc = 1; LB.tx = 0; LB.ty = 0;
  lbRender(); $('#lb').hidden = false; document.body.style.overflow = 'hidden';
  lbApply(false);
}
function lbClose() { $('#lb').hidden = true; document.body.style.overflow = ''; }

(function lbTouch() {
  const lb = $('#lb');
  let mode = null, sx = 0, sy = 0, base = 1, d0 = 0, ox = 0, oy = 0, lastTap = 0, moved = false;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  lb.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) { mode = 'pinch'; d0 = dist(e.touches); base = LB.sc; }
    else if (e.touches.length === 1) {
      mode = LB.sc > 1 ? 'pan' : 'swipe'; moved = false;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; ox = LB.tx; oy = LB.ty;
    }
  }, { passive: true });

  lb.addEventListener('touchmove', (e) => {
    if (mode === 'pinch' && e.touches.length === 2) {
      LB.sc = Math.max(1, Math.min(5, base * dist(e.touches) / d0));
      if (LB.sc === 1) { LB.tx = 0; LB.ty = 0; }
      lbApply(false);
    } else if (mode === 'pan') {
      moved = true;
      LB.tx = ox + (e.touches[0].clientX - sx); LB.ty = oy + (e.touches[0].clientY - sy);
      lbApply(false);
    } else if (mode === 'swipe') {
      const dx = e.touches[0].clientX - sx;
      if (Math.abs(dx) > 8) moved = true;
      $('#lbTrack').style.transition = 'none';
      $('#lbTrack').style.transform = 'translateX(' + (-LB.i * LB.w + dx) + 'px)';
    }
    e.preventDefault();
  }, { passive: false });

  lb.addEventListener('touchend', (e) => {
    if (mode === 'swipe') {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > LB.w * 0.22) lbGo(LB.i + (dx < 0 ? 1 : -1)); else lbApply(true);
      if (!moved) {
        const now = Date.now();
        if (now - lastTap < 300) { LB.sc = 2.4; lbApply(true); lastTap = 0; }
        else { lastTap = now; setTimeout(() => { if (lastTap === now) $('#lbBar').classList.toggle('hide'); }, 300); }
      }
    } else if (mode === 'pan' && !moved) { lbGo(LB.i); }
    if (LB.sc <= 1.02 && mode === 'pinch') lbGo(LB.i);
    mode = null;
  }, { passive: true });

  addEventListener('resize', () => { if (!$('#lb').hidden) lbApply(false); });
  addEventListener('keydown', (e) => {
    if ($('#lb').hidden) return;
    if (e.key === 'Escape') lbClose();
    if (e.key === 'ArrowRight') lbGo(LB.i + 1);
    if (e.key === 'ArrowLeft') lbGo(LB.i - 1);
  });
  $('#lbBar .x').onclick = lbClose;
})();

/* ── router ──────────────────────────────────────────────────── */
function route() {
  const h = location.hash.slice(2);
  if (!$('#lb').hidden) lbClose();
  closeDD();
  if (h.startsWith('t/')) topic(decodeURIComponent(h.slice(2)));
  else home($('#q').value.trim().toLowerCase());
  markNav();
}
addEventListener('hashchange', route);

$('#sBtn').onclick = () => {
  const s = $('.search');
  s.hidden = !s.hidden;
  if (!s.hidden) { closeDD(); $('#q').focus(); }
  else { $('#q').value = ''; if (!location.hash.startsWith('#/t/')) home(''); }
};
$('#q').addEventListener('input', () => {
  const q = $('#q').value.trim().toLowerCase();
  if (location.hash.startsWith('#/t/')) location.hash = '#/'; else home(q);
});
$('.clr').onclick = () => { $('#q').value = ''; $('.search').hidden = true; home(''); };
$('.brand').onclick = () => { location.hash = '#/'; };
$('#site').textContent = D.tax.siteTitle;

initGate();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

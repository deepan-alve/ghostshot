// GhostShot web demo. The stage works like the extension:
// drag, release, and the shot lands on the clipboard tray. Hold R for text, F for the path.
// Markup hooks: [data-stage] [data-tray] [data-toast] [data-count] [data-key] [data-mode-btn] [data-sample]
(() => {
  const stage = document.querySelector('[data-stage]');
  if (!stage) return;
  const tray = document.querySelector('[data-tray]');
  const toast = document.querySelector('[data-toast]');
  const counters = document.querySelectorAll('[data-count]');
  const modeBtns = [...document.querySelectorAll('[data-mode-btn]')];
  const keycaps = [...document.querySelectorAll('[data-key]')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MIN = 10;
  const MAX_TRAY = 4;

  const held = { r: false, f: false };
  let picked = 'image';
  let drag = null;
  let shots = 0;

  const sel = document.createElement('div');
  sel.className = 'gs-sel';
  sel.setAttribute('aria-hidden', 'true');
  const size = document.createElement('span');
  size.className = 'gs-size';
  sel.append(size);
  stage.append(sel);

  const mode = () => (held.r ? 'text' : held.f ? 'path' : picked);

  function paintMode() {
    const m = mode();
    stage.dataset.mode = m;
    for (const b of modeBtns) b.setAttribute('aria-pressed', String(b.dataset.modeBtn === m));
    for (const k of keycaps) k.classList.toggle('is-down', !!held[k.dataset.key]);
  }

  // ---------- keys: hold R or F, like in GNOME ----------
  const typing = (t) => t.closest?.('input, textarea, [contenteditable]');
  addEventListener('keydown', (e) => {
    if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'r' || k === 'f') { held[k] = true; paintMode(); }
  });
  addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'r' || k === 'f') { held[k] = false; paintMode(); }
  });
  addEventListener('blur', () => { held.r = held.f = false; paintMode(); });

  for (const b of modeBtns) {
    b.addEventListener('click', () => { picked = b.dataset.modeBtn; paintMode(); });
  }

  // ---------- drag ----------
  const local = (e) => {
    const r = stage.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(e.clientX - r.left, r.width)),
      y: Math.max(0, Math.min(e.clientY - r.top, r.height)),
    };
  };

  function rectOf(a, b) {
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
  }

  function place(r) {
    sel.style.transform = `translate(${r.x}px, ${r.y}px)`;
    sel.style.width = `${r.w}px`;
    sel.style.height = `${r.h}px`;
    size.textContent = `${Math.round(r.w)} × ${Math.round(r.h)}`;
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('a, button, input')) return;
    e.preventDefault();
    stage.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, start: local(e) };
    place({ ...drag.start, w: 0, h: 0 });
    stage.classList.add('is-dragging');
  });

  stage.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.rect = rectOf(drag.start, local(e));
    place(drag.rect);
    stage.classList.toggle('has-sel', drag.rect.w > 2 || drag.rect.h > 2);
  });

  function end(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const r = drag.rect;
    drag = null;
    stage.classList.remove('is-dragging');
    if (!r || r.w < MIN || r.h < MIN) { stage.classList.remove('has-sel'); return; }
    capture(r);
  }
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    stage.classList.remove('is-dragging', 'has-sel');
  });

  // Keyboard and screen reader path: capture a set area.
  for (const btn of document.querySelectorAll('[data-sample]')) {
    btn.addEventListener('click', () => {
      const target = stage.querySelector(btn.dataset.sample) || stage;
      const s = stage.getBoundingClientRect();
      const t = target.getBoundingClientRect();
      const r = { x: t.left - s.left - 8, y: t.top - s.top - 8, w: t.width + 16, h: t.height + 16 };
      place(r);
      stage.classList.add('has-sel');
      capture(r);
    });
  }

  // ---------- what a shot holds ----------
  function textIn(r) {
    const s = stage.getBoundingClientRect();
    const box = { l: s.left + r.x, t: s.top + r.y, r: s.left + r.x + r.w, b: s.top + r.y + r.h };
    const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest('.gs-sel, [aria-hidden="true"]') || !n.textContent.trim()
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const lines = [];
    const range = document.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      // Read word by word, so a selection over half a line gets half the line.
      const words = n.textContent.split(/(\s+)/);
      let at = 0;
      for (const w of words) {
        if (w.trim()) {
          range.setStart(n, at);
          range.setEnd(n, at + w.length);
          const q = range.getBoundingClientRect();
          const cx = q.left + q.width / 2;
          const cy = q.top + q.height / 2;
          if (cx > box.l && cx < box.r && cy > box.t && cy < box.b) {
            const block = n.parentElement.closest('p, li, h1, h2, h3, pre, div') || stage;
            const line = lines.find((l) => l.block === block && Math.abs(l.y - cy) < q.height * 0.5);
            if (line) line.words.push({ x: q.left, w });
            else lines.push({ block, y: cy, x: q.left, words: [{ x: q.left, w }] });
          }
        }
        at += w.length;
      }
    }
    // Reading order: top to bottom, then left to right for lines that start on the same row.
    return lines.sort((a, b) => (Math.abs(a.y - b.y) < 6 ? a.x - b.x : a.y - b.y))
      .map((l) => l.words.sort((a, b) => a.x - b.x).map((x) => x.w).join(' '))
      .join('\n');
  }

  function pathNow() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `~/Pictures/Screenshots/Screenshot From ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}.png`;
  }

  // A tray column's inner width, so a thumbnail fills its slot.
  function thumbSlot() {
    if (!tray) return { w: 168, h: 112 };
    const cs = getComputedStyle(tray);
    const cols = cs.gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    const gap = parseFloat(cs.columnGap) || 0;
    const w = Math.max(80, (tray.clientWidth - gap * (cols - 1)) / cols - 16);
    return { w, h: w * 0.62 };
  }

  // The thumbnail is a live copy of the stage, cut to the selection.
  function thumbOf(r) {
    const frame = document.createElement('div');
    frame.className = 'gs-thumb';
    const slot = thumbSlot();
    const scale = Math.min(1, slot.w / r.w, slot.h / r.h);
    frame.style.width = `${r.w * scale}px`;
    frame.style.height = `${r.h * scale}px`;
    const copy = stage.cloneNode(true);
    copy.removeAttribute('data-stage');
    copy.setAttribute('aria-hidden', 'true');
    copy.classList.add('gs-copy');
    copy.querySelectorAll('.gs-sel, [id]').forEach((n) => (n.classList.contains('gs-sel') ? n.remove() : n.removeAttribute('id')));
    copy.style.width = `${stage.clientWidth}px`;
    copy.style.height = `${stage.clientHeight}px`;
    copy.style.transform = `scale(${scale}) translate(${-r.x}px, ${-r.y}px)`;
    frame.append(copy);
    return frame;
  }

  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch { return false; }
  }

  async function capture(r) {
    const m = mode();
    shots += 1;
    for (const c of counters) c.textContent = String(shots);

    stage.classList.remove('flash');
    void stage.offsetWidth;
    stage.classList.add('flash');
    setTimeout(() => stage.classList.remove('has-sel', 'flash'), reduce ? 0 : 420);

    const item = document.createElement('li');
    item.className = 'gs-shot';
    item.dataset.mode = m;
    const meta = document.createElement('p');
    meta.className = 'gs-meta';
    let body;
    if (m === 'image') {
      body = thumbOf(r);
      meta.textContent = `Image, ${Math.round(r.w)} × ${Math.round(r.h)}`;
    } else {
      const text = m === 'text' ? textIn(r) || '(no text in that area)' : pathNow();
      body = document.createElement('pre');
      body.className = 'gs-text';
      body.textContent = text;
      const ok = await copyText(text);
      meta.textContent = `${m === 'text' ? 'Text' : 'Path'}${ok ? ', on your real clipboard' : ''}`;
    }
    item.append(body, meta);
    if (tray) {
      tray.prepend(item);
      while (tray.children.length > MAX_TRAY) tray.lastElementChild.remove();
    }

    if (toast) {
      toast.classList.remove('is-ghost');
      void toast.offsetWidth;
      toast.classList.add('is-ghost');
    }
    document.dispatchEvent(new CustomEvent('ghostshot:capture', { detail: { mode: m, rect: r } }));
  }

  paintMode();
})();

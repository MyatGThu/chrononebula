/* Momentum scroll — a small inertial ("Lenis-style") scroll so the whole
   world glides as one and the scroll-driven motion feels unified rather
   than twitchy. Deliberately conservative:

   - Fine-pointer devices only. Touch keeps its native, already-smooth
     scroll; reduced-motion keeps native scroll entirely.
   - Smooths the wheel and same-page anchor jumps; everything else
     (keyboard, find-in-page, programmatic scrollIntoView) scrolls natively
     and we simply resync to it, so nothing fights.
   - Never hijacks the wheel over an inner scrollable (the runway drawer,
     the universe panel, any overflow:auto pane).

   The scroll-motion engine reads window.scrollY, which we drive with
   scrollTo({behavior:'instant'}), so parallax and reveals track it for free. */

const lerp = (a, b, t) => a + (b - a) * t;

function isInsideScrollable(node) {
  for (let el = node; el && el !== document.body; el = el.parentElement) {
    if (!(el instanceof Element)) continue;
    const oy = getComputedStyle(el).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) return true;
  }
  return false;
}

export function initSmooth() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  if (reduce.matches || coarse.matches) return null;   /* native scroll */

  const root = document.documentElement;
  root.classList.add('has-smooth');   /* CSS drops native scroll-behavior */

  let target = window.scrollY;
  let current = target;
  let running = false;
  let raf = 0;

  const maxScroll = () => Math.max(0, root.scrollHeight - innerHeight);
  const clamp = (v) => Math.max(0, Math.min(maxScroll(), v));

  function loop() {
    current = lerp(current, target, 0.12);
    if (Math.abs(target - current) < 0.35) {
      current = target;
      running = false;
    }
    window.scrollTo({ top: current, left: 0, behavior: 'instant' });
    if (running) raf = requestAnimationFrame(loop);
  }
  function kick() {
    if (!running) { running = true; raf = requestAnimationFrame(loop); }
  }

  function onWheel(e) {
    if (e.ctrlKey) return;                       /* pinch-zoom */
    if (isInsideScrollable(e.target)) return;    /* let the pane scroll */
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
    target = clamp(target + e.deltaY * unit);
    kick();
  }

  /* keyboard / scrollbar / find-in-page / scrollIntoView all scroll
     natively; while our loop is idle, keep our target glued to reality */
  function onScroll() {
    if (!running) { target = current = window.scrollY; }
  }
  function onResize() { target = clamp(target); current = clamp(current); }

  /* same-page anchors glide through the engine */
  function onClick(e) {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href === '#' || !href.startsWith('#')) return;
    const id = decodeURIComponent(href.slice(1));
    const el = id ? document.getElementById(id) : null;
    const dest = id === 'top' ? null : el;
    if (id !== 'top' && !el) return;
    e.preventDefault();
    const y = dest ? dest.getBoundingClientRect().top + window.scrollY - 64 : 0;
    target = clamp(y);
    kick();
    history.replaceState(history.state, '', href);
  }

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  document.addEventListener('click', onClick);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; cancelAnimationFrame(raf); target = current = window.scrollY; }
  });

  return {
    /* let other modules glide the page (e.g. deep-link handlers) */
    to(y) { target = clamp(y); kick(); },
  };
}

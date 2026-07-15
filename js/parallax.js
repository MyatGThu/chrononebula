/* Parallax — one small engine that drives scroll- and pointer-parallax
   across the whole site, so nothing sits flat. Two opt-in attributes:

     data-drift="0.18"   → drifts vertically with scroll (background depth)
     data-tilt="1.4"        → shifts with the pointer (foreground depth); the
                              number is the depth factor (bigger = moves more)

   One rAF loop reads window.scrollY (the momentum engine drives it, so this
   tracks it for free) and an eased pointer. Geometry is cached and only
   refreshed on resize, so the loop never reads layout. Reduced motion and
   coarse pointers opt out. Everything degrades to a static, correctly-placed
   layout — the transforms are pure enhancement. */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function initParallax() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return null;

  const scrollEls = [...document.querySelectorAll('[data-drift]')].map((el) => ({
    el,
    speed: parseFloat(el.dataset.drift) || 0.15,
    top: 0, h: 0,
  }));
  const coarse = matchMedia('(pointer: coarse)');
  const tiltEls = coarse.matches
    ? []
    : [...document.querySelectorAll('[data-tilt]')].map((el) => ({
        el,
        depth: parseFloat(el.dataset.tilt) || 1,
      }));

  if (!scrollEls.length && !tiltEls.length) return null;

  function measure() {
    const y = window.scrollY;
    for (const it of scrollEls) {
      const r = it.el.getBoundingClientRect();
      it.top = r.top + y;
      it.h = r.height;
    }
  }
  measure();
  /* re-measure after fonts/images settle and on resize */
  window.addEventListener('load', measure);
  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(measure, 150);
  }, { passive: true });

  let px = 0, py = 0, tpx = 0, tpy = 0;
  if (tiltEls.length) {
    window.addEventListener('pointermove', (e) => {
      tpx = (e.clientX / innerWidth - 0.5) * 2;
      tpy = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  let running = true;
  let raf = 0;

  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const y = window.scrollY;
    const vh = innerHeight;
    const mid = y + vh / 2;

    for (const it of scrollEls) {
      const dist = it.top + it.h / 2 - mid;
      if (Math.abs(dist) > vh * 1.6) continue;   /* skip far-offscreen work */
      it.el.style.transform = `translate3d(0, ${(dist * -it.speed).toFixed(2)}px, 0)`;
    }

    if (tiltEls.length) {
      px += (tpx - px) * 0.06;
      py += (tpy - py) * 0.06;
      for (const it of tiltEls) {
        const dx = (px * 14 * it.depth).toFixed(2);
        const dy = (py * 12 * it.depth).toFixed(2);
        it.el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      }
    }
  }

  function setRunning(next) {
    if (next === running) return;
    running = next;
    if (running) frame();
    else cancelAnimationFrame(raf);
  }
  document.addEventListener('visibilitychange', () => setRunning(!document.hidden));
  frame();

  return { measure, destroy() { setRunning(false); } };
}

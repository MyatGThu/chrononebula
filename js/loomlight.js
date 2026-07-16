/* LOOMLIGHT — the orchestrator. Binds one scrubbed descent to the WebGL
   scene and the DOM choreography.

   - GSAP + ScrollTrigger own the clock: one scrubbed progress over the tall
     #loom section (the stage is CSS-sticky, so no pin-vs-momentum conflict).
     If GSAP is unavailable, a native scroll fallback drives the same map.
   - Three.js (loom-scene.js) renders the nebula → couture handoff from the
     progress-driven uniforms.
   - Anime.js draws the chrono-ring, staggers the wordmark, counts the year.
   - StringTune adds momentum scroll, a magnetic cursor, and the split text.

   Everything degrades: no WebGL → poster; reduced motion → settled frame +
   static copy; no JS → the noscript poster and prose. */

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 760px)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
/* lite tier: forced via ?lite, or when the device looks low-powered */
const lite = new URLSearchParams(location.search).has('lite')
  || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 && mobile);

const canvas = document.getElementById('loom-canvas');
const loom = document.getElementById('loom');
const stage = document.querySelector('.loom-stage');

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

let scene = null;

/* ---- caption / dom refs ------------------------------------------------- */
const intro = document.querySelector('.loom-intro');
const wordmark = document.querySelector('.loom-wordmark');
const captions = [...document.querySelectorAll('.loom-caption')];
const cta = document.querySelector('.loom-cta');
const ring = document.querySelector('.loom-ring');

/* ---- the act map: one progress → every uniform + every dom opacity ------ */
function applyProgress(p) {
  if (scene && scene.ok) {
    const dive = smoothstep(0.06, 0.62, p);
    const condenseRaw = smoothstep(0.60, 0.88, p);
    scene.setProgress({
      dive,
      warpRot: p * 1.4,
      exposure: 1.0 - 0.5 * smoothstep(0.40, 0.60, p),
      ignite: smoothstep(0.42, 0.60, p),
      condense: condenseRaw * (1 - 0.16 * smoothstep(0.9, 1.0, p)),
      breathe: smoothstep(0.88, 1.0, p),
    });
  }
  if (intro) intro.style.opacity = String(1 - smoothstep(0.03, 0.12, p));
  if (wordmark) {
    const out = 1 - smoothstep(0.06, 0.17, p);
    const back = smoothstep(0.9, 0.98, p) * 0.92;
    wordmark.style.opacity = String(Math.max(out, back));
    wordmark.style.transform = `translateY(${(-smoothstep(0.06, 0.4, p) * 40).toFixed(1)}px)`;
  }
  for (const cap of captions) {
    const from = parseFloat(cap.dataset.from), to = parseFloat(cap.dataset.to);
    const o = smoothstep(from, from + 0.05, p) * (1 - smoothstep(to - 0.05, to, p));
    cap.style.opacity = String(o);
    cap.style.transform = `translateY(${((0.5 - smoothstep(from, to, p)) * 26).toFixed(1)}px)`;
  }
  if (cta) {
    const o = smoothstep(0.92, 1.0, p);
    cta.style.opacity = String(o);
    cta.style.pointerEvents = o > 0.6 ? 'auto' : 'none';
  }
}

/* ---- boot the scene, then the scroll clock ------------------------------ */
import('./loom-scene.js').then(({ initLoomScene }) => {
  scene = initLoomScene(canvas, { reduced, mobile });
  if (!scene.ok) { root.classList.add('loom-no-webgl'); return; }
  root.classList.add('loom-has-webgl');
  scene.resize();
  addEventListener('resize', () => { scene.resize(); if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }, { passive: true });

  if (reduced) {
    scene.renderOnce();
    applyProgress(0.96);   /* settle on the garment + offer */
    return;
  }
  scene.start();
  document.addEventListener('visibilitychange', () => { document.hidden ? scene.stop() : scene.start(); });
  setupScroll();

  /* offline capture hook: freeze the loop and render one deterministic frame
     at a given progress (used by the screenshot harness under software WebGL) */
  window.__loom = {
    frameAt(p) { scene.stop(); applyProgress(p); scene.renderOnce(); },
    resume() { scene.start(); },
  };
}).catch(() => root.classList.add('loom-no-webgl'));

/* ---- GSAP clock (native fallback if the globals never loaded) ----------- */
function setupScroll() {
  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  if (gsap && ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: loom, start: 'top top', end: 'bottom bottom', scrub: 0.6,
      onUpdate: (self) => applyProgress(self.progress),
      invalidateOnRefresh: true,
    });
    ScrollTrigger.refresh();
    root.classList.add('loom-gsap');
  } else {
    /* native fallback: progress = how far we've scrolled through #loom */
    const onScroll = () => {
      const r = loom.getBoundingClientRect();
      const travel = r.height - innerHeight;
      applyProgress(travel > 0 ? clamp(-r.top / travel, 0, 1) : 0);
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
}

/* ---- Anime.js: chrono-ring draw, wordmark stagger, year counter --------- */
import('../vendor/anime.esm.min.js').then(({ animate, createTimeline, stagger, svg, utils }) => {
  root.classList.add('loom-anime');
  if (reduced) return;   /* no entrance motion; CSS shows the settled states */
  const chars = [...document.querySelectorAll('.loom-wordmark .ch')];
  const tl = createTimeline({ defaults: { ease: 'out(3)' } });
  if (ring && svg && svg.createDrawable) {
    try { tl.add(svg.createDrawable('.loom-ring path, .loom-ring circle'), { draw: ['0 0', '0 1'], duration: 1600, ease: 'inOut(2)' }, 0); }
    catch (e) { /* older/newer api shape: skip the draw, keep the rest */ }
  }
  if (chars.length) {
    tl.add(chars, { opacity: [0, 1], y: [26, 0], filter: ['blur(10px)', 'blur(0px)'], duration: 900, delay: stagger(55) }, 250);
  }
  const yearEl = document.querySelector('.loom-year');
  if (yearEl && utils && utils.set) {
    const obj = { v: 0 };
    animate(obj, { v: 8888, duration: 2200, delay: 500, ease: 'out(3)', modifier: utils.round(0), onUpdate: () => { yearEl.textContent = Math.round(obj.v); } });
  }
  if (cta) {
    animate(cta.querySelector('.loom-cta-glow'), { opacity: [0.4, 0.85], scale: [1, 1.06], duration: 2200, loop: true, alternate: true, ease: 'inOut(2)' });
  }
}).catch(() => { /* Anime absent: DOM is already visible, nothing hidden */ });

/* ---- StringTune: momentum scroll, magnetic cursor, split text ----------- */
import('../vendor/string-tune.mjs').then((ST) => {
  if (reduced) return;
  const Tune = ST.default;
  const inst = Tune.getInstance ? Tune.getInstance() : new Tune();
  const useMod = (name) => { const M = ST[name]; if (M && inst.use) { try { inst.use(M); } catch (e) {} } };
  if (!coarse) useMod('StringGlide');     /* momentum scroll on fine pointers */
  useMod('StringMagnetic');               /* magnetic cursor pull */
  useMod('StringSplit');
  try { inst.start && inst.start(60); } catch (e) {}
  root.classList.add('loom-stringtune');

  /* bridge momentum → ScrollTrigger so the scrubbed descent inherits inertia */
  if (window.ScrollTrigger && inst.on) {
    try { inst.on('scroll', () => window.ScrollTrigger.update()); } catch (e) {}
  }
}).catch(() => { /* StringTune absent: native scroll + no magnetic cursor */ });

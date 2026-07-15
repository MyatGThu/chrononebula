/* The motion engine — pervasive, choreographed scroll animation.

   One system, three layers, all progressive enhancement (content is fully
   visible without it; nothing gates on a transition that could never fire):

   1. Reveals — every element enters with motion chosen for WHAT it is, not
      one uniform fade: headings unmask word-by-word, prose rises out of a
      soft blur, media wipes open behind a clip mask, cards lift in depth.
   2. Parallax — media and decorative layers drift at their own depth as the
      page scrolls, computed from cached offsets (no per-frame layout reads).
   3. Signature — the hero dissolves and lifts away as you leave it.

   Reduced motion collapses all of it to a gentle crossfade. */

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';   /* ease-out-expo */

/* what gets which entrance. Order matters: first match wins per element. */
const REVEAL_PLAN = [
  ['.page-hero h1, .manifesto-lede, .lumina-head h2, .agents-head h2, .method-head h2, .universe-head h2, .lab-head h2, .clans-head h2, .epilogue-line, .core-eyebrow', 'word'],
  ['main h2, main h3, .feature-copy h2', 'word'],
  ['.lumina-lede, .page-lede, .hero-tag, .manifesto-note, .feature-body, .agent-purpose, .clan-card .summary, .wing-note, .lab-text p, .first-collection p', 'blur'],
  ['.feature-media, .clan-card-media', 'mask'],
  ['.agent-card, .wing, .lab-cell, .first-collection, .lookbook-card, .clan-card, .feature', 'lift'],
  ['.console, .universe-stage, .method-cols, .ethos-grid', 'lift'],
  ['.framework li, .values li, .rules li, .lumina-traits li, .swatches li, .agent-outputs li, .clan-index-chip, .planet-chip', 'pop'],
  ['main p, .console-line, .feature-quote, blockquote, .btn, .wing-cta, .clan-runway-link', 'rise'],
];

/* inner media that drifts at depth inside its (overflow-hidden) frame */
const PARALLAX_MEDIA = '.feature-media img, .clan-card-media img, .lookbook-media img';

const isReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function assign(root, selector, kind) {
  root.querySelectorAll(selector).forEach((el) => {
    if (el.dataset.reveal || el.closest('#runway-drawer')) return;
    /* the home hero owns its own entrance + scroll-away; leave it alone */
    if (el.closest('.hero')) return;
    el.dataset.reveal = kind;
  });
}

/* group siblings so a grid/list enters as a rippling stagger */
function stagger(root) {
  const groups = new Map();
  root.querySelectorAll('[data-reveal]').forEach((el) => {
    const p = el.parentElement;
    const arr = groups.get(p) || [];
    arr.push(el);
    groups.set(p, arr);
  });
  for (const arr of groups.values()) {
    arr.forEach((el, i) => el.style.setProperty('--i', Math.min(i, 12)));
  }
}

/* split a heading into word masks; keeps text content intact for a11y */
function splitWords(el) {
  if (el.dataset.split || el.querySelector('.mo-w')) return;
  const walkText = [...el.childNodes].every((n) => n.nodeType === 3);
  if (!walkText) { el.dataset.split = 'skip'; el.dataset.reveal = 'blur'; return; }   /* rich markup: blur-reveal instead */
  el.dataset.split = '1';
  const words = el.textContent.split(/(\s+)/);
  el.textContent = '';
  let i = 0;
  for (const w of words) {
    if (w === '') continue;
    if (/^\s+$/.test(w)) { el.appendChild(document.createTextNode(' ')); continue; }
    const outer = document.createElement('span');
    outer.className = 'mo-w';
    const inner = document.createElement('span');
    inner.className = 'mo-wi';
    inner.textContent = w;
    inner.style.setProperty('--wi', i++);
    outer.appendChild(inner);
    el.appendChild(outer);
  }
}

export function initMotion(root = document) {
  const scope = root.querySelector ? root : document;
  const main = document.body;

  /* ---- reduced motion: a quiet crossfade, no transforms ------------- */
  if (isReduced()) {
    document.documentElement.classList.add('mo-reduce');
    for (const [sel] of REVEAL_PLAN) assign(main, sel, 'fade');
    document.querySelectorAll('.rv').forEach((el) => { if (!el.dataset.reveal) el.dataset.reveal = 'fade'; });
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) { e.target.classList.add('mo-in'); io.unobserve(e.target); }
    }, { threshold: 0, rootMargin: '0px 0px -5% 0px' });
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    let t = 0;
    const sweep = () => document.querySelectorAll('[data-reveal]:not(.mo-in)').forEach((el) => {
      if (el.getBoundingClientRect().top < innerHeight * 0.98) el.classList.add('mo-in');
    });
    addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(sweep, 110); }, { passive: true });
    setTimeout(sweep, 400);
    return;
  }

  document.documentElement.classList.add('mo');

  /* ---- annotate the DOM with varied entrances ---------------------- */
  for (const [sel, kind] of REVEAL_PLAN) assign(main, sel, kind);
  document.querySelectorAll('.rv').forEach((el) => { if (!el.dataset.reveal) el.dataset.reveal = 'rise'; });
  stagger(main);
  document.querySelectorAll('[data-reveal="word"]').forEach(splitWords);

  /* ---- reveal on enter -------------------------------------------- */
  /* threshold 0 fires the instant an element touches the viewport, which
     survives fast/jumpy scrolling far better than a ratio threshold. */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('mo-in');
      io.unobserve(e.target);
    }
  }, { threshold: 0, rootMargin: '0px 0px -5% 0px' });
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

  /* backstop: on every scroll-settle, reveal anything at or above the
     bottom edge that the observer missed — nothing can be left hidden.
     Only ever touches the shrinking set of not-yet-revealed elements. */
  let sweepT = 0;
  function sweep() {
    const vh = innerHeight;
    document.querySelectorAll('[data-reveal]:not(.mo-in)').forEach((el) => {
      if (el.getBoundingClientRect().top < vh * 0.98) { el.classList.add('mo-in'); io.unobserve(el); }
    });
  }
  addEventListener('scroll', () => { clearTimeout(sweepT); sweepT = setTimeout(sweep, 110); }, { passive: true });
  setTimeout(sweep, 400);   /* also settle whatever loaded in-view */

  /* ---- parallax + hero signature (single rAF, cached offsets) ------ */
  const media = [...document.querySelectorAll(PARALLAX_MEDIA)];
  media.forEach((el) => { el.dataset.parallax = ''; el.style.setProperty('--pscale', '1.18'); });
  const layers = media.map((el) => ({ el, top: 0, h: 0, range: 46 }));

  const hero = document.querySelector('.hero');
  const heroMedia = document.querySelector('.hero-stage');
  const heroCopy = document.querySelector('.hero-copy');

  function measure() {
    const sy = window.scrollY;
    for (const l of layers) {
      const r = l.el.getBoundingClientRect();
      l.top = r.top + sy;
      l.h = r.height;
    }
  }
  measure();
  addEventListener('resize', measure, { passive: true });
  addEventListener('load', measure, { passive: true });

  let lastY = -1;
  let raf = 0;
  let visible = true;

  function apply() {
    const sy = window.scrollY;
    if (sy !== lastY) {
      lastY = sy;
      const vh = innerHeight;
      for (const l of layers) {
        if (l.top + l.h < sy - vh || l.top > sy + vh * 2) continue;  /* offscreen */
        const p = (sy + vh - l.top) / (vh + l.h);                    /* 0..1 through view */
        l.el.style.setProperty('--par', `${(p - 0.5) * l.range}px`);
      }
      if (hero) {
        const hp = Math.min(1, sy / vh);                             /* 0 at top -> 1 gone */
        if (heroCopy) {
          heroCopy.style.setProperty('--hp', hp.toFixed(3));
        }
        if (heroMedia) heroMedia.style.setProperty('--hp', hp.toFixed(3));
      }
    }
    raf = requestAnimationFrame(apply);
  }
  raf = requestAnimationFrame(apply);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); visible = false; }
    else if (!visible) { visible = true; lastY = -1; raf = requestAnimationFrame(apply); }
  });
}

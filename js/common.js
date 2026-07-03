/* ChronoNebula — shared page chrome: navigation, scroll reveals,
   footer clock, and small helpers used by every page. Entry modules
   call initCommon() after they have rendered their dynamic content so
   the reveal observer sees the finished DOM. */

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function lazyInit(target, loader, margin = '600px') {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      loader();
    }
  }, { rootMargin: margin });
  io.observe(target);
}

export function initCommon() {
  /* ------------------------------------------------------------- nav -- */

  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  const sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;height:120px;width:1px;pointer-events:none;';
  document.body.prepend(sentinel);
  new IntersectionObserver(([entry]) => {
    nav.classList.toggle('scrolled', !entry.isIntersecting);
  }).observe(sentinel);

  navToggle.addEventListener('click', () => {
    const open = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!open));
    navLinks.classList.toggle('open', !open);
  });
  navLinks.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      navToggle.setAttribute('aria-expanded', 'false');
      navLinks.classList.remove('open');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) {
      navToggle.setAttribute('aria-expanded', 'false');
      navLinks.classList.remove('open');
      navToggle.focus();
    }
  });

  /* --------------------------------------------------------- reveals -- */

  const revealed = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('in');
      revealed.unobserve(entry.target);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  const groups = new Map();
  document.querySelectorAll('.rv').forEach((el) => {
    const parent = el.parentElement;
    const idx = groups.get(parent) ?? 0;
    groups.set(parent, idx + 1);
    el.style.setProperty('--rv-delay', `${Math.min(idx, 5) * 70}ms`);
    revealed.observe(el);
  });

  /* ---------------------------------------------------------- footer -- */

  const year = document.getElementById('footer-year');
  if (year) year.textContent = `${new Date().getFullYear()} on Earth. 8888 in the Nebula.`;
}

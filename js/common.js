/* ChronoNebula — shared page chrome: navigation, scroll reveals,
   footer clock, and small helpers used by every page. Entry modules
   call initCommon() after they have rendered their dynamic content so
   the reveal observer sees the finished DOM. */

import { initSmooth } from './smooth.js';
import { initMotion } from './motion.js';

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

  /* ------------------------------------------- scroll + motion engine -- */
  /* momentum scroll first (fine-pointer, non-reduced), then the pervasive
     reveal + parallax choreography over the finished DOM */
  initSmooth();
  initMotion();

  /* ---------------------------------------------------------- footer -- */

  const year = document.getElementById('footer-year');
  if (year) year.textContent = `${new Date().getFullYear()} on Earth. 8888 in the Nebula.`;
}

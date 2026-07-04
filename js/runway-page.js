/* Runway 8888 — page controller. Builds the lookbook grid from LOOKS;
   "Watch it woven" slides out the runway drawer where the atelier engine
   materializes the look. Deep links like runway.html#look-dragon-cypher
   open the drawer directly; arrow keys walk the looks while it is open. */

import { LOOKS } from './looks.js';
import { initCommon, reducedMotion, webglAvailable } from './common.js';

const stage = document.querySelector('.atelier-stage');
const canvas = document.getElementById('atelier-canvas');
const drawer = document.getElementById('runway-drawer');
const scrim = document.getElementById('runway-scrim');
const closeBtn = document.getElementById('runway-close');
const counter = document.getElementById('look-count');
const houseEl = document.getElementById('look-house');
const titleEl = document.getElementById('look-title');
const notesEl = document.getElementById('look-notes');
const materialsEl = document.getElementById('look-materials');
const swatchesEl = document.getElementById('look-swatches');

const hasWebGL = webglAvailable();

let atelierApi = null;
let index = 0;

const pad = (n) => String(n).padStart(2, '0');

/* -------------------------------------------------------------- panel -- */

function setLook(i, updateHash = true) {
  index = (i + LOOKS.length) % LOOKS.length;
  const look = LOOKS[index];

  counter.textContent = `Look ${pad(index + 1)} / ${pad(LOOKS.length)}`;
  houseEl.textContent = look.house;
  titleEl.textContent = look.title;
  notesEl.textContent = look.notes;
  materialsEl.textContent = look.materials;
  swatchesEl.innerHTML = look.colors
    ? look.colors.map((hex) => `<li><i style="background:${hex}"></i></li>`).join('')
    : '<li class="look-unknown">Palette unclassified</li>';

  if (atelierApi) atelierApi.setLook(look);
  if (!hasWebGL) {
    const g = look.colors ?? ['#8a7fae', '#c9b26b'];
    stage.style.setProperty('--fb1', g[2] ?? g[0]);
    stage.style.setProperty('--fb2', g[1]);
  }

  if (updateHash) history.replaceState(null, '', `#look-${look.id}`);
}

/* ------------------------------------------------------------- drawer -- */

let drawerOpen = false;
let lastTrigger = null;
let engineStarted = false;

/* the engine boots on first open — no point weaving behind a closed door */
function startEngine() {
  if (engineStarted) return;
  engineStarted = true;
  if (!hasWebGL) {
    stage.classList.add('no-webgl');
    return;
  }
  import('./atelier.js')
    .then(({ initAtelier }) => {
      atelierApi = initAtelier(canvas, { reduced: reducedMotion.matches });
      atelierApi.setLook(LOOKS[index]);
    })
    .catch(() => stage.classList.add('no-webgl'));
}

function openDrawer(trigger) {
  if (trigger) lastTrigger = trigger;
  if (drawerOpen) return;
  drawerOpen = true;
  drawer.classList.add('open');
  scrim.classList.add('on');
  document.documentElement.classList.add('drawer-lock');
  startEngine();
  closeBtn.focus({ preventScroll: true });
}

function closeDrawer() {
  if (!drawerOpen) return;
  drawerOpen = false;
  drawer.classList.remove('open');
  scrim.classList.remove('on');
  document.documentElement.classList.remove('drawer-lock');
  history.replaceState(null, '', location.pathname + location.search);
  if (lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true });
  lastTrigger = null;
}

closeBtn.addEventListener('click', closeDrawer);
scrim.addEventListener('click', closeDrawer);

document.getElementById('look-prev').addEventListener('click', () => setLook(index - 1));
document.getElementById('look-next').addEventListener('click', () => setLook(index + 1));
document.addEventListener('keydown', (e) => {
  if (!drawerOpen) return;
  if (e.key === 'Escape') { closeDrawer(); return; }
  if (e.target.closest('input, textarea')) return;
  if (e.key === 'ArrowLeft') setLook(index - 1);
  if (e.key === 'ArrowRight') setLook(index + 1);
});

/* keep focus inside the dialog while it is open */
drawer.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const focusables = drawer.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
  else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
});

function lookFromHash() {
  const id = location.hash.replace(/^#look-/, '');
  const i = LOOKS.findIndex((l) => l.id === id);
  return i >= 0 ? i : -1;
}
window.addEventListener('hashchange', () => {
  const i = lookFromHash();
  if (i < 0) return;
  setLook(i, false);
  openDrawer();
});

/* ----------------------------------------------------------- lookbook -- */

/* The collection, lined up: every photograph as a card. Hovering floats
   the image up and the loupe inspects it; choosing a card slides out
   the runway drawer where the look is woven. */
const grid = document.getElementById('lookbook-grid');

for (const [i, look] of LOOKS.entries()) {
  const card = document.createElement('article');
  card.className = 'lookbook-card rv';
  card.innerHTML = `
    <figure class="lookbook-media">
      <img src="${look.image}" alt="${look.title} — the ${look.house} look, worn by Melina Jones Voss"
           loading="lazy" width="720" height="1280">
    </figure>
    <div class="lookbook-info">
      <p class="lookbook-house">${look.house}</p>
      <h3>${look.title}</h3>
      <p class="lookbook-materials">${look.materials}</p>
      <button class="lookbook-watch" type="button" data-look-index="${i}">Watch it woven &#8599;</button>
    </div>`;
  grid.append(card);
}

grid.addEventListener('click', (e) => {
  const btn = e.target.closest('.lookbook-watch');
  if (!btn) return;
  setLook(Number(btn.dataset.lookIndex));
  openDrawer(btn);
});

/* card loupe (hover-capable pointers only — touch users have the stage) */
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const cardLoupe = document.createElement('div');
  cardLoupe.className = 'atelier-loupe lookbook-loupe';
  cardLoupe.setAttribute('aria-hidden', 'true');
  grid.append(cardLoupe);
  const CARD_ZOOM = 2.2;

  grid.addEventListener('mousemove', (e) => {
    const img = e.target.closest('.lookbook-media')?.querySelector('img');
    if (!img || !img.complete) { cardLoupe.classList.remove('on'); return; }
    const ib = img.getBoundingClientRect();
    const gb = grid.getBoundingClientRect();
    const px = e.clientX - ib.left;
    const py = e.clientY - ib.top;
    const rx = cardLoupe.offsetWidth / 2;
    const ry = cardLoupe.offsetHeight / 2;
    cardLoupe.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
    cardLoupe.style.backgroundSize = `${ib.width * CARD_ZOOM}px ${ib.height * CARD_ZOOM}px`;
    cardLoupe.style.backgroundPosition =
      `${-(px * CARD_ZOOM - rx)}px ${-(py * CARD_ZOOM - ry)}px`;
    cardLoupe.style.transform = `translate(${e.clientX - gb.left - rx}px, ${e.clientY - gb.top - ry}px)`;
    cardLoupe.classList.add('on');
  });
  grid.addEventListener('mouseleave', () => cardLoupe.classList.remove('on'));
}

/* -------------------------------------------------------------- loupe -- */

/* Couture inspection: once the weave has crystallized into the
   photograph, a loupe magnifies the actual image — hover with a mouse,
   press-and-hold on touch. While the stage is still particles the
   engine reports no rect and the loupe stays away. */
const LOUPE_ZOOM = 2.6;
const coarsePointer = matchMedia('(pointer: coarse)').matches;

const loupe = document.createElement('div');
loupe.className = 'atelier-loupe';
loupe.setAttribute('aria-hidden', 'true');
stage.append(loupe);

const hint = document.createElement('p');
hint.className = 'atelier-hint';
hint.textContent = coarsePointer
  ? 'Press and hold the look to inspect the weave'
  : 'Hover the look to inspect the weave';
stage.append(hint);
let hintDone = false;

function showLoupeAt(clientX, clientY) {
  const rect = atelierApi?.inspect();
  if (!rect) { hideLoupe(); return; }
  const cb = canvas.getBoundingClientRect();
  const px = clientX - cb.left;
  const py = clientY - cb.top;
  if (px < rect.x || px > rect.x + rect.w || py < rect.y || py > rect.y + rect.h) {
    hideLoupe();
    return;
  }
  const sb = stage.getBoundingClientRect();
  const rx = loupe.offsetWidth / 2;
  const ry = loupe.offsetHeight / 2;
  loupe.style.filter = `brightness(${rect.lift ?? 1})`;
  loupe.style.backgroundImage = `url("${LOOKS[index].image}")`;
  loupe.style.backgroundSize = `${rect.w * LOUPE_ZOOM}px ${rect.h * LOUPE_ZOOM}px`;
  loupe.style.backgroundPosition =
    `${-((px - rect.x) * LOUPE_ZOOM - rx)}px ${-((py - rect.y) * LOUPE_ZOOM - ry)}px`;
  loupe.style.transform = `translate(${clientX - sb.left - rx}px, ${clientY - sb.top - ry}px)`;
  loupe.classList.add('on');
  if (!hintDone) { hintDone = true; hint.classList.remove('on'); }
}
const hideLoupe = () => loupe.classList.remove('on');

/* touch: a long-press latches the loupe; scrolling before the latch
   cancels it, and while latched the page must not pan */
let pressTimer = 0;
let latched = false;
let downX = 0;
let downY = 0;

canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return;
  downX = e.clientX; downY = e.clientY;
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => { latched = true; showLoupeAt(downX, downY); }, 380);
});
canvas.addEventListener('touchmove', (e) => { if (latched) e.preventDefault(); }, { passive: false });
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') { showLoupeAt(e.clientX, e.clientY); return; }
  if (!latched) {
    if (pressTimer && Math.hypot(e.clientX - downX, e.clientY - downY) > 12) {
      clearTimeout(pressTimer);
      pressTimer = 0;
    }
    return;
  }
  showLoupeAt(e.clientX, e.clientY);
});
const endPress = () => { clearTimeout(pressTimer); pressTimer = 0; latched = false; hideLoupe(); };
canvas.addEventListener('pointerup', endPress);
canvas.addEventListener('pointercancel', endPress);
canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hideLoupe(); });
canvas.addEventListener('contextmenu', (e) => { if (coarsePointer) e.preventDefault(); });

/* surface the hint the first time a photograph settles */
const hintPoll = setInterval(() => {
  if (hintDone) { clearInterval(hintPoll); return; }
  if (atelierApi?.inspect()) {
    hint.classList.add('on');
    setTimeout(() => { hintDone = true; hint.classList.remove('on'); }, 6000);
    clearInterval(hintPoll);
  }
}, 600);

/* --------------------------------------------------------------- init -- */

const initial = lookFromHash();
setLook(Math.max(0, initial), false);
if (initial >= 0) openDrawer();     /* deep link: straight onto the runway */
initCommon();

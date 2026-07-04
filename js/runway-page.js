/* Runway 8888 — page controller. Builds the look rail and detail panel
   from LOOKS, drives the atelier engine, and supports deep links like
   runway.html#look-dragon-cypher plus arrow-key navigation. */

import { LOOKS } from './looks.js';
import { initCommon, reducedMotion, webglAvailable, lazyInit } from './common.js';

const stage = document.querySelector('.atelier-stage');
const canvas = document.getElementById('atelier-canvas');
const chips = document.getElementById('runway-chips');
const counter = document.getElementById('look-count');
const houseEl = document.getElementById('look-house');
const titleEl = document.getElementById('look-title');
const notesEl = document.getElementById('look-notes');
const materialsEl = document.getElementById('look-materials');
const swatchesEl = document.getElementById('look-swatches');

let atelierApi = null;
let index = 0;

const pad = (n) => String(n).padStart(2, '0');

/* ------------------------------------------------------------- chips -- */

for (const [i, look] of LOOKS.entries()) {
  const chip = document.createElement('button');
  chip.className = 'runway-chip';
  chip.dataset.look = look.id;
  chip.setAttribute('aria-pressed', 'false');
  const g = look.colors ?? ['#3a3444', '#6b5f8a', '#2b3a37'];
  chip.innerHTML = `<i style="--g1:${g[0]};--g2:${g[2]};--g3:${g[3] ?? g[1]}" aria-hidden="true"></i>${look.house}`;
  chip.addEventListener('click', () => setLook(i));
  chips.append(chip);
}

/* -------------------------------------------------------------- panel -- */

function setLook(i, updateHash = true) {
  index = (i + LOOKS.length) % LOOKS.length;
  const look = LOOKS[index];

  chips.querySelectorAll('.runway-chip').forEach((c) => {
    c.setAttribute('aria-pressed', String(c.dataset.look === look.id));
  });

  /* when the rail scrolls (phones), keep the chosen house centered */
  if (chips.scrollWidth > chips.clientWidth) {
    const active = chips.querySelector(`[data-look="${look.id}"]`);
    if (active) {
      chips.scrollTo({
        left: active.offsetLeft - chips.clientWidth / 2 + active.offsetWidth / 2,
        behavior: reducedMotion.matches ? 'auto' : 'smooth',
      });
    }
  }

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

document.getElementById('look-prev').addEventListener('click', () => setLook(index - 1));
document.getElementById('look-next').addEventListener('click', () => setLook(index + 1));
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea')) return;
  if (e.key === 'ArrowLeft') setLook(index - 1);
  if (e.key === 'ArrowRight') setLook(index + 1);
});

function lookFromHash() {
  const id = location.hash.replace(/^#look-/, '');
  const i = LOOKS.findIndex((l) => l.id === id);
  return i >= 0 ? i : 0;
}
window.addEventListener('hashchange', () => setLook(lookFromHash(), false));

/* ----------------------------------------------------------- lookbook -- */

/* The collection, lined up: every photograph as a card. Hovering floats
   the image up and the loupe inspects it; choosing a card sends the
   look up to the stage to be woven. */
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
  stage.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
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
    const r = cardLoupe.offsetWidth / 2;
    cardLoupe.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
    cardLoupe.style.backgroundSize = `${ib.width * CARD_ZOOM}px ${ib.height * CARD_ZOOM}px`;
    cardLoupe.style.backgroundPosition =
      `${-(px * CARD_ZOOM - r)}px ${-(py * CARD_ZOOM - r)}px`;
    cardLoupe.style.transform = `translate(${e.clientX - gb.left - r}px, ${e.clientY - gb.top - r}px)`;
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
  const r = loupe.offsetWidth / 2;
  loupe.style.filter = `brightness(${rect.lift ?? 1})`;
  loupe.style.backgroundImage = `url("${LOOKS[index].image}")`;
  loupe.style.backgroundSize = `${rect.w * LOUPE_ZOOM}px ${rect.h * LOUPE_ZOOM}px`;
  loupe.style.backgroundPosition =
    `${-((px - rect.x) * LOUPE_ZOOM - r)}px ${-((py - rect.y) * LOUPE_ZOOM - r)}px`;
  loupe.style.transform = `translate(${clientX - sb.left - r}px, ${clientY - sb.top - r}px)`;
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

/* -------------------------------------------------------------- stage -- */

const hasWebGL = webglAvailable();

if (hasWebGL) {
  lazyInit(stage, () => {
    import('./atelier.js')
      .then(({ initAtelier }) => {
        atelierApi = initAtelier(canvas, { reduced: reducedMotion.matches });
        atelierApi.setLook(LOOKS[index]);
      })
      .catch(() => stage.classList.add('no-webgl'));
  });
} else {
  stage.classList.add('no-webgl');
}

setLook(lookFromHash(), false);
initCommon();

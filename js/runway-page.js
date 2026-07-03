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
const photoEl = document.getElementById('look-photo');

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

  counter.textContent = `Look ${pad(index + 1)} / ${pad(LOOKS.length)}`;
  houseEl.textContent = look.house;
  titleEl.textContent = look.title;
  notesEl.textContent = look.notes;
  materialsEl.textContent = look.materials;
  swatchesEl.innerHTML = look.colors
    ? look.colors.map((hex) => `<li><i style="background:${hex}"></i></li>`).join('')
    : '<li class="look-unknown">Palette unclassified</li>';
  photoEl.src = look.image;
  photoEl.alt = `${look.title} — the ${look.house} look, atelier photograph`;

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

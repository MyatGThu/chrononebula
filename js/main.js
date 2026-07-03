/* ChronoNebula — home page orchestration. WebGL set-pieces are
   lazy-loaded when their sections approach the viewport, pause while
   offscreen, and degrade to static art when WebGL or motion is
   unavailable. The clans codex and Runway 8888 live on their own
   pages (clans.html, runway.html). */

import { PLANETS, clanById } from './data.js';
import { initCommon, reducedMotion, webglAvailable, lazyInit } from './common.js';

/* ------------------------------------------------------ universe: panel -- */

const planetChips = document.getElementById('universe-planets');
const planetInfo = document.getElementById('universe-info');
const universeStatus = document.getElementById('universe-status');
let galaxyApi = null;
let currentPlanetId = 'achronox';

for (const planet of PLANETS) {
  const chip = document.createElement('button');
  chip.className = 'planet-chip';
  chip.textContent = planet.name;
  chip.dataset.planet = planet.id;
  chip.setAttribute('aria-pressed', 'false');
  chip.addEventListener('click', () => selectPlanet(planet.id, true));
  planetChips.append(chip);
}

function selectPlanet(id, fromUser = false) {
  const planet = PLANETS.find((p) => p.id === id);
  if (!planet) return;
  currentPlanetId = id;

  planetChips.querySelectorAll('.planet-chip').forEach((c) => {
    c.setAttribute('aria-pressed', String(c.dataset.planet === id));
  });

  const clanLinks = planet.clans
    .map((cid) => {
      const clan = clanById(cid);
      const mini = clan.palette
        ? clan.palette.slice(0, 5).map((c) => `<i style="background:${c.hex}"></i>`).join('')
        : '';
      return `<a class="planet-clan" href="clans.html#clan-${cid}">
        <span>${clan.name}</span>
        <span class="mini-swatches" aria-hidden="true">${mini}</span>
      </a>`;
    })
    .join('');

  planetInfo.innerHTML = `
    <h3>${planet.name}</h3>
    <p class="planet-tone">${planet.tone}</p>
    ${clanLinks}`;

  if (universeStatus) {
    const clanNames = planet.clans.map((cid) => clanById(cid).name).join(' and ');
    universeStatus.textContent = `${planet.name} selected. Home of ${clanNames}.`;
  }

  if (fromUser && galaxyApi) galaxyApi.focusPlanet(id);
}

selectPlanet('achronox');

/* ------------------------------------------------- lazy WebGL set-pieces -- */

const hasWebGL = webglAvailable();

/* Hero particles */
const heroCanvas = document.getElementById('hero-canvas');
if (hasWebGL && !reducedMotion.matches) {
  import('./hero.js')
    .then(({ initHero }) => initHero(heroCanvas))
    .catch(() => heroCanvas.remove());
} else {
  heroCanvas.remove();
}

/* Galaxy map */
const galaxyCanvas = document.getElementById('galaxy-canvas');
const labelLayer = document.getElementById('universe-labels');
if (hasWebGL) {
  lazyInit(document.getElementById('universe'), () => {
    import('./galaxy.js')
      .then(({ initGalaxy }) => {
        galaxyApi = initGalaxy({
          canvas: galaxyCanvas,
          labelLayer,
          reduced: reducedMotion.matches,
          onSelect: (id) => selectPlanet(id, false),
        });
        galaxyApi.focusPlanet(currentPlanetId);
      })
      .catch(() => galaxyCanvas.remove());
  });
} else {
  galaxyCanvas.remove();
}

/* Lab tiles */
lazyInit(document.getElementById('lab'), () => {
  import('./lab.js').then(({ initLab }) => {
    initLab(document.querySelectorAll('.lab-cell[data-sim]'), reducedMotion.matches);
  }).catch(() => {});
});

initCommon();

/* ChronoNebula — page orchestration.
   WebGL set-pieces are lazy-loaded when their sections approach the
   viewport, pause while offscreen, and degrade to static art when
   WebGL or motion is unavailable. */

import { PLANETS, CLANS, clanById, BRAND } from './data.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

/* ------------------------------------------------------------------ nav -- */

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

/* -------------------------------------------------------------- reveals -- */

{
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
}

/* ------------------------------------------------------------- swatches -- */

function swatchItems(clan) {
  if (!clan.palette) return '';
  return clan.palette
    .map(
      (c) =>
        `<li><i style="background:${c.hex}"></i>${c.name}</li>`
    )
    .join('');
}

document.querySelectorAll('.swatches[data-clan]').forEach((ul) => {
  const clan = clanById(ul.dataset.clan);
  if (!clan) return;
  ul.innerHTML = swatchItems(clan);
  ul.setAttribute('aria-label', `${clan.name} official palette`);
});

/* --------------------------------------------------------------- ledger -- */

const ledger = document.getElementById('clan-ledger');

for (const clan of CLANS) {
  const li = document.createElement('li');
  li.className = 'ledger-item' + (clan.unknown ? ' unknown' : '');
  li.id = `clan-${clan.id}`;

  const dots = clan.palette
    ? clan.palette.map((c) => `<i style="background:${c.hex}" title="${c.name}"></i>`).join('')
    : '<i></i><i></i><i></i><i></i><i></i>';

  const washVars = clan.palette
    ? `--c1:${clan.palette[0].hex};--c2:${clan.palette[1].hex};--c3:${clan.palette[2].hex};`
    : '--c3:#3a3444;';

  const detailMeta = `
    <dl>
      <dt>Planet</dt><dd>${clan.planet}</dd>
      <dt>Capital</dt><dd>${clan.capital}</dd>
      <dt>Leader</dt><dd>${clan.leader}</dd>
    </dl>`;

  const paletteList = clan.palette
    ? `<ul class="swatches" aria-label="${clan.name} official palette">${swatchItems(clan)}</ul>`
    : `<p class="summary">Palette unclassified. The Apex reveal themselves only to the future.</p>`;

  li.innerHTML = `
    <button class="ledger-row" style="${washVars}" aria-expanded="false" aria-controls="detail-${clan.id}">
      <span class="ledger-name">${clan.name}</span>
      <span class="ledger-planet">${clan.planet}</span>
      <span class="ledger-essence">${clan.essence}</span>
      <span class="ledger-dots" aria-hidden="true">${dots}</span>
      <span class="ledger-more" aria-hidden="true">+</span>
    </button>
    <div class="ledger-detail" id="detail-${clan.id}">
      <div>
        <div class="ledger-detail-inner">
          <div>
            ${clan.motto ? `<p class="motto">&ldquo;${clan.motto}&rdquo;</p>` : ''}
            <p class="summary">${clan.summary}</p>
          </div>
          <div>
            ${detailMeta}
            ${paletteList}
          </div>
        </div>
      </div>
    </div>`;

  ledger.append(li);
}

ledger.addEventListener('click', (e) => {
  const row = e.target.closest('.ledger-row');
  if (!row) return;
  const expanded = row.getAttribute('aria-expanded') === 'true';
  row.setAttribute('aria-expanded', String(!expanded));
  row.nextElementSibling.classList.toggle('open', !expanded);
});

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

  const clanButtons = planet.clans
    .map((cid) => {
      const clan = clanById(cid);
      const mini = clan.palette
        ? clan.palette.slice(0, 5).map((c) => `<i style="background:${c.hex}"></i>`).join('')
        : '';
      return `<button class="planet-clan" data-clan="${cid}">
        <span>${clan.name}</span>
        <span class="mini-swatches" aria-hidden="true">${mini}</span>
      </button>`;
    })
    .join('');

  planetInfo.innerHTML = `
    <h3>${planet.name}</h3>
    <p class="planet-tone">${planet.tone}</p>
    ${clanButtons}`;

  planetInfo.querySelectorAll('.planet-clan').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(`clan-${btn.dataset.clan}`);
      if (!target) return;
      const row = target.querySelector('.ledger-row');
      row.setAttribute('aria-expanded', 'true');
      target.querySelector('.ledger-detail').classList.add('open');
      row.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center' });
    });
  });

  if (universeStatus) {
    const clanNames = planet.clans.map((cid) => clanById(cid).name).join(' and ');
    universeStatus.textContent = `${planet.name} selected. Home of ${clanNames}.`;
  }

  if (fromUser && galaxyApi) galaxyApi.focusPlanet(id);
}

selectPlanet('achronox');

/* ------------------------------------------------- lazy WebGL set-pieces -- */

function lazyInit(target, loader, margin = '600px') {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      loader();
    }
  }, { rootMargin: margin });
  io.observe(target);
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

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

/* Runway figure */
const runwayCanvas = document.getElementById('runway-canvas');
const runwayStage = document.querySelector('.runway-stage');
const runwayChips = document.getElementById('runway-chips');
const runwayCurrent = document.getElementById('runway-current');
let runwayApi = null;

const BRAND_LOOK = {
  id: 'chrononebula',
  name: 'ChronoNebula',
  colors: [BRAND.palette.nebulaEmerald, BRAND.palette.lunarWhite, BRAND.palette.chromeSilver, BRAND.palette.novaGold, BRAND.palette.cosmicBlue],
};

function runwayLooks() {
  const looks = [BRAND_LOOK];
  for (const clan of CLANS) {
    looks.push({
      id: clan.id,
      name: clan.name,
      prismatic: !!clan.unknown,
      colors: clan.palette ? clan.palette.map((c) => c.hex) : null,
    });
  }
  return looks;
}

for (const look of runwayLooks()) {
  const chip = document.createElement('button');
  chip.className = 'runway-chip';
  chip.dataset.look = look.id;
  chip.setAttribute('aria-pressed', String(look.id === 'chrononebula'));
  const g = look.colors ?? ['#3a3444', '#6b5f8a', '#2b3a37'];
  chip.innerHTML = `<i style="--g1:${g[0]};--g2:${g[2]};--g3:${g[3] ?? g[1]}" aria-hidden="true"></i>${look.name}`;
  chip.addEventListener('click', () => setLook(look));
  runwayChips.append(chip);
}

let currentLook = BRAND_LOOK;

function setLook(look) {
  currentLook = look;
  runwayChips.querySelectorAll('.runway-chip').forEach((c) => {
    c.setAttribute('aria-pressed', String(c.dataset.look === look.id));
  });
  runwayCurrent.textContent = look.name;
  if (runwayApi) runwayApi.setLook(look);
  if (!hasWebGL) {
    const g = look.colors ?? ['#8a7fae', '#c9b26b'];
    runwayStage.style.setProperty('--fb1', g[2] ?? g[0]);
    runwayStage.style.setProperty('--fb2', g[1]);
  }
}

if (hasWebGL) {
  lazyInit(runwayStage, () => {
    import('./runway.js')
      .then(({ initRunway }) => {
        runwayApi = initRunway(runwayCanvas, { reduced: reducedMotion.matches });
        runwayApi.setLook(currentLook);
      })
      .catch(() => runwayStage.classList.add('no-webgl'));
  });
} else {
  runwayStage.classList.add('no-webgl');
}

/* Lab tiles */
lazyInit(document.getElementById('lab'), () => {
  import('./lab.js').then(({ initLab }) => {
    initLab(document.querySelectorAll('.lab-cell[data-sim]'), reducedMotion.matches);
  }).catch(() => {});
});

/* --------------------------------------------------------------- footer -- */

document.getElementById('footer-year').textContent =
  `${new Date().getFullYear()} on Earth. 8888 in the Nebula.`;

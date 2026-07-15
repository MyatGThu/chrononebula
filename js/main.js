/* ChronoNebula — home page orchestration. WebGL set-pieces are
   lazy-loaded when their sections approach the viewport, pause while
   offscreen, and degrade to static art when WebGL or motion is
   unavailable. The clans codex and Runway 8888 live on their own
   pages (clans.html, runway.html). */

import {
  PLANETS, clanById,
  LUMINA, AGENTS, COLLECTION_FRAMEWORK, GARMENT_FRAMEWORK, VALUES, RULES,
} from './data.js';
import { initCommon, reducedMotion, webglAvailable, lazyInit } from './common.js';

/* --------------------------------------------------- Quantum Lumina AI -- */
/* Render the spec-driven content (personality, activation prompt, the six
   agents, the frameworks, values and rules) from data.js before
   initCommon() so the reveal observer sees the finished DOM. */

const setList = (id, html) => {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
};

setList('lumina-traits', LUMINA.traits.map((t) => `<li>${t}</li>`).join(''));

setList('lumina-activation',
  LUMINA.activation.map((line, i) =>
    `<p class="console-line"><span class="console-prompt" aria-hidden="true">${i === 0 ? '&gt;' : '&middot;'}</span>${line}</p>`
  ).join(''));

setList('agents-grid', AGENTS.map((a) => `
  <article class="agent-card rv">
    <p class="agent-n">${a.n}</p>
    <h3>${a.name}</h3>
    <p class="agent-purpose">${a.purpose}</p>
    <ul class="agent-outputs">${a.outputs.map((o) => `<li>${o}</li>`).join('')}</ul>
  </article>`).join(''));

setList('collection-framework', COLLECTION_FRAMEWORK.map((s) => `<li>${s}</li>`).join(''));
setList('garment-framework', GARMENT_FRAMEWORK.map((s) => `<li>${s}</li>`).join(''));
setList('values-list', VALUES.map((v) => `<li>${v}</li>`).join(''));
setList('rules-list', RULES.map((r) => `<li>${r}</li>`).join(''));

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

/* The campaign rotates: six shots of Melina crossfade on the hero.
   Frame one is the static LCP image; the rest are created lazily just
   before their turn so they never race the first paint. Reduced motion
   keeps the single still. */
const HERO_SHOTS = [
  'assets/hero/hero-aurora.jpg',
  'assets/hero/hero-procession.jpg',
  'assets/hero/hero-constellation.jpg',
  'assets/hero/hero-profile.jpg',
  'assets/hero/hero-molten.jpg',
];
const heroMedia = document.querySelector('.hero-media');
const heroStill = document.querySelector('.hero-img');
if (heroMedia && heroStill && !reducedMotion.matches) {
  const frames = [heroStill];
  let current = 0;
  let heroVisible = true;
  const heroIO = new IntersectionObserver((entries) => {
    heroVisible = entries[entries.length - 1].isIntersecting;
  });
  heroIO.observe(heroMedia);

  const frameFor = (i) => {
    if (frames[i]) return frames[i];
    const img = document.createElement('img');
    img.className = 'hero-img hero-frame';
    img.src = HERO_SHOTS[i - 1];
    img.alt = '';
    img.decoding = 'async';
    /* insert right after the still so canvas + grade stay on top */
    heroStill.after(img);
    frames[i] = img;
    return img;
  };

  setInterval(() => {
    if (!heroVisible || document.hidden) return;
    const next = (current + 1) % (HERO_SHOTS.length + 1);
    frameFor(next);
    frameFor((next + 1) % (HERO_SHOTS.length + 1));   /* warm the one after */
    requestAnimationFrame(() => {
      heroStill.classList.toggle('dim', next !== 0);
      for (let i = 1; i < frames.length; i++) {
        frames[i]?.classList.toggle('on', i === next);
      }
      current = next;
    });
  }, 7000);
}

/* Hero particles: decorative, so the 3D module waits for an idle
   moment instead of racing the LCP image and fonts for bandwidth */
const heroCanvas = document.getElementById('hero-canvas');
if (hasWebGL && !reducedMotion.matches) {
  const loadHero = () => {
    import('./hero.js')
      .then(({ initHero }) => initHero(heroCanvas))
      .catch(() => heroCanvas.remove());
  };
  if ('requestIdleCallback' in window) requestIdleCallback(loadHero, { timeout: 2500 });
  else setTimeout(loadHero, 350);
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

/* Chrono Core — the scroll-scrubbed 3D centerpiece. Booted lazily just
   before the section arrives; initCore renders a settled static frame when
   reduced motion is set, and the CSS fallback stands in without WebGL. */
const coreSection = document.getElementById('core');
const coreCanvas = document.getElementById('core-canvas');
if (coreSection && coreCanvas) {
  if (hasWebGL) {
    lazyInit(coreSection, () => {
      import('./core.js')
        .then(({ initCore }) => initCore(coreCanvas, {
          section: coreSection,
          reduced: reducedMotion.matches,
        }))
        .catch(() => coreSection.classList.add('no-webgl'));
    }, '300px');
  } else {
    coreSection.classList.add('no-webgl');
  }
}

/* Aurora — an emerald curtain that breathes behind the manifesto */
const auroraCanvas = document.getElementById('aurora-canvas');
const manifesto = document.getElementById('manifesto');
if (auroraCanvas && manifesto && hasWebGL) {
  lazyInit(manifesto, () => {
    import('./aurora.js')
      .then(({ initAurora }) => initAurora(auroraCanvas, { reduced: reducedMotion.matches }))
      .catch(() => auroraCanvas.remove());
  }, '200px');
} else if (auroraCanvas) {
  auroraCanvas.remove();
}

/* Finale — the epilogue collapses into a single point of light */
const finaleCanvas = document.getElementById('finale-canvas');
const epilogue = document.getElementById('epilogue');
if (finaleCanvas && epilogue && hasWebGL) {
  lazyInit(epilogue, () => {
    import('./finale.js')
      .then(({ initFinale }) => initFinale(finaleCanvas, { section: epilogue, reduced: reducedMotion.matches }))
      .catch(() => finaleCanvas.remove());
  }, '300px');
} else if (finaleCanvas) {
  finaleCanvas.remove();
}

/* The laboratory tiles (inside the Quantum Lumina AI section) */
const labHost = document.getElementById('lumina');
if (labHost) {
  lazyInit(labHost, () => {
    import('./lab.js').then(({ initLab }) => {
      initLab(document.querySelectorAll('.lab-cell[data-sim]'), reducedMotion.matches);
    }).catch(() => {});
  });
}

initCommon();

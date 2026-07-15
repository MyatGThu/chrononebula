/* Clans page — renders the full codex: one card per house, with motto,
   summary, meta, official palette, and a link to its Runway 8888 look.
   Rendering happens before initCommon() so the reveal observer sees
   every card. */

import { CLANS, clanById } from './data.js';
import { initCommon, reducedMotion, webglAvailable } from './common.js';

/* the persistent depth void, so the codex floats in the same space as the
   landing (booted at idle; static frame under reduced motion; removed with
   no WebGL and the obsidian base stands in) */
const depthCanvas = document.getElementById('depth-canvas');
if (depthCanvas && webglAvailable()) {
  const loadDepth = () => import('./depth.js')
    .then(({ initDepth }) => initDepth(depthCanvas, { reduced: reducedMotion.matches }))
    .catch(() => depthCanvas.remove());
  if ('requestIdleCallback' in window) requestIdleCallback(loadDepth, { timeout: 2200 });
  else setTimeout(loadDepth, 420);
} else if (depthCanvas) {
  depthCanvas.remove();
}

function swatchItems(clan) {
  if (!clan.palette) return '';
  return clan.palette
    .map((c) => `<li><i style="background:${c.hex}"></i>${c.name}</li>`)
    .join('');
}

/* Each house is drawn as a vector crest generated from its official Codex
   palette: a ring of colour-segments (one arc per palette colour), concentric
   palette rings, a tilted orbit, and a heart of accent light. No photograph —
   pure vector, unique to every clan's colours. */
function clanCrest(clan) {
  const cols = (clan.palette || []).map((c) => c.hex).slice(0, 5);
  const pal = cols.length ? cols : ['#2E2E2E', '#014D40', '#C0C0C0'];
  const cx = 200, cy = 200, N = pal.length, seg = (2 * Math.PI) / N, gap = 0.1, R = 152;
  const arcs = pal.map((hex, i) => {
    const a0 = -Math.PI / 2 + i * seg + gap / 2;
    const a1 = -Math.PI / 2 + (i + 1) * seg - gap / 2;
    const x0 = (cx + Math.cos(a0) * R).toFixed(1), y0 = (cy + Math.sin(a0) * R).toFixed(1);
    const x1 = (cx + Math.cos(a1) * R).toFixed(1), y1 = (cy + Math.sin(a1) * R).toFixed(1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `<path d="M${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}" fill="none" stroke="${hex}" stroke-width="7" stroke-linecap="round"/>`;
  }).join('');
  const inner = pal.slice(0, 3).map((hex, i) =>
    `<circle cx="${cx}" cy="${cy}" r="${112 - i * 27}" fill="none" stroke="${hex}" stroke-width="1.5" stroke-opacity="0.72"/>`
  ).join('');
  const accent = pal[1] || pal[0];
  return `<svg class="crest" viewBox="0 0 400 400" role="img" aria-hidden="true">
    <circle class="crest-spin" cx="${cx}" cy="${cy}" r="184" fill="none" stroke="var(--chrome)" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="1 8"/>
    <g class="crest-arcs">${arcs}</g>
    ${inner}
    <g stroke="var(--chrome)" stroke-opacity="0.12"><line x1="200" y1="34" x2="200" y2="366"/><line x1="34" y1="200" x2="366" y2="200"/></g>
    <ellipse class="crest-orbit" cx="200" cy="200" rx="150" ry="52" fill="none" stroke="${accent}" stroke-opacity="0.5" stroke-width="1.2" transform="rotate(-20 200 200)"/>
    <circle cx="200" cy="200" r="26" fill="none" stroke="${accent}" stroke-opacity="0.85" stroke-width="1.5"/>
    <circle class="crest-core" cx="200" cy="200" r="12" fill="${accent}"/>
  </svg>`;
}

/* swap the two featured clans' photographs for their vector crests */
document.querySelectorAll('.feature[id^="clan-"]').forEach((art) => {
  const clan = clanById(art.id.replace('clan-', ''));
  const media = art.querySelector('.feature-media');
  if (!clan || !clan.palette || !media) return;
  media.classList.add('clan-crest-media');
  media.style.cssText = `--c1:${clan.palette[0].hex};--c2:${clan.palette[1].hex};--c3:${clan.palette[2].hex};`;
  media.innerHTML = `<div class="clan-crest">${clanCrest(clan)}</div>`;
});

/* featured swatch strips (Black Chronoa, White Nova) */
document.querySelectorAll('.swatches[data-clan]').forEach((ul) => {
  const clan = clanById(ul.dataset.clan);
  if (!clan) return;
  ul.innerHTML = swatchItems(clan);
  ul.setAttribute('aria-label', `${clan.name} official palette`);
});

/* jump index */
const indexNav = document.getElementById('clan-index');
indexNav.innerHTML = CLANS
  .map((clan) => `<a class="clan-index-chip" href="#clan-${clan.id}">${clan.name}</a>`)
  .join('');

/* the codex: every clan except the two given the featured treatment
   above, so no house appears twice on the page */
const FEATURED = new Set(['black-chronoa', 'white-nova']);
const codex = document.getElementById('clan-codex');

for (const clan of CLANS) {
  if (FEATURED.has(clan.id)) continue;
  const card = document.createElement('article');
  card.className = 'clan-card rv' + (clan.unknown ? ' unknown' : '');
  card.id = `clan-${clan.id}`;

  const washVars = clan.palette
    ? `--c1:${clan.palette[0].hex};--c2:${clan.palette[1].hex};--c3:${clan.palette[2].hex};`
    : '--c3:#3a3444;';
  card.style.cssText = washVars;

  const paletteBlock = clan.palette
    ? `<ul class="swatches" aria-label="${clan.name} official palette">${swatchItems(clan)}</ul>`
    : `<p class="summary">Palette unclassified. The Apex reveal themselves only to the future.</p>`;

  card.innerHTML = `
    <figure class="clan-card-media clan-crest-media">
      <div class="clan-crest">${clanCrest(clan)}</div>
    </figure>
    <div class="clan-card-content">
      <header class="clan-card-head">
        <p class="clan-kicker">${clan.planet} · ${clan.capital}</p>
        <h2>${clan.name}</h2>
        <p class="clan-essence">${clan.essence}</p>
      </header>
      <div class="clan-card-body">
        <div>
          ${clan.motto ? `<p class="motto">&ldquo;${clan.motto}&rdquo;</p>` : ''}
          <p class="summary">${clan.summary}</p>
        </div>
        <div>
          <dl>
            <dt>Planet</dt><dd>${clan.planet}</dd>
            <dt>Capital</dt><dd>${clan.capital}</dd>
            <dt>Leader</dt><dd>${clan.leader}</dd>
          </dl>
          ${paletteBlock}
          <a class="clan-runway-link" href="runway.html#look-${clan.id}">See the ${clan.name} look on Runway 8888 &rarr;</a>
        </div>
      </div>
    </div>`;

  codex.append(card);
}

/* smooth-scroll for the jump index (respects reduced motion) */
indexNav.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#clan-"]');
  if (!link) return;
  const target = document.getElementById(link.getAttribute('href').slice(1));
  if (!target) return;
  e.preventDefault();
  history.replaceState(null, '', link.getAttribute('href'));
  target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
});

initCommon();

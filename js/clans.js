/* Clans page — renders the full codex: one card per house, with motto,
   summary, meta, official palette, and a link to its Runway 8888 look.
   Rendering happens before initCommon() so the reveal observer sees
   every card. */

import { CLANS, clanById } from './data.js';
import { initCommon, reducedMotion } from './common.js';

function swatchItems(clan) {
  if (!clan.palette) return '';
  return clan.palette
    .map((c) => `<li><i style="background:${c.hex}"></i>${c.name}</li>`)
    .join('');
}

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

/* the codex plates: a portrait of each clan's leader, dressed in the
   clan's own palette and fashion ideology, alt text in the voice of
   the atlas */
const SCENES = {
  'black-chronoa': 'Queen Ani Thu Zard of the Black Chronoa, crowned in obsidian and chrono-gold before the First Monolith',
  'white-nova': 'The architect-priestess of White Nova in absolute white, avatar of NEXUS, before the spires of Nova Nexus',
  'rogue-lunaris': 'The High Moon Oracle of Rogue Lunaris, veiled in rouge crimson beneath the eclipsed moon',
  'lumina': 'The High Luminary of Lumina in celestial white and astral gold, crowned by twin rings of time',
  'solar-punk': 'The Solar Punk matriarch in living gold-and-leaf couture above the gardens of Neon Metro',
  'cyberpunk': 'A Cyberpunk netrunner leader in carbon-black armor lit cyber-blue and magenta in the Neon Abyss',
  'chrono-punk': 'The Chrono Punk nomad chieftain in salvaged patchwork armor before the chrono-monuments of Yangon',
  'ocean-void': 'A Tide Council elder of Ocean Void in lymnora-cyan water-silk beneath the living sea',
  'black-order': 'A Grand Commander of the Black Order in obsidian plate before the Cathedral fortress',
  'dragon-cypher': 'A Dragon Cypher forge-master in ember-shedding forge-silk above the magma of Benoth',
  'martian-clan': 'A councillor of the Martian Clan in a rust-dyed duster amid the canyon dust of Zylo',
  'bio-punk': 'A Circle of Growth leader of Bio Punk in a living bloom-gown before the Verdantia Arcology',
  'apex': 'The unrevealed leader of the Apex: a prismatic silhouette that refuses a single color',
};

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
    <figure class="clan-card-media">
      <img src="assets/clans/${clan.id}.jpg" alt="${SCENES[clan.id] ?? ''}"
           loading="lazy" width="960" height="540">
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

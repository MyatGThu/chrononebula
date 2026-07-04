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

/* the codex plates: one establishing shot per world, alt text in the
   voice of the atlas */
const SCENES = {
  'black-chronoa': 'Cindra: the First Monolith rising over the ceremonial city, chrono-gold seams alight',
  'white-nova': 'Nova Nexus: white crystalline towers veined with nova-core cyan',
  'rogue-lunaris': 'Moonlight Luna: the temple city beneath the eclipsed moon, crimson banners in pearl light',
  'lumina': 'Zemo: rings of time orbiting the white-and-gold spires',
  'solar-punk': 'Neon Metro: gardens climbing the glass towers at golden hour',
  'cyberpunk': 'Neon Abyss: a rain-slick canyon of cyan and magenta light',
  'chrono-punk': 'Yangon: the temporal bazaar where salvaged centuries collide',
  'ocean-void': 'Lymnora: the bioluminescent city beneath the living sea',
  'black-order': 'The Cathedral: an obsidian fortress of absolute symmetry',
  'dragon-cypher': 'Benoth: the forge-city in the caldera, rivers of magma between the works',
  'martian-clan': 'Zylo: a terraformed canyon settlement under a rust sunset',
  'bio-punk': 'Verdantia Arcology: the city grown from living organisms, in bloom',
  'apex': 'The unwritten world of the Apex: a prismatic monolith in the void',
};

/* the codex */
const codex = document.getElementById('clan-codex');

for (const clan of CLANS) {
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

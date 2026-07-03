/* Runway 8888 — the couture looks.
   One look per house. Each silhouette block drives the atelier's
   particle engine directly:
     flare    hem width multiplier            (0.5 column … 1.5 ballgown)
     train    train length multiplier          (0 none … 2 floor-devouring)
     hem      hem height, 0 floor … 1 cropped
     shoulder shoulder / arm architecture      (1 natural … 1.4 monumental)
     collar   high-collar amount               (0 open … 1 cathedral)
     turb     fabric turbulence                (0 rigid … 1.7 living)
     flow     fabric flow speed                (0.4 solemn … 1.6 electric)
     glitch   digital displacement             (0 … 1)
     aura     0 veil ribbons · 1 halo rings · 2 rising motes
     veil     aura density / brightness        (0 … 1)                     */

import { BRAND, CLANS, clanById } from './data.js';

const S = (o) => ({
  flare: 1, train: 1, hem: 0, shoulder: 1, collar: 0,
  turb: 1, flow: 1, glitch: 0, aura: 0, veil: 0.5, ...o,
});

const OUTFITS = {
  'black-chronoa': {
    title: 'Monolith Regalia',
    notes: 'A coronation coat cut like the First Monolith itself: a narrow obsidian column that breaks, at the floor, into a train two rooms long. A single temporal ring turns above the crown, keeping the hour of the first recorded memory.',
    materials: 'Void-black memorysilk · chrono-gold filament · one temporal halo',
    silhouette: S({ flare: 0.85, train: 2, collar: 0.7, turb: 0.5, flow: 0.6, aura: 1, veil: 0.65 }),
  },
  'white-nova': {
    title: 'Nexus Column',
    notes: 'Couture as architecture. The gown falls in one uninterrupted line, pleated like the towers of Nova Nexus, with load-bearing shoulders and a data ring computed fresh every rotation. NEXUS drafts the pattern; nothing is left to chance.',
    materials: 'Absolute-white structural weave · titanium thread · live data halo',
    silhouette: S({ flare: 0.55, train: 0.4, shoulder: 1.3, collar: 0.3, turb: 0.15, flow: 1.25, aura: 1, veil: 0.55 }),
  },
  'rogue-lunaris': {
    title: 'Eclipse Veil',
    notes: 'Layer upon layer of gauze the color of a lunar eclipse, spiralling around the wearer like the moon’s own atmosphere. The Oracle’s law: the face is shown to the moon alone, so the veil never fully settles.',
    materials: 'Rouge-crimson gauze · lunaris pearl dust · eclipse-black underlay',
    silhouette: S({ train: 1.2, turb: 0.85, flow: 0.55, shoulder: 0.9, collar: 0.2, aura: 0, veil: 1 }),
  },
  'lumina': {
    title: 'Meridian of Hours',
    notes: 'The stewards of Chrono Energy dress in balance itself: a gown of even fall and even light, crowned by twin rings that turn in opposite directions — one for the past, one for the future, the wearer standing at noon between them.',
    materials: 'Celestial white silk · astral gold leaf · twin chrono rings',
    silhouette: S({ flare: 1.05, train: 0.8, collar: 0.35, turb: 0.6, flow: 0.8, aura: 1, veil: 0.85 }),
  },
  'solar-punk': {
    title: 'Canopy Bloom',
    notes: 'A garden you can wear. The skirt opens like a terrace of Neon Metro at first light, petal over petal, and a slow updraft of pollen-light rises through it. Photosynthetic thread: the longer she walks, the brighter it gets.',
    materials: 'Photosynthetic leaf-weave · solar gold trim · living pollen light',
    silhouette: S({ flare: 1.45, train: 0.2, hem: 0.14, turb: 1.5, flow: 0.7, shoulder: 0.95, aura: 2, veil: 0.7 }),
  },
  'cyberpunk': {
    title: 'Abyss Rig',
    notes: 'Cropped, armored, and running unlicensed firmware. The rig re-renders itself several times a second — what looks like fabric is a firewall, and the glitches are not defects but signatures, each one a hacker’s tag woven into light.',
    materials: 'Carbon-fiber mesh · neon circuit inlay · signal motes',
    silhouette: S({ flare: 0.6, train: 0, hem: 0.85, shoulder: 1.15, collar: 0.5, turb: 0.9, flow: 1.6, glitch: 1, aura: 2, veil: 0.8 }),
  },
  'chrono-punk': {
    title: 'Salvage Timeline',
    notes: 'Stitched from centuries that no longer exist: a hem from a lost decade, a sleeve from a future that was cancelled. The garment flickers where timelines disagree. Worn once through an unstable corridor, it never fully returns to one era.',
    materials: 'Salvaged-era patchwork · temporal violet thread · paradox seams',
    silhouette: S({ flare: 0.95, train: 0.6, turb: 1.6, flow: 1.1, glitch: 0.55, collar: 0.25, aura: 2, veil: 0.5 }),
  },
  'ocean-void': {
    title: 'Tide Memory',
    notes: 'The Tide Council does not cut cloth; it convinces water to stay. The gown moves a half-beat behind the wearer, the way a wave remembers the shore, and the train is a long slick of sea holding every memory it has ever touched.',
    materials: 'Lymnora cyan water-silk · deep-trench violet · coral pearl mist',
    silhouette: S({ flare: 1.25, train: 1.6, turb: 1.1, flow: 0.45, aura: 0, veil: 0.8 }),
  },
  'black-order': {
    title: 'Cathedral Plate',
    notes: 'Dress uniform of the Grand Commander’s guard. Nothing moves that has not been ordered to move: the shoulders are ramparts, the collar is a wall, and the steel ring above the crown is not a halo — it is a perimeter.',
    materials: 'Obsidian plate-weave · void steel · one perimeter ring',
    silhouette: S({ flare: 0.7, train: 0.9, shoulder: 1.4, collar: 0.9, turb: 0.1, flow: 0.5, aura: 1, veil: 0.35 }),
  },
  'dragon-cypher': {
    title: 'Forge-Silk Mantle',
    notes: 'Woven on looms that are also forges, from silk that is also alloy. The mantle holds the heat of Benoth’s magma channels, shedding embers as she walks — the Forge Council calls the trail of sparks a signature, never a flaw.',
    materials: 'Forge-silk alloy · volcanic red enamel · live ember trail',
    silhouette: S({ flare: 1.1, train: 0.9, shoulder: 1.1, collar: 0.4, turb: 1.2, flow: 1.3, aura: 2, veil: 1 }),
  },
  'martian-clan': {
    title: 'Horizon Duster',
    notes: 'A pioneer’s coat for a planet still being invented. Cut short enough to climb in, dyed in canyon rust and sunset, and permanently accompanied by a fine drift of terraformed dust that refuses to settle. Mars keeps what Mars touches.',
    materials: 'Rust-dyed canvas-silk · sperastar gold buckle · canyon dust drift',
    silhouette: S({ flare: 1, train: 0.5, hem: 0.1, turb: 0.9, flow: 0.9, shoulder: 1.05, aura: 2, veil: 0.6 }),
  },
  'bio-punk': {
    title: 'Symbiote Bloom',
    notes: 'Grown, not sewn. The Circle of Growth seeds a garment on the wearer a week before the show and lets it ripen: by runway night it breathes on its own, blooming fungal-pink at the hem. No two are alike; none can be repeated.',
    materials: 'Living verdantia weave · fungal bloom cultures · synthetic-flesh lining',
    silhouette: S({ flare: 1.35, train: 0.7, turb: 1.7, flow: 0.9, aura: 0, veil: 0.9 }),
  },
  'apex': {
    title: 'The Unwritten',
    notes: 'The Apex have not yet revealed their world, their leader, or their palette — only this: a silhouette that refuses a single color, cycling through every spectrum the universe has, as if trying each future on for size.',
    materials: 'Unclassified · unclassified · unclassified',
    silhouette: S({ flare: 1.15, train: 1.2, shoulder: 1.1, collar: 0.5, turb: 1.3, flow: 1.2, glitch: 0.3, aura: 1, veil: 0.9 }),
  },
};

const BRAND_LOOK = {
  id: 'chrononebula',
  clanId: null,
  house: 'House ChronoNebula',
  title: 'Aurora Prima',
  notes: 'The house signature that opens every show: a gown of one hundred thousand points of nebula light, worn by no clan and claimed by all of them. When Aurora Prima leaves the runway, the year 8888 officially begins.',
  materials: 'Nebula-emerald light-thread · lunar white · nova gold',
  colors: [
    BRAND.palette.nebulaEmerald,
    BRAND.palette.lunarWhite,
    BRAND.palette.chromeSilver,
    BRAND.palette.novaGold,
    BRAND.palette.cosmicBlue,
  ],
  prismatic: false,
  silhouette: S({}),
};

export const LOOKS = [
  BRAND_LOOK,
  ...CLANS.map((clan) => {
    const outfit = OUTFITS[clan.id];
    return {
      id: clan.id,
      clanId: clan.id,
      house: clan.name,
      title: outfit.title,
      notes: outfit.notes,
      materials: outfit.materials,
      colors: clan.palette ? clan.palette.map((c) => c.hex) : null,
      prismatic: !!clan.unknown,
      silhouette: outfit.silhouette,
    };
  }),
];

export const lookById = (id) => LOOKS.find((l) => l.id === id);
export { clanById };

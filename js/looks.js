/* Runway 8888 — the couture looks.
   One look per house. Each look points at its atelier photograph in
   assets/outfits/ — the engine weaves the particle figure from that
   image's pixels. */

import { BRAND, CLANS } from './data.js';

const OUTFITS = {
  'black-chronoa': {
    title: 'Monolith Regalia',
    notes: 'A coronation coat cut like the First Monolith itself: a narrow obsidian column that breaks, at the floor, into a train two rooms long. A single temporal ring turns above the crown, keeping the hour of the first recorded memory.',
    materials: 'Void-black memorysilk · chrono-gold filament · one temporal halo',
  },
  'white-nova': {
    title: 'Nexus Column',
    notes: 'Couture as architecture. The gown falls in one uninterrupted line, pleated like the towers of Nova Nexus, with load-bearing shoulders and a data ring computed fresh every rotation. NEXUS drafts the pattern; nothing is left to chance.',
    materials: 'Absolute-white structural weave · titanium thread · live data halo',
  },
  'rogue-lunaris': {
    title: 'Eclipse Veil',
    notes: 'Layer upon layer of gauze the color of a lunar eclipse, spiralling around the wearer like the moon’s own atmosphere. The Oracle’s law: the face is shown to the moon alone, so the veil never fully settles.',
    materials: 'Rouge-crimson gauze · lunaris pearl dust · eclipse-black underlay',
  },
  'lumina': {
    title: 'Meridian of Hours',
    notes: 'The stewards of Chrono Energy dress in balance itself: a gown of even fall and even light, crowned by twin rings that turn in opposite directions — one for the past, one for the future, the wearer standing at noon between them.',
    materials: 'Celestial white silk · astral gold leaf · twin chrono rings',
  },
  'solar-punk': {
    title: 'Canopy Bloom',
    notes: 'A garden you can wear. The skirt opens like a terrace of Neon Metro at first light, petal over petal, and a slow updraft of pollen-light rises through it. Photosynthetic thread: the longer she walks, the brighter it gets.',
    materials: 'Photosynthetic leaf-weave · solar gold trim · living pollen light',
  },
  'cyberpunk': {
    title: 'Abyss Rig',
    notes: 'Cropped, armored, and running unlicensed firmware. The rig re-renders itself several times a second — what looks like fabric is a firewall, and the glitches are not defects but signatures, each one a hacker’s tag woven into light.',
    materials: 'Carbon-fiber mesh · neon circuit inlay · signal motes',
  },
  'chrono-punk': {
    title: 'Salvage Timeline',
    notes: 'Stitched from centuries that no longer exist: a hem from a lost decade, a sleeve from a future that was cancelled. The garment flickers where timelines disagree. Worn once through an unstable corridor, it never fully returns to one era.',
    materials: 'Salvaged-era patchwork · temporal violet thread · paradox seams',
  },
  'ocean-void': {
    title: 'Tide Memory',
    notes: 'The Tide Council does not cut cloth; it convinces water to stay. The gown moves a half-beat behind the wearer, the way a wave remembers the shore, and the train is a long slick of sea holding every memory it has ever touched.',
    materials: 'Lymnora cyan water-silk · deep-trench violet · coral pearl mist',
  },
  'black-order': {
    title: 'Cathedral Plate',
    notes: 'Dress uniform of the Grand Commander’s guard. Nothing moves that has not been ordered to move: the shoulders are ramparts, the collar is a wall, and the steel ring above the crown is not a halo — it is a perimeter.',
    materials: 'Obsidian plate-weave · void steel · one perimeter ring',
  },
  'dragon-cypher': {
    title: 'Forge-Silk Mantle',
    notes: 'Woven on looms that are also forges, from silk that is also alloy. The mantle holds the heat of Benoth’s magma channels, shedding embers as she walks — the Forge Council calls the trail of sparks a signature, never a flaw.',
    materials: 'Forge-silk alloy · volcanic red enamel · live ember trail',
  },
  'martian-clan': {
    title: 'Horizon Duster',
    notes: 'A pioneer’s coat for a planet still being invented. Cut short enough to climb in, dyed in canyon rust and sunset, and permanently accompanied by a fine drift of terraformed dust that refuses to settle. Mars keeps what Mars touches.',
    materials: 'Rust-dyed canvas-silk · sperastar gold buckle · canyon dust drift',
  },
  'bio-punk': {
    title: 'Symbiote Bloom',
    notes: 'Grown, not sewn. The Circle of Growth seeds a garment on the wearer a week before the show and lets it ripen: by runway night it breathes on its own, blooming fungal-pink at the hem. No two are alike; none can be repeated.',
    materials: 'Living verdantia weave · fungal bloom cultures · synthetic-flesh lining',
  },
  'apex': {
    title: 'The Unwritten',
    notes: 'The Apex have not yet revealed their world, their leader, or their palette — only this: a silhouette that refuses a single color, cycling through every spectrum the universe has, as if trying each future on for size.',
    materials: 'Unclassified · unclassified · unclassified',
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
  colorNames: ['Nebula Emerald', 'Lunar White', 'Chrome Silver', 'Nova Gold', 'Cosmic Blue'],
  image: 'assets/outfits/chrononebula.jpg',
};

/* The Ayeyarwady Capsule — three looks in which 8888 remembers old
   Earth. Not a house and not a clan: a heritage collection that carries
   Burmese craft (acheik river-weave, sacred lotus fibre, kalaga gold
   relief) forward into the nebula. Standalone looks, like the house
   signature, appended after the fourteen. */
const HERITAGE_LOOKS = [
  {
    id: 'acheik-tide',
    clanId: null,
    house: 'Ayeyarwady Capsule',
    title: 'Hundred-Shuttle Tide',
    notes: 'The royal acheik was woven on a hundred shuttles, its waves copied from the ripples of the Ayeyarwady. Eight thousand years on, the river is gone but its pattern remains — here rewoven from a hundred shuttles of light, a wrapped column breaking at the floor into a train that still moves like water.',
    materials: 'Lun-taya acheik light-thread · hundred-shuttle weave · river-gold ripple',
    colors: ['#00FFB3', '#2E8F8A', '#C9B26B', '#F2F2F4', '#050505'],
    colorNames: ['Nebula Emerald', 'Ayeyarwady Teal', 'River Gold', 'Lunar White', 'Deep Void'],
    image: 'assets/outfits/acheik-tide.jpg',
  },
  {
    id: 'lotus-reliquary',
    clanId: null,
    house: 'Ayeyarwady Capsule',
    title: 'Lotus Reliquary',
    notes: 'On old Earth, robes of lotus fibre were drawn from the stems of the red Padonma by the last weavers of Inle Lake. The capsule reawakens the thread as a living fibre that grows its own cloth, wrapped as a htamein over the plain black band, a single lotus raised in gold kalaga relief above the heart.',
    materials: 'Living lotus-fibre weave · kalaga gold appliqué · ahtet-hsin black band',
    colors: ['#E4B48C', '#4F9E7A', '#C9A94B', '#ECE6DA', '#0B0B0D'],
    colorNames: ['Lotus Rose-Gold', 'Padonma Jade', 'Kalaga Gold', 'Inle Pearl', 'Ahtet Black'],
    image: 'assets/outfits/lotus-reliquary.jpg',
  },
  {
    id: 'kalaga-court',
    clanId: null,
    house: 'Ayeyarwady Capsule',
    title: 'Kalaga Court',
    notes: 'Kalaga hung in the courts of Mandalay: padded figures of gold thread and glass raised in relief on a dark ground, a whole theatre sewn onto cloth. This court mantle stages it one last time at the end of time — the old drama in gold and light-bead over obsidian, a pasoe panel falling to the floor.',
    materials: 'Obsidian kalaga ground · raised gold-thread relief · glass & light-bead inlay',
    colors: ['#0B0B0E', '#C9B26B', '#E6EAEF', '#5B4A9B', '#C98A3C'],
    colorNames: ['Obsidian', 'Mandalay Gold', 'Glass White', 'Temporal Violet', 'Amber Ember'],
    image: 'assets/outfits/kalaga-court.jpg',
  },
];

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
      colorNames: clan.palette ? clan.palette.map((c) => c.name) : null,
      image: `assets/outfits/${clan.id}.jpg`,
    };
  }),
  ...HERITAGE_LOOKS,
];

#!/usr/bin/env node
/* photography-direction — prompt composer (the driver).
 *
 * This skill is knowledge, not a launchable app, so its "driver" is a
 * prompt COMPOSER: pick a camera angle + a lighting recipe, and it
 * prints a ready-to-generate prompt block that stacks the keywords the
 * way image/video models actually parse them. The recipes below are
 * distilled from two deep-research passes (fashion camera angles;
 * photo/cinema lighting) plus the 20+ ChronoNebula generations that
 * field-tested them this session.
 *
 * Usage:
 *   node compose.mjs --list
 *   node compose.mjs --angle low-hero --light void-chiaroscuro \
 *        --subject "Melina in an obsidian plate gown, gold seams" \
 *        --backdrop "seamless near-black studio" --model soul2
 *   node compose.mjs --angle <id> --light <id> --subject "..." --json
 *
 * The KEY finding it encodes: models disagree on lighting jargon —
 * Midjourney once rendered "butterfly lighting" as literal butterflies;
 * newer models (soul_2, nano_banana, Veo 3) mostly take named setups.
 * So every recipe carries BOTH the named term AND a plain-language
 * placement sentence. Belt and suspenders. Never ship the jargon alone.
 */

const ANGLES = {
  'eye-level': {
    name: 'Eye-level architectural',
    keywords: 'eye-level shot, full body head to toe in frame, symmetrical frontal composition',
    use: 'Calm authority, symmetry, garment read head-on. NOTE: this is the generative default — if you name no angle you get this, so only pick it deliberately.',
  },
  'low-hero': {
    name: 'Low-angle hero',
    keywords: 'low angle shot looking up, full body head to toe in frame, monumental heroic framing',
    use: 'Monumentalizes the figure — power, couture-as-architecture. The ChronoNebula house default for armored/structured looks.',
  },
  'three-quarter': {
    name: 'Three-quarter',
    keywords: 'three-quarter angle, full body in frame, body turned 45 degrees to camera, weight on back leg',
    use: 'The fashion workhorse: shows garment front and side at once, natural contrapposto. Safe when unsure.',
  },
  'profile': {
    name: 'Full profile',
    keywords: 'full profile side view, full body in frame, silhouette against negative space',
    use: 'Reads pure silhouette — trains, veils, sculptural collars, swept fabric.',
  },
  'over-shoulder-back': {
    name: 'Over-the-shoulder from behind',
    keywords: 'shot from behind, head turned in sharp profile over the shoulder, back and train toward camera',
    use: 'Backless gowns, spinal jewelry, capes and trains. Highest drama; the face is a reveal.',
  },
  'worms-eye': {
    name: "Worm's-eye",
    keywords: "extreme worm's-eye view from the floor looking straight up, towering foreshortened figure",
    use: 'Maximum dominance/scale. Distorts — reserve for a single statement frame.',
  },
  'high-angle': {
    name: 'High-angle',
    keywords: 'high angle shot looking down, figure amid spreading fabric on the floor',
    use: 'Vulnerability, or to show a pooled/spreading garment from above.',
  },
  'dutch': {
    name: 'Dutch tilt',
    keywords: 'dutch angle, tilted horizon, off-kilter framing',
    use: 'Tension/unease. Use sparingly — a whole series of these reads as a gimmick.',
  },
};

const LIGHTS = {
  'void-chiaroscuro': {
    name: 'Void chiaroscuro (the ChronoNebula house light)',
    // named term + plain placement + the subtractive move
    recipe:
      'single hard key light from high camera-left angled down about 45 degrees, ' +
      'deep chiaroscuro shadows, black negative fill on the camera-near side to deepen the shadow and carve the shape, ' +
      'background falling to pure black, low-key high-contrast lighting',
    physics: 'Hard = a small/bare/distant source: sharp shadow edges, texture, drama. Negative fill (black flags) SUBTRACTS light from the shadow side to raise contrast and maximize 3D form.',
    use: 'The signature look. Obsidian couture on the void. Pairs with any angle.',
  },
  'rembrandt-hard': {
    name: 'Rembrandt (hard)',
    recipe:
      'Rembrandt lighting: a single hard key from high camera-left, ' +
      'casting a small triangle of light on the shadow-side (right) cheek, ' +
      'the rest of the face in shadow, black negative fill opposite',
    physics: 'Key ~45° to the side and above. The triangle of light under the shadow-side eye is the tell. Hard source for edge and gravitas.',
    use: 'Portrait and 3/4 crops with a painterly, sculpted face.',
  },
  'split': {
    name: 'Split',
    recipe:
      'split lighting: one hard source at 90 degrees to the side, ' +
      'lighting exactly half the face and body while the other half falls to black',
    physics: 'Key dead side-on. Divides the figure light/dark down the centerline — the most severe portrait pattern.',
    use: 'Maximum drama; masks, high collars, duality themes.',
  },
  'butterfly-beauty': {
    name: 'Butterfly / paramount (beauty)',
    recipe:
      'butterfly lighting: a soft key placed straight in front and above the face, ' +
      'casting a small symmetrical shadow directly under the nose, ' +
      'a subtle fill or reflector below to open the shadows (clamshell)',
    physics: 'Frontal, high, symmetric. Soft/large source = gentle even beauty light. Add a low fill for the glossy clamshell.',
    use: 'Glamour, jewelry, flawless skin. WARNING: some models render "butterfly lighting" literally — the plain-language placement above is what makes it work.',
  },
  'rim-separation': {
    name: 'Rim / kicker on black',
    recipe:
      'strong hard rim light raking from behind, tracing a bright edge along the hair, shoulder and arm, ' +
      'separating the figure from a pure-black background, minimal frontal fill',
    physics: 'Backlight behind and to one side. On a dark backdrop the rim is what stops the subject dissolving into the void.',
    use: 'Essential for dark garments / dark skin on a black set — the edge light is the separation.',
  },
  'spotlight-shaft': {
    name: 'Overhead spotlight shaft',
    recipe:
      'a single hard shaft of white light from directly above cutting through faint atmospheric haze, ' +
      'pooling on the figure, deep shadow everywhere else, black negative fill',
    physics: 'Top-down hard key + haze to make the beam visible. Inverse-square falloff pools the light tight around the subject.',
    use: 'Theatrical single-subject reveal — kneeling/seated statement frames.',
  },
  'emerald-gel-key': {
    name: 'Emerald-gel accent (house color)',
    recipe:
      'hard key light gelled faint emerald tracing one edge of the figure, ' +
      'warm gold practical glinting off metal seams, otherwise deep shadow on the void',
    physics: 'Colored gel on a hard edge/rim source. Warm practical (~3200K) vs cool emerald edge = color contrast without flooding.',
    use: 'Ties a shot to the ChronoNebula palette (Nebula Emerald + Nova Gold) without lighting the whole scene.',
  },
};

/* Dark-skin note carried on every recipe reminder, per the research:
   expose at the subject's natural level (do NOT overexpose/flood),
   add a warm practical in frame, and let the image fall off to black —
   rim/kicker gives the separation a dark backdrop otherwise eats. */
const DARK_SKIN_NOTE =
  'For deep skin tones: expose at the natural level (do not flood or overexpose), ' +
  'keep a warm practical in frame, and lean on the rim/edge light for separation from the dark backdrop.';

const LENS_FASHION =
  'Shot on an 85mm lens at f/8 for razor-sharp garment and fabric detail (not a shallow f/1.4 blur), ' +
  'photorealistic, luxury campaign editorial.';

/* --photoreal: a film-photograph texture block that fights the plastic,
   over-retouched look most models default to. Names real imperfections
   (pores, nose-bridge redness, forearm veins), demands anatomically real
   hands, and asks for ISO-400 grain across the WHOLE frame — not just the
   face — plus an explicit "no retouching / not an illustration" clause.
   Field-tested on the ChronoNebula clan-leader portraits. */
const PHOTOREAL =
  'SKIN TEXTURE: natural human skin texture throughout — visible pores on the nose and cheeks, ' +
  'subtle texture on the chest and arms, no smoothing or digital retouching; natural tonal variation ' +
  '(slight redness around the nose bridge, faint visible veins on the inner forearm and hands); ' +
  'authentic imperfections preserved. HANDS: full anatomical realism — visible knuckle creases, ' +
  'natural tendon definition, slightly visible veins; fingernails short, unpolished, natural. ' +
  'FILM GRAIN: heavy ISO 400 film grain throughout the entire frame — on arms, chest and hands as well ' +
  'as the face — breaking up all smooth surfaces, not selectively applied. A real film photograph: ' +
  'no skin smoothing, no frequency separation, no retouching. Photorealistic, NOT an illustration, ' +
  'NOT a painting, NOT concept art, NOT a 3D render.';

function list() {
  console.log('\nCAMERA ANGLES (--angle):');
  for (const [id, a] of Object.entries(ANGLES)) console.log(`  ${id.padEnd(18)} ${a.name}\n${' '.repeat(20)}${a.use}`);
  console.log('\nLIGHTING RECIPES (--light):');
  for (const [id, l] of Object.entries(LIGHTS)) console.log(`  ${id.padEnd(18)} ${l.name}\n${' '.repeat(20)}${l.use}`);
  console.log('');
}

function arg(flag, def = null) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const has = (flag) => process.argv.includes(flag);

if (has('--list') || process.argv.length <= 2) { list(); process.exit(0); }

const angleId = arg('--angle', 'three-quarter');
const lightId = arg('--light', 'void-chiaroscuro');
const subject = arg('--subject', 'the model in a couture gown');
const backdrop = arg('--backdrop', 'seamless near-black studio backdrop');
const model = arg('--model', 'soul2');
const darkSkin = has('--dark-skin');

const angle = ANGLES[angleId];
const light = LIGHTS[lightId];
if (!angle) { console.error(`Unknown --angle "${angleId}". Run --list.`); process.exit(1); }
if (!light) { console.error(`Unknown --light "${lightId}". Run --list.`); process.exit(1); }

const photoreal = has('--photoreal');

const parts = [
  photoreal ? 'Ultra-realistic cinematic FILM PHOTOGRAPH.' : 'Cinematic luxury fashion campaign photograph.',
  `${angle.keywords}.`,
  `${subject}.`,
  `${backdrop}.`,
  `${light.recipe}.`,
  darkSkin ? DARK_SKIN_NOTE : null,
  photoreal ? PHOTOREAL : LENS_FASHION,
  'No text, no typography, no logos, no watermarks anywhere in the frame.',
].filter(Boolean);

const prompt = parts.join(' ');

if (has('--json')) {
  console.log(JSON.stringify({ angle: angleId, light: lightId, model, prompt }, null, 2));
} else {
  console.log(`\n# ${angle.name}  ×  ${light.name}   (model: ${model})`);
  console.log(`# angle physics : reads as ${angle.use.split('.')[0].toLowerCase()}`);
  console.log(`# light physics : ${light.physics}`);
  console.log(`\n${prompt}\n`);
}

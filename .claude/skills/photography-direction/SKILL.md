---
name: photography-direction
description: >
  Direct camera angle and lighting for AI image/video generation — fashion,
  editorial, portrait, and cinematic shots. Use when composing or refining a
  generation prompt and you need to specify how the subject is framed and lit:
  camera angle (low hero, three-quarter, profile, over-the-shoulder, worm's-eye),
  named lighting setups (Rembrandt, split, butterfly/paramount, clamshell, rim,
  chiaroscuro), negative fill, hard vs soft light, color-temperature/gels, and
  lighting for dark skin tones or fabric detail. Triggers on "camera angle",
  "lighting", "how should I light / frame this", "shoot", "photograph",
  "editorial", "campaign", "make it look cinematic", or tuning a Higgsfield /
  Soul / nano_banana / Veo prompt for a portrait or fashion shot.
---

# Photography direction: camera angles + lighting for AI generation

A recipe library for the two decisions a generation prompt most often gets
wrong: **where the camera is** and **where the light is**. Distilled from two
deep-research passes (fashion camera angles; photo/video/cinema lighting) and
field-tested on 20+ ChronoNebula generations this session. Built for the house
look — a figure on the void — but the recipes are general.

Paths below are relative to the repo root.

## The one load-bearing rule

**Name the setup AND describe the physical placement in plain language.** Models
disagree on lighting jargon: older Midjourney rendered "butterfly lighting" as
literal butterflies; newer models (Higgsfield `soul_2`, `nano_banana`, Veo 3)
mostly honor named setups but still improve with placement. So never ship the
jargon alone — write *"Rembrandt lighting: a hard key from high camera-left, a
small triangle of light on the shadow-side cheek."* Belt and suspenders. The
composer below always emits both.

Corollary: **eye-level is the generative default.** If you name no angle you get
a flat eye-level frame. Naming the angle is not optional.

## Run (agent path): the composer

The driver is a prompt composer — pick an angle + a lighting recipe and it
prints a ready block with the keywords stacked the way models parse them.

```bash
# list every angle and lighting recipe with when-to-use notes
node .claude/skills/photography-direction/compose.mjs --list

# compose a prompt (prints the block + the physics behind each choice)
node .claude/skills/photography-direction/compose.mjs \
  --angle low-hero --light void-chiaroscuro \
  --subject "Melina in an obsidian articulated-plate gown with gold seams" \
  --backdrop "seamless near-black studio" --model soul2

# machine-readable, to pipe the prompt straight into a generator
node .claude/skills/photography-direction/compose.mjs \
  --angle over-shoulder-back --light emerald-gel-key \
  --subject "backless midnight gown, spinal gold jewelry" --json

# deep skin tones: adds the natural-exposure + rim-separation clause
node .claude/skills/photography-direction/compose.mjs \
  --angle three-quarter --light rim-separation --subject "..." --dark-skin
```

Flags: `--angle` and `--light` (ids from `--list`), `--subject`, `--backdrop`,
`--model` (label only), `--dark-skin`, `--photoreal`, `--json`. Defaults:
`three-quarter` × `void-chiaroscuro`. **`--photoreal`** swaps the fashion-lens
line for a film-photograph texture block — visible pores, nose-bridge redness,
forearm veins, anatomically real hands, ISO-400 grain across the whole frame,
and an explicit "no retouching / not an illustration" clause. It's the antidote
to the plastic, over-smoothed faces models default to; field-tested on the
ChronoNebula clan-leader portraits. Take the `prompt` string and pass it to the Higgsfield MCP
`generate_image` (with the Melina `soul_id` for identity) or any model.

## The recipes, and the physics that makes them work

**Camera angles** — each reads as an emotion before it reads as a garment:
- `low-hero` monumentalizes (couture-as-architecture; the house default for
  structured/armored looks). `worms-eye` is its extreme — one statement frame only.
- `three-quarter` is the workhorse: front + side at once, natural contrapposto.
- `profile` reads pure silhouette (trains, veils, collars). `over-shoulder-back`
  is the highest-drama reveal (backless gowns, spinal jewelry, capes).
- `eye-level` = calm symmetry, but it's the default — pick it on purpose.

**Lighting** — the levers are *source size* and *subtraction*:
- **Hard vs soft is source size relative to subject.** Small / bare / far = hard:
  crisp shadow edges, texture, drama. Big / diffused / close = soft: gentle, even
  beauty light. Fashion detail wants hard; skin glamour wants soft.
- **Inverse-square falloff** (the one verified-by-vote physics fact): doubling
  the light-to-subject distance quarters the intensity — 2 stops. Falloff is
  steep near the source and flat far away. So put the subject *close* to the key
  for dramatic fall-to-black (the void look), *far* for an even wash.
- **Negative fill is the ChronoNebula secret.** Black flags on the camera-near /
  shadow side *subtract* light, deepen the shadow, raise contrast, and maximize
  three-dimensional shape. Adding black, not adding light, is what carves couture
  out of the dark.
- **Named setups** the composer carries: `void-chiaroscuro` (house look: single
  hard key + negative fill + fall to black), `rembrandt-hard` (triangle on the
  shadow cheek), `split` (90° side, half to black), `butterfly-beauty`
  (frontal-high, clamshell fill), `rim-separation`, `spotlight-shaft`,
  `emerald-gel-key` (house color on an edge).
- **Dark skin tones:** expose at the natural level — do *not* flood or overexpose
  (a common miss even on big productions). Keep a warm practical in frame and lean
  on a rim/kicker for separation, since a dark backdrop otherwise eats the edge.

Full when-to-use text and the composed physics notes print from `--list` and
each compose run — that output is the reference; this file is the map.

## Verified this session

- Ran `compose.mjs --list` and several `--angle`/`--light` combinations; the
  blocks above are its actual output.
- Fed a composed prompt (`over-shoulder-back` × `emerald-gel-key`) verbatim to
  Higgsfield `soul_2` with the Melina `soul_id`; it was accepted and rendered
  (job completed, correct 3/4 ratio, no errors).
- The recipes are visually confirmed by the ~25 images generated *with them* this
  session and inspected on disk — e.g. `assets/hero/hero-constellation.jpg` is
  `over-shoulder-back` + spinal gold jewelry on the void, and
  `assets/hero/hero-profile.jpg` is the emerald edge light. Open those to see the
  recipes rendered.

## Gotchas

- **`4:5` isn't a native Higgsfield ratio** — `generate_image` silently coerces
  it to `3:4` (closest by log-ratio). Ask for `3:4` directly if you want to know
  what you'll get.
- **"No text / no typography / no watermarks" is load-bearing.** Without it,
  `soul_2` and `nano_banana` frequently bake a fake magazine title card or
  gibberish lettering into the negative space (it happened twice this session).
  The composer appends it automatically.
- **Jargon-only lighting is a coin flip.** See the load-bearing rule — always
  emit the placement sentence too. The composer does; hand-written prompts forget.
- **Backdrop drives falloff.** "seamless near-black studio" + hard key + negative
  fill gives the fall-to-black. A lit/gradient backdrop fights the chiaroscuro no
  matter how you place the key.

## Provenance

Recipes synthesized from two `deep-research` runs (Burmese-independent): fashion
camera angles, and photo/video/cinema lighting (inverse-square, negative fill,
chiaroscuro, named portrait setups, dark-skin exposure, the Midjourney jargon
failure). Both runs verified their core claims by adversarial vote before the
month's research budget capped them; the physics above is the surviving core plus
established craft. This is a knowledge skill, so its "driver" is the prompt
composer, and "launching the app" means generating real images from these
recipes and inspecting them — done above and across the session's shipped
`assets/hero/` frames.

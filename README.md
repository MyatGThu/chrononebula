# ChronoNebula · AI × Fashion

A luxury futuristic website for the ChronoNebula universe (8888 AD),
designed by **Quantum Lumina AI** — the house's Supreme Creative
Intelligence. Eight planets, thirteen clans, an interactive 3D galaxy map,
a scroll-driven Chrono Core that assembles the First Monolith from light,
and a particle-couture runway that dresses itself in each clan's palette.

**Live site:** https://myatgthu.github.io/chrononebula/

Founded by **Zan Ye Htet** (creative identity: **ZXXNGOD**).

> Timeless Fashion From 8888 AD.

## Quantum Lumina AI

The site implements the *Quantum Lumina AI — System Specification v1.0*:
Lumina is the official AI Creative Director of ChronoNebula AI × Fashion.
The home page presents its identity and activation prompt, the six
specialization agents (Fashion Designer, Material Scientist, Creative
Director, Worldbuilding, Runway Director, Business Strategist), the
twelve-point collection and ten-point garment frameworks, and the seven
brand values and design rules. The founding house — the **Black Chronoa**
clan — and its first collection, **Eclipse of Time**, anchor the fiction.

## Visual language

The design system follows the spec's palette:

| Role | Color |
| --- | --- |
| Base | Obsidian Black `#0A0A0A` |
| Signature fill | Dark Emerald Green `#014D40` |
| Interactive accent | Luminous emerald `#2FD0A0` (an AA-contrast tint of the brand emerald) |
| Editorial voice | Silver Chrome `#C0C0C0` |
| Structure | Graphite Gray `#2E2E2E` |
| Ink | Cosmic White `#F5F5F5` |

Because Dark Emerald `#014D40` fails text contrast on obsidian, interactive
accents (links, focus rings, active states, WebGL glows) use a luminous
tint of it — roughly 10:1 on the base — so the house stays emerald while
meeting WCAG 2.1 AA.

## Imagery

Every photograph on the site is the house model **Melina Jones Voss**: the
hero campaign (`assets/melina-hero.jpg`, `assets/hero/`) and one couture
look per house (`assets/outfits/`). The clans codex and the runway share
these Melina photographs — the Codex, worn.

## Stack

- Static site: no build step, no framework. HTML + CSS + ES modules.
- [Three.js](https://threejs.org/) (vendored in `vendor/`) powers the hero
  particle field, the scroll-driven Chrono Core, the galaxy map, and the
  runway figure.
- Fonts (Cinzel, Jost) are self-hosted in `assets/fonts/`.
- Honors `prefers-reduced-motion` and degrades gracefully without WebGL.

## Run locally

Any static file server works. For example:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

(Opening `index.html` directly from disk will not work because ES modules
require http.)

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository (as the repo root).
2. In the repo: Settings → Pages → Source: `Deploy from a branch`,
   Branch: `main`, folder `/ (root)`.
3. The site appears at `https://<username>.github.io/<repo>/`.

The `.nojekyll` file is required so Pages serves the `vendor/` and
`assets/` folders untouched.

## Structure

```
index.html          home: hero, Chrono Core (scroll 3D), Quantum Lumina AI,
                    the six agents, the method, universe map, ethos
clans.html          the codex: one card per clan (worn by Melina)
runway.html         Runway 8888: a 3D couture look per house
css/style.css       design system (Quantum Lumina AI visual language)
css/fonts.css       self-hosted @font-face rules
js/data.js          world bible + the Quantum Lumina AI spec (agents,
                    frameworks, values, rules, first knowledge)
js/looks.js         Runway 8888 looks: outfit copy + atelier photo refs
js/common.js        shared chrome: nav, reveals, footer
js/main.js          home orchestration, spec rendering, lazy-loading
js/core.js          Chrono Core: scroll-scrubbed monolith (WebGL)
js/clans.js         clans page renderer
js/runway-page.js   runway page controller
js/hero.js          hero particle field (WebGL)
js/galaxy.js        interactive universe map (WebGL)
js/atelier.js       image-woven particle-couture engine (WebGL)
js/lab.js           laboratory canvas material studies (2D)
assets/             imagery (Melina Jones Voss) + fonts
assets/outfits/     couture photographs, one per house
vendor/             three.module.min.js
```

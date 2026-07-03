# ChronoNebula · AI × Fashion

A luxury futuristic website for the ChronoNebula universe (8888 AD): eight
planets, thirteen clans, an interactive 3D galaxy map, and a particle-couture
runway figure that dresses itself in each clan's official palette.

**Live site:** https://myatgthu.github.io/chrononebula/

Created by **Zan Ye Htet** (creative identity: **ZXXNGOD**).

## Stack

- Static site: no build step, no framework. HTML + CSS + ES modules.
- [Three.js](https://threejs.org/) (vendored in `vendor/`) powers the hero
  particle field, the galaxy map, and the runway figure.
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
index.html          home: hero, universe map, AI Lab
clans.html          the codex: one card per clan
runway.html         Runway 8888: a 3D couture look per house
css/style.css       design system (dark, Nebula Emerald accent)
css/fonts.css       self-hosted @font-face rules
js/data.js          world bible data: planets, clans, official palettes
js/looks.js         Runway 8888 looks: outfit copy + atelier photo refs
js/common.js        shared chrome: nav, reveals, footer
js/main.js          home orchestration and lazy-loading
js/clans.js         clans page renderer
js/runway-page.js   runway page controller
js/hero.js          hero particle field (WebGL)
js/galaxy.js        interactive universe map (WebGL)
js/atelier.js       image-woven particle-couture engine (WebGL)
js/lab.js           AI Lab canvas material studies (2D)
assets/             imagery + fonts
assets/outfits/     couture photographs, one per house (AI-generated)
vendor/             three.module.min.js
```

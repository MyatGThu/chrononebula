/* The Chrono Core — a scroll-scrubbed 3D centerpiece.

   As the reader scrolls the pinned section, a nebula of scattered light
   ASSEMBLES into the First Monolith of Cindra: a tapered obelisk of dark
   emerald threaded with luminous energy, crowned by a temporal ring that
   keeps the first recorded hour. Scroll progress (0 → 1) drives the
   assembly, the camera dolly, the rotation, and the energy pulse — the
   whole scene is a function of where the page is, so it scrubs both ways.

   Reduced motion: the monolith is rendered once, fully formed, and never
   scrubs. No WebGL: main.js never calls this and the CSS fallback shows. */

import * as THREE from '../vendor/three.module.min.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);

/* ---- target geometry: where each mote settles on the monolith ---------- */

const FIG_H = 6.2;                 /* obelisk height, world units */
const BASE_W = 1.55;               /* half-width at the foot */
const TOP_W = 0.42;                /* half-width where the shaft meets the cap */
const CAP_H = 1.15;                /* pyramidal crown height */
const RING_Y = 4.35;               /* the temporal ring rides the upper shaft */
const RING_R = 2.35;

/* returns [x,y,z] on the monolith surface, plus an energy weight 0..1 that
   marks the glowing seams (vertical edges + ring + crown) */
function monolithTarget(rand) {
  const roll = rand();
  if (roll < 0.21) {
    /* the temporal ring — a thin tilted torus orbiting the crown */
    const a = rand() * Math.PI * 2;
    const rr = RING_R + (rand() - 0.5) * 0.14;
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    const tilt = 0.18;
    const y = RING_Y + Math.sin(a) * rr * tilt + (rand() - 0.5) * 0.08;
    return [x, y, z * Math.cos(tilt), 1.0];
  }
  if (roll < 0.24) {
    /* the crown: a bright pyramidal cap above the shaft */
    const t = rand();                       /* 0 foot of cap → 1 apex */
    const w = TOP_W * (1 - t);
    const y = FIG_H - CAP_H + t * CAP_H;
    const face = (rand() * 4) | 0;
    const u = (rand() - 0.5) * 2 * w;
    const [x, z] = face === 0 ? [w, u] : face === 1 ? [-w, u] : face === 2 ? [u, w] : [u, -w];
    return [x, y, z, 0.55 + 0.45 * t];
  }
  /* the shaft: a tall tapered rectangular column, four faces */
  const yt = rand();
  const y = yt * (FIG_H - CAP_H);
  const w = BASE_W + (TOP_W - BASE_W) * yt;   /* taper */
  const face = (rand() * 4) | 0;
  const u = (rand() - 0.5) * 2 * w;
  const [x, z] = face === 0 ? [w, u] : face === 1 ? [-w, u] : face === 2 ? [u, w] : [u, -w];
  /* energy threads the whole face (soft floor) and burns brightest along
     the vertical edges — so the shaft reads as luminous, not near-black */
  const edge = 0.17 + Math.pow(clamp(Math.abs(u) / w, 0, 1), 3) * 0.83;
  return [x, y, z, edge];
}

export function initCore(canvas, { section, reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);

  const mobile = matchMedia('(max-width: 760px)').matches;
  const COUNT = mobile ? 9000 : 24000;

  const start = new Float32Array(COUNT * 3);   /* scattered nebula position */
  const target = new Float32Array(COUNT * 3);  /* settled monolith position */
  const rand = new Float32Array(COUNT);
  const energy = new Float32Array(COUNT);

  let seed = 1;
  const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  for (let i = 0; i < COUNT; i++) {
    const [tx, ty, tz, e] = monolithTarget(rng);
    target[i * 3] = tx;
    target[i * 3 + 1] = ty;
    target[i * 3 + 2] = tz;
    energy[i] = e;

    /* scattered start: a wide spherical shell of dust around the plinth */
    const r = 7 + rng() * 8;
    const th = rng() * Math.PI * 2;
    const ph = Math.acos(2 * rng() - 1);
    start[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    start[i * 3 + 1] = ty * 0.2 + (rng() * FIG_H - 0.5) + Math.cos(ph) * 2.0;
    start[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r * 0.7;
    rand[i] = rng();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
  geometry.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
  geometry.setAttribute('aTarget', new THREE.BufferAttribute(target, 3));
  geometry.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
  geometry.setAttribute('aEnergy', new THREE.BufferAttribute(energy, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, FIG_H / 2, 0), 18);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uAssemble: { value: reduced ? 1 : 0 },   /* 0 dust → 1 monolith */
      uPixelRatio: { value: renderer.getPixelRatio() },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aStart;
      attribute vec3 aTarget;
      attribute float aRand;
      attribute float aEnergy;
      uniform float uTime;
      uniform float uAssemble;
      uniform float uPixelRatio;
      varying float vAlpha;
      varying float vEnergy;
      varying float vForm;
      void main() {
        /* per-mote staggered assembly so the monolith builds foot-to-crown */
        float lead = mix(0.0, 0.42, aRand);
        float a = clamp((uAssemble - lead) / (1.0 - lead), 0.0, 1.0);
        a = a * a * (3.0 - 2.0 * a);
        vForm = a;

        vec3 p = mix(aStart, aTarget, a);

        /* dust drifts while scattered; the monolith breathes once settled */
        float live = 1.0 - a;
        p.x += sin(uTime * 0.5 + aRand * 6.28) * (0.5 * live + 0.02);
        p.y += sin(uTime * 0.4 + aRand * 5.0) * (0.4 * live + 0.015);
        p.z += cos(uTime * 0.45 + aRand * 4.2) * (0.5 * live + 0.02);

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;

        float size = mix(1.5, 3.1, aRand) * mix(1.0, 0.86, a);
        gl_PointSize = size * uPixelRatio * (9.5 / -mv.z);

        /* energy seams pulse once the form has resolved, and a bright pulse
           of light travels up the shaft on a slow cadence (chrono energy) */
        float pulse = 0.62 + 0.38 * sin(uTime * 2.0 - aTarget.y * 1.4);
        float sweep = pow(max(0.0, sin(uTime * 0.85 - aTarget.y * 1.15)), 3.0);
        vEnergy = aEnergy * a * (pulse + sweep * 0.6);
        float tw = 0.72 + 0.28 * sin(uTime * (0.8 + aRand * 2.0) + aRand * 30.0);
        vAlpha = tw * mix(0.5, 1.18, a) * smoothstep(-26.0, -3.0, mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying float vAlpha;
      varying float vEnergy;
      varying float vForm;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float disc = smoothstep(0.5, 0.06, d);
        if (disc < 0.01) discard;
        vec3 dust    = vec3(0.11, 0.34, 0.29);   /* dim emerald nebula */
        vec3 emerald = vec3(0.03, 0.47, 0.37);   /* lit dark-emerald body */
        vec3 lumina  = vec3(0.24, 0.98, 0.74);   /* luminous emerald seam */
        vec3 crown   = vec3(0.90, 0.97, 0.99);   /* silver-chrome spark */
        vec3 col = mix(dust, emerald, vForm);
        col += lumina * 0.16 * vForm;            /* energy threaded through the body */
        col = mix(col, lumina, clamp(vEnergy, 0.0, 1.0));
        col = mix(col, crown, smoothstep(0.92, 1.3, vEnergy));
        gl_FragColor = vec4(col, disc * vAlpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  const pivot = new THREE.Group();
  pivot.add(points);
  scene.add(pivot);

  /* an additive bloom halo behind the shaft that blooms as it forms, so the
     monolith reads as a source of light, not a dark silhouette on the void */
  function glowTexture() {
    const s = 128;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(70,255,196,0.85)');
    g.addColorStop(0.35, 'rgba(24,160,120,0.30)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0,
  }));
  glow.position.set(0, FIG_H * 0.5, -0.6);
  glow.scale.setScalar(2);
  scene.add(glow);

  /* set once the reduced-motion path has drawn its single frame: setSize
     resets the WebGL backing store, so without a rAF loop we must repaint
     the settled monolith after every resize or it blanks. */
  let staticFrame = false;
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (staticFrame) renderer.render(scene, camera);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  /* the settled frame shown when the runway can't scrub (reduced motion or
     a section shorter than the viewport): mostly formed, still breathing */
  const STILL_P = 0.82;

  /* ---- scroll progress: 0 as the section pins, 1 as it releases -------- */
  function progress() {
    if (reduced) return STILL_P;
    const rect = section.getBoundingClientRect();
    const travel = rect.height - innerHeight;
    if (travel <= 0) return STILL_P;
    return clamp(-rect.top / travel, 0, 1);
  }

  /* copy captions crossfade across three phases of the assembly */
  const lines = section ? [...section.querySelectorAll('.core-line')] : [];
  let activeLine = -1;
  function setCaption(p) {
    if (!lines.length) return;
    const i = p < 0.34 ? 0 : p < 0.7 ? 1 : 2;
    if (i === activeLine) return;
    activeLine = i;
    lines.forEach((el, k) => el.classList.toggle('on', k === i));
  }

  let running = true;
  let rafId = 0;
  let time = 0;
  let rendered = -1;
  const clock = new THREE.Clock();

  function apply(p) {
    /* the monolith fully assembles over the first ~62% of the scroll; the
       remainder is a dwell — the formed obelisk turning, energy pulsing,
       camera settling — so the pinned section pays off throughout, not only
       at the very end. */
    const aP = clamp(p / 0.62, 0, 1);
    material.uniforms.uAssemble.value = aP;
    const e = smooth(aP);
    /* dolly from far dust to a low hero angle, with a slow lateral drift */
    camera.position.set(Math.sin(time * 0.08) * 0.5, 2.5 + e * 0.7, 18.4 - e * 8.9);
    camera.lookAt(0, FIG_H * 0.52, 0);
    /* a reveal turn across the whole scroll + a gentle idle drift so the
       settled monolith never feels frozen */
    pivot.rotation.y = -0.6 + p * 2.4 + Math.sin(time * 0.15) * 0.06 * e;
    /* the bloom blooms with the form and pulses on the chrono cadence */
    glow.material.opacity = e * (0.42 + 0.12 * Math.sin(time * 1.6));
    glow.scale.setScalar(2.2 + e * 6.4);
    setCaption(p);
  }

  function frame() {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    time += Math.min(clock.getDelta(), 0.05);
    material.uniforms.uTime.value = time;
    apply(progress());
    renderer.render(scene, camera);
  }

  function setRunning(next) {
    if (next === running) return;
    running = next;
    if (running) { clock.getDelta(); frame(); }
    else cancelAnimationFrame(rafId);
  }

  if (reduced) {
    /* one settled frame, no scrubbing, no rAF churn */
    material.uniforms.uTime.value = 1.2;
    apply(STILL_P);
    renderer.render(scene, camera);
    staticFrame = true;   /* resize() now repaints instead of blanking */
    running = false;
  } else {
    let intersecting = true;
    const io = new IntersectionObserver((entries) => {
      intersecting = entries[entries.length - 1].isIntersecting;
      setRunning(intersecting && !document.hidden);
    }, { rootMargin: '10% 0px' });
    io.observe(section || canvas);
    const onVis = () => setRunning(intersecting && !document.hidden);
    document.addEventListener('visibilitychange', onVis);
    frame();

    return {
      destroy() {
        setRunning(false);
        io.disconnect();
        ro.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      },
    };
  }

  return {
    destroy() {
      ro.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

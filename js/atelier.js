/* Runway 8888 atelier: the couture engine. A figure woven from tens of
   thousands of points of light, turning above a reflective runway — but
   here the silhouette itself is parametric. Each look reshapes the
   garment in the vertex shader: hem flare, train, collar, shoulder
   architecture, fabric turbulence and flow, digital glitch, and an aura
   system (veil ribbons / halo rings / rising motes). Everything lerps,
   so one look melts into the next. */

import * as THREE from '../vendor/three.module.min.js';

const BODY = { HEAD: 0, TORSO: 1, ARM: 2, GOWN: 3, AURA: 4 };

function luminance(hex) {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

const figureVertex = /* glsl */ `
  attribute vec3 aParam;   /* x: angle, y: height fraction, z: random */
  attribute float aBody;
  uniform float uTime;
  uniform float uReveal;
  uniform float uMirror;
  uniform float uPixelRatio;
  uniform float uFlare;
  uniform float uTrain;
  uniform float uHem;
  uniform float uShoulder;
  uniform float uCollar;
  uniform float uTurb;
  uniform float uFlow;
  uniform float uGlitch;
  uniform float uAura;
  uniform float uVeil;
  varying float vH;
  varying float vRand;
  varying float vBody;
  varying float vAlpha;

  void main() {
    float a = aParam.x;
    float h = aParam.y;
    float rnd = aParam.z;
    vec3 p = vec3(0.0);
    float hOut = h;

    float sway = sin(uTime * 0.9) * 0.06;
    float flowT = uTime * uFlow;

    if (aBody < 0.5) {
      /* head */
      float r = 0.34;
      float ph = rnd * 6.2831;
      p = vec3(cos(a) * sin(ph) * r, 5.62 + cos(ph) * r * 1.12, sin(a) * sin(ph) * r);
    } else if (aBody < 1.5) {
      /* torso: waist to shoulders; collar builds a wall at the neck */
      float sh = mix(1.0, uShoulder, smoothstep(0.55, 1.0, h));
      float r = mix(0.34, 0.52, smoothstep(0.2, 1.0, h)) * sh * (0.92 + rnd * 0.14);
      r += uCollar * 0.16 * smoothstep(0.72, 0.98, h);
      float y = mix(3.6, 5.25 + uCollar * 0.22, h);
      p = vec3(cos(a) * r, y, sin(a) * r * 0.72);
      p.x += sway * h * 0.4;
    } else if (aBody < 2.5) {
      /* arms: two soft arcs, pushed out by shoulder architecture */
      float side = sign(rnd - 0.5);
      float t = h;
      float y = mix(5.1, 3.4, t);
      float out1 = (0.6 + sin(t * 3.14159) * 0.18 + fract(rnd * 13.7) * 0.08)
                 * mix(1.0, uShoulder, 0.6);
      p = vec3(side * out1, y, sin(t * 2.6 + flowT * 0.8) * 0.09 - 0.05 + fract(rnd * 7.3) * 0.1);
      p.x += sway * (1.0 - t) * 0.5;
    } else if (aBody < 3.5) {
      /* gown: waist (h=1) to hem (h=0); flare, hem height, train and
         turbulence are all couture parameters */
      float flow1 = sin(a * 3.0 + flowT * 1.1 + (1.0 - h) * 4.2) * 0.24 * uTurb;
      float flow2 = sin(a * 7.0 - flowT * 1.6 + rnd * 6.2) * 0.09 * uTurb;
      float flare = mix(2.35 * uFlare, 0.36, pow(h, 0.72));
      float r = flare + (flow1 + flow2) * (1.0 - h) * (0.6 + rnd * 0.4);
      float y = mix(0.02 + uHem * 3.1, 3.65, h);
      float train = pow(1.0 - h, 2.0) * 1.15 * uTrain;
      p = vec3(cos(a) * r, y + sin(a * 2.0 + flowT * 1.3) * 0.05 * (1.0 - h) * uTurb,
               sin(a) * r * 0.82 + train * 0.55);
      p.x += sway * (1.0 - h * 0.5);
    } else {
      /* aura */
      if (uAura < 0.5) {
        /* veil: ribbons spiralling upward around the figure */
        float t = fract(h + uTime * 0.03 * (0.5 + rnd));
        float r = 1.05 + sin(t * 9.0 + rnd * 6.2) * 0.22 + rnd * 0.35;
        float ang = a + t * 5.2 + uTime * 0.22;
        p = vec3(cos(ang) * r, t * 6.1, sin(ang) * r * 0.9);
        hOut = t;
      } else if (uAura < 1.5) {
        /* halo: twin rings turning above the crown */
        float ring = step(0.5, rnd);
        float rr = mix(0.55, 0.85, ring) + sin(uTime * 1.5 + rnd * 6.2831) * 0.02;
        float ang = a + uTime * (ring > 0.5 ? -0.34 : 0.46);
        float yy = 6.04 + ring * 0.26 + sin(ang * 3.0 + uTime) * 0.03;
        p = vec3(cos(ang) * rr, yy, sin(ang) * rr);
        hOut = mix(0.75, 0.98, fract(rnd * 17.0));
      } else {
        /* rising motes: embers, pollen, dust, signal — hem to sky */
        float t = fract(h + uTime * 0.05 * (0.35 + rnd));
        float rr = mix(2.1 * uFlare, 0.45, t) * (0.65 + fract(rnd * 23.0) * 0.6);
        float ang = a + t * 2.2 + uTime * 0.12;
        p = vec3(cos(ang) * rr, 0.05 + t * 6.4, sin(ang) * rr * 0.85);
        hOut = t;
      }
    }

    /* digital glitch: quantized displacement bursts */
    if (uGlitch > 0.001 && aBody > 0.5) {
      float gseed = floor(uTime * 9.0) * 0.37 + floor(rnd * 64.0);
      float gr = fract(sin(gseed) * 43758.5453);
      float trigger = step(1.0 - uGlitch * 0.07, gr);
      p.x += trigger * (fract(gseed * 1.7) - 0.5) * 0.9;
      p.z += trigger * (fract(gseed * 2.3) - 0.5) * 0.4;
    }

    /* slow turntable */
    float rot = uTime * 0.14;
    float cs = cos(rot); float sn = sin(rot);
    p.xz = mat2(cs, -sn, sn, cs) * p.xz;

    p.y += sin(uTime * 1.2) * 0.045;
    p.y += (1.0 - uReveal) * -0.5;
    p.y *= mix(1.0, -1.0, uMirror);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float size = mix(1.4, 2.6, rnd);
    gl_PointSize = size * uPixelRatio * (7.5 / -mv.z);

    vH = hOut;
    vRand = rnd;
    vBody = aBody;
    float tw = 0.72 + 0.28 * sin(uTime * (1.0 + rnd * 2.0) + rnd * 40.0);
    vAlpha = tw * uReveal * mix(1.0, 0.16, uMirror);
    if (aBody > 3.5) vAlpha *= uVeil;                     /* aura density */
    else if (aBody > 1.5 && aBody < 2.5) vAlpha *= 0.55;  /* arms stay soft */
  }
`;

const figureFragment = /* glsl */ `
  uniform vec3 uCols[5];
  uniform float uPrismatic;
  uniform float uTime;
  varying float vH;
  varying float vRand;
  varying float vBody;
  varying float vAlpha;

  vec3 hsv2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z * mix(vec3(1.0), rgb, c.y);
  }

  vec3 palette(float t) {
    vec3 c = mix(uCols[0], uCols[1], smoothstep(0.0, 0.3, t));
    c = mix(c, uCols[2], smoothstep(0.3, 0.55, t));
    c = mix(c, uCols[3], smoothstep(0.55, 0.8, t));
    c = mix(c, uCols[4], smoothstep(0.8, 1.0, t));
    return c;
  }

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float disc = smoothstep(0.5, 0.1, length(uv));
    if (disc < 0.01) discard;

    float t = vH;
    if (vBody < 0.5) t = 0.95;                    /* head: brightest */
    else if (vBody < 1.5) t = mix(0.55, 0.9, vH);
    else if (vBody < 2.5) t = 0.7;
    else if (vBody > 3.5) t = mix(0.55, 0.98, vH); /* aura brightens as it climbs */
    else t = mix(0.06, 0.62, vH);                 /* gown: hem darkest */

    vec3 col;
    if (uPrismatic > 0.5) {
      col = hsv2rgb(vec3(fract(t * 0.7 + uTime * 0.04 + vRand * 0.08), 0.55, 1.0));
    } else {
      col = palette(t);
      /* keep the silhouette readable on the void */
      col = max(col, col * 0.4 + vec3(0.045, 0.05, 0.055));
      /* a few points of the brightest thread sparkle */
      if (vRand > 0.965) col = uCols[4] * 1.35 + vec3(0.2);
    }

    gl_FragColor = vec4(col, disc * vAlpha);
  }
`;

const floorVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const floorFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uAccent;
  varying vec2 vUv;
  void main() {
    /* vUv.y runs along the runway length (far 1 -> near 0) */
    float center = smoothstep(0.5, 0.0, abs(vUv.x - 0.5));
    float ticks = smoothstep(0.985, 1.0, sin((vUv.y * 46.0) + uTime * 1.4) * 0.5 + 0.5);
    float fade = smoothstep(1.0, 0.25, vUv.y);
    vec3 base = vec3(0.016, 0.02, 0.024) * center;
    vec3 glowline = uAccent * 0.55 * pow(center, 6.0);
    vec3 tickCol = uAccent * ticks * 0.5 * center;
    vec3 col = (base + glowline * 0.5 + tickCol) * fade;
    float edge = pow(center, 2.2) * fade;
    gl_FragColor = vec4(col, edge * 0.85);
  }
`;

/* silhouette uniforms that lerp between looks */
const SHAPE_KEYS = ['flare', 'train', 'hem', 'shoulder', 'collar', 'turb', 'flow', 'glitch', 'veil'];
const UNIFORM_OF = {
  flare: 'uFlare', train: 'uTrain', hem: 'uHem', shoulder: 'uShoulder',
  collar: 'uCollar', turb: 'uTurb', flow: 'uFlow', glitch: 'uGlitch', veil: 'uVeil',
};

export function initAtelier(canvas, { reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 80);
  camera.position.set(0, 3.1, 10.6);
  camera.lookAt(0, 2.9, 0);

  const COUNT = matchMedia('(max-width: 760px)').matches ? 16000 : 42000;
  const params = new Float32Array(COUNT * 3);
  const bodies = new Float32Array(COUNT);
  const positions = new Float32Array(COUNT * 3); /* unused by shader, required attribute */

  for (let i = 0; i < COUNT; i++) {
    const r = Math.random();
    let body;
    if (r < 0.05) body = BODY.HEAD;
    else if (r < 0.2) body = BODY.TORSO;
    else if (r < 0.26) body = BODY.ARM;
    else if (r < 0.9) body = BODY.GOWN;
    else body = BODY.AURA;
    bodies[i] = body;
    params[i * 3] = Math.random() * Math.PI * 2;
    params[i * 3 + 1] = Math.random();
    params[i * 3 + 2] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aParam', new THREE.BufferAttribute(params, 3));
  geometry.setAttribute('aBody', new THREE.BufferAttribute(bodies, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 3, 0), 12);

  const current = [0, 1, 2, 3, 4].map(() => new THREE.Color('#00ffb3'));
  const target = [0, 1, 2, 3, 4].map(() => new THREE.Color('#00ffb3'));

  const shape = { flare: 1, train: 1, hem: 0, shoulder: 1, collar: 0, turb: 1, flow: 1, glitch: 0, veil: 0.5 };
  const shapeTarget = { ...shape };
  let aura = 0;

  function makeFigureMaterial(mirror) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uReveal: { value: 0 },
        uMirror: { value: mirror },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uCols: { value: current },
        uPrismatic: { value: 0 },
        uFlare: { value: 1 },
        uTrain: { value: 1 },
        uHem: { value: 0 },
        uShoulder: { value: 1 },
        uCollar: { value: 0 },
        uTurb: { value: 1 },
        uFlow: { value: 1 },
        uGlitch: { value: 0 },
        uAura: { value: 0 },
        uVeil: { value: 0.5 },
      },
      vertexShader: figureVertex,
      fragmentShader: figureFragment,
    });
  }

  const figure = new THREE.Points(geometry, makeFigureMaterial(0));
  const reflection = new THREE.Points(geometry, makeFigureMaterial(1));
  scene.add(figure, reflection);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 30),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uAccent: { value: new THREE.Color('#00ffb3') },
      },
      vertexShader: floorVertex,
      fragmentShader: floorFragment,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -4);
  scene.add(floor);

  const pointer = { x: 0, tx: 0 };
  const onPointer = (e) => {
    pointer.tx = (e.clientX / innerWidth - 0.5) * 2;
  };
  if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true });

  function resize() {
    const holder = canvas.parentElement;
    const w = holder.clientWidth;
    const h = holder.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);

  let running = true;
  let rafId = 0;
  let reveal = reduced ? 1 : 0;
  let prismatic = 0;
  let prismaticTarget = 0;
  let time = 0;
  const clock = new THREE.Clock();
  const REDUCED_TIME = 4.2;

  function frame() {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;
    const t = reduced ? REDUCED_TIME : time;

    reveal += (1 - reveal) * Math.min(1, dt * 1.6);
    prismatic += (prismaticTarget - prismatic) * Math.min(1, dt * 3);

    const k = 1 - Math.exp(-dt * 3.2);
    for (let i = 0; i < 5; i++) current[i].lerp(target[i], k);
    for (const key of SHAPE_KEYS) shape[key] += (shapeTarget[key] - shape[key]) * k;

    for (const mat of [figure.material, reflection.material]) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uReveal.value = reveal;
      mat.uniforms.uPrismatic.value = prismatic;
      mat.uniforms.uAura.value = aura;
      for (const key of SHAPE_KEYS) mat.uniforms[UNIFORM_OF[key]].value = shape[key];
    }
    floor.material.uniforms.uTime.value = t;
    floor.material.uniforms.uAccent.value.copy(current[4]).lerp(new THREE.Color('#ffffff'), 0.1);

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    camera.position.x = pointer.x * 1.2;
    camera.lookAt(0, 2.9, 0);

    renderer.render(scene, camera);
  }

  function setRunning(next) {
    if (next === running) return;
    running = next;
    if (running) {
      clock.getDelta();
      frame();
    } else {
      cancelAnimationFrame(rafId);
    }
  }

  let intersecting = true;
  const io = new IntersectionObserver((entries) => {
    intersecting = entries[entries.length - 1].isIntersecting;
    setRunning(intersecting && !document.hidden);
  });
  io.observe(canvas);
  const onVisibility = () => setRunning(intersecting && !document.hidden);
  document.addEventListener('visibilitychange', onVisibility);

  frame();

  return {
    setLook(look) {
      prismaticTarget = look.prismatic ? 1 : 0;
      const defaults = { flare: 1, train: 1, hem: 0, shoulder: 1, collar: 0, turb: 1, flow: 1, glitch: 0, veil: 0.5 };
      const s = look.silhouette ?? {};
      for (const key of SHAPE_KEYS) shapeTarget[key] = s[key] ?? defaults[key];
      aura = s.aura ?? 0;
      const hexes = look.colors ?? ['#2b2b31', '#4a4457', '#6b5f8a', '#9c8fb8', '#cbb8ff'];
      const sorted = [...hexes].sort((a, b) => luminance(a) - luminance(b));
      sorted.forEach((hex, i) => target[i].set(hex));
    },
    destroy() {
      setRunning(false);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      geometry.dispose();
      figure.material.dispose();
      reflection.material.dispose();
      floor.geometry.dispose();
      floor.material.dispose();
      renderer.dispose();
    },
  };
}

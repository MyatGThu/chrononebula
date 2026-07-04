/* Runway 8888 atelier: the couture engine. Each look is woven from the
   pixels of an atelier photograph (assets/outfits/*.jpg): the image is
   sampled on the CPU — luminance-weighted so light-catching fabric gets
   the particles — and every pixel becomes a point of light with real
   image color and a cylindrical depth bow so the figure reads as a
   volume, not a poster. Look changes morph particle-by-particle, with a
   swirl at mid-flight. */

import * as THREE from '../vendor/three.module.min.js';

const vertexShader = /* glsl */ `
  attribute vec3 aPos0;
  attribute vec3 aPos1;
  attribute vec3 aCol0;
  attribute vec3 aCol1;
  attribute float aRand;
  uniform float uTime;
  uniform float uMorph;    /* 0 = slot A, 1 = slot B */
  uniform float uReveal;
  uniform float uMirror;
  uniform float uResolve;  /* 0 = living particles, 1 = settled into the photograph */
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vRand;
  varying float vAlpha;

  void main() {
    float e = uMorph * uMorph * (3.0 - 2.0 * uMorph);
    vec3 p = mix(aPos0, aPos1, e);
    vColor = mix(aCol0, aCol1, e);

    /* eased settling so motion drains out gently instead of stopping */
    float settle = uResolve * uResolve * (3.0 - 2.0 * uResolve);
    float live = 1.0 - settle;

    /* swirl while in flight between looks (zero at both endpoints) */
    float fl = sin(3.14159 * e);
    p.x += fl * sin(aRand * 40.0 + uTime * 2.1) * 0.4 * aRand;
    p.z += fl * cos(aRand * 31.0 + uTime * 1.7) * 0.35;
    p.y += fl * sin(aRand * 23.0 + uTime) * 0.28;

    /* living fabric: gentle flow, stronger toward the hem; stills as the
       weave settles into the photograph */
    float hem = 1.0 - clamp(p.y / 6.0, 0.0, 1.0);
    p.x += sin(p.y * 1.6 + uTime * 0.9 + aRand * 6.28) * 0.03 * (0.4 + hem) * live;
    p.z += cos(p.y * 1.2 - uTime * 0.7 + aRand * 4.0) * 0.025 * (0.4 + hem) * live;

    /* settling flattens the cylindrical bow onto the picture plane */
    p.z *= live;

    /* oscillating turntable: enough to feel the volume, never the back;
       eases to front-facing as the photograph resolves */
    float rot = sin(uTime * 0.16) * 0.5 * live;
    float cs = cos(rot); float sn = sin(rot);
    p.xz = mat2(cs, -sn, sn, cs) * p.xz;

    p.y += sin(uTime * 1.2) * 0.04 * live;
    p.y += (1.0 - uReveal) * -0.5;
    p.y *= mix(1.0, -1.0, uMirror);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    /* points condense as they settle into the pixels they came from */
    float size = mix(1.5, 2.7, aRand);
    gl_PointSize = size * uPixelRatio * (7.5 / -mv.z) * mix(1.0, 0.72, settle);

    vRand = aRand;
    float tw = 0.78 + 0.22 * sin(uTime * (1.0 + aRand * 2.0) + aRand * 40.0);
    /* particles linger while the photograph's highlights crystallize,
       then hand their light over as its shadows fill in */
    vAlpha = tw * uReveal * mix(1.0, 0.16, uMirror)
           * mix(1.0, 0.08, smoothstep(0.1, 0.85, uResolve));
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vRand;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float disc = smoothstep(0.5, 0.1, length(uv));
    if (disc < 0.01) discard;

    /* lift the darks so black memory-silk still reads on the void */
    vec3 col = vColor * 1.22;
    col = max(col, col * 0.4 + vec3(0.04, 0.045, 0.05));
    /* the brightest threads sparkle */
    if (vRand > 0.965) col += vColor * 0.9 + vec3(0.18);

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

/* ------------------------------------------------------- image weaving -- */

const FIG_HEIGHT = 6.1;   /* world units, floor to crown */

function sampleImage(img, count) {
  const W = 200;
  const H = Math.max(1, Math.round((W * img.naturalHeight) / img.naturalWidth));
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H).data;

  /* collect lit pixels, weighted by luminance */
  const px = [];
  const weights = [];
  let total = 0;
  const hist = new Uint32Array(256);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      /* sources are background-removed cutouts flattened onto black, so
         anything above JPEG ringing level is garment */
      if (lum < 14) continue;
      px.push(x, y, r, g, b);
      total += lum + 14;                     /* darks keep a small chance */
      weights.push(total);
      hist[Math.min(255, lum | 0)]++;
    }
  }

  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const aspect = W / H;
  if (!weights.length) return { pos, col, aspect, lift: 1 };  /* blank image: collapse to origin */

  /* exposure normalization: near-black couture (obsidian plate, void
     memorysilk) would weave and crystallize almost invisibly, since both
     the particles and the photo gate run on luminance. The MEDIAN lit
     pixel is the garment (skin and specular highlights would drag a mean
     up), so lift dark images by their median toward a common exposure —
     applied as a highlight-preserving curve so faces never clip. */
  let medianLum = 255;
  for (let acc = 0, m = 0; m < 256; m++) {
    acc += hist[m];
    if (acc >= weights.length / 2) { medianLum = m; break; }
  }
  const lift = Math.min(2.6, Math.max(1, 115 / Math.max(1, medianLum)));
  const tone = (v) => (v * lift) / (1 + v * (lift - 1));

  const worldW = FIG_HEIGHT * (W / H);
  for (let i = 0; i < count; i++) {
    /* weighted pick via binary search on the prefix sums */
    const t = Math.random() * total;
    let lo = 0, hi = weights.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (weights[mid] < t) lo = mid + 1; else hi = mid;
    }
    const j = lo * 5;
    const sx = px[j] + Math.random() - 0.5;
    const sy = px[j + 1] + Math.random() - 0.5;
    const r = px[j + 2] / 255, g = px[j + 3] / 255, b = px[j + 4] / 255;

    const nx = sx / W - 0.5;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    /* cylindrical bow + fabric thickness + bright threads sit proud */
    const z = Math.cos(nx * Math.PI) * 0.42 + (Math.random() - 0.5) * 0.16 + lum * 0.14;

    pos[i * 3] = nx * worldW;
    pos[i * 3 + 1] = (1 - sy / H) * FIG_HEIGHT + 0.05;
    pos[i * 3 + 2] = z;
    col[i * 3] = tone(r);
    col[i * 3 + 1] = tone(g);
    col[i * 3 + 2] = tone(b);
  }
  return { pos, col, aspect, lift };
}

const imageCache = new Map();
function loadImage(src) {
  if (!imageCache.has(src)) {
    imageCache.set(src, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    }));
  }
  return imageCache.get(src);
}

function brightest(hexes) {
  if (!hexes || !hexes.length) return '#00ffb3';
  let best = hexes[0], bestL = -1;
  for (const hex of hexes) {
    const c = new THREE.Color(hex);
    const l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    if (l > bestL) { bestL = l; best = hex; }
  }
  return best;
}

/* --------------------------------------------------------------- engine -- */

export function initAtelier(canvas, { reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 80);
  camera.position.set(0, 3.1, 10.6);
  camera.lookAt(0, 2.9, 0);

  const COUNT = matchMedia('(max-width: 760px)').matches ? 16000 : 42000;

  const geometry = new THREE.BufferGeometry();
  const posA = new Float32Array(COUNT * 3);
  const posB = new Float32Array(COUNT * 3);
  const colA = new Float32Array(COUNT * 3);
  const colB = new Float32Array(COUNT * 3);
  const rand = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) rand[i] = Math.random();

  /* slot A opens as a scattered nebula — dim emerald and silver dust
     filling the stage — so the first look ASSEMBLES out of it */
  for (let i = 0; i < COUNT; i++) {
    const r = 5 + Math.random() * 10;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    posA[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    posA[i * 3 + 1] = Math.random() * 8.5 - 0.5;
    posA[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r * 0.6 - 1.5;
    const t = Math.random();
    if (t > 0.8) {
      /* silver-white grains */
      colA[i * 3] = colA[i * 3 + 1] = colA[i * 3 + 2] = 0.35 + t * 0.3;
    } else {
      /* nebula emerald dust */
      colA[i * 3] = 0.02 + t * 0.06;
      colA[i * 3 + 1] = 0.3 + t * 0.45;
      colA[i * 3 + 2] = 0.24 + t * 0.3;
    }
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
  geometry.setAttribute('aPos0', new THREE.BufferAttribute(posA, 3));
  geometry.setAttribute('aPos1', new THREE.BufferAttribute(posB, 3));
  geometry.setAttribute('aCol0', new THREE.BufferAttribute(colA, 3));
  geometry.setAttribute('aCol1', new THREE.BufferAttribute(colB, 3));
  geometry.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 3, 0), 12);

  function makeFigureMaterial(mirror) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uMorph: { value: 0 },
        uReveal: { value: 0 },
        uMirror: { value: mirror },
        uResolve: { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
      },
      vertexShader,
      fragmentShader,
    });
  }

  const figure = new THREE.Points(geometry, makeFigureMaterial(0));
  const reflection = new THREE.Points(geometry, makeFigureMaterial(1));
  scene.add(figure, reflection);

  /* the photograph the particles settle into: an additively blended
     plane, so its black void adds nothing and only the outfit shows.
     A raw shader keeps its colors byte-identical to the sampled points. */
  function makePhotoMaterial() {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      /* pure RGB addition that leaves destination alpha untouched — the
         canvas is composited over the page, so writing alpha would make
         the plane's black void occlude the CSS backdrop as a rectangle */
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendEquationAlpha: THREE.AddEquation,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
      uniforms: {
        uMap: { value: null },
        uProgress: { value: 0 },
        uStrength: { value: 1 },
        uLift: { value: 1 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uProgress;
        uniform float uStrength;
        uniform float uLift;
        varying vec2 vUv;
        void main() {
          vec3 col = texture2D(uMap, vUv).rgb;
          /* crush the JPEG noise floor so the plane's black void adds
             nothing over the stage */
          col = max(col - 0.05, 0.0) / 0.95;
          /* per-image exposure lift, matched to the woven particles:
             a highlight-preserving curve, not a linear gain */
          col = col * uLift / (vec3(1.0) + col * (uLift - 1.0));
          /* the photograph materializes by luminance: its brightest
             threads crystallize first, shadows fill in last (and the
             reverse when dissolving back to dust) */
          float l = clamp(dot(col, vec3(0.299, 0.587, 0.114)) * 1.7, 0.0, 1.0);
          float start = (1.0 - l) * 0.62;
          float gate = smoothstep(start, start + 0.38, uProgress);
          gl_FragColor = vec4(col * gate * uStrength, 0.0);
        }
      `,
    });
  }
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), makePhotoMaterial());
  const photoMirror = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), makePhotoMaterial());
  photoMirror.scale.y = -1;
  photoMirror.material.uniforms.uStrength.value = 0.1;
  photo.visible = photoMirror.visible = false;
  scene.add(photo, photoMirror);

  const accent = new THREE.Color('#00ffb3');
  const accentTarget = new THREE.Color('#00ffb3');
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 30),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uAccent: { value: accent },
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
    /* measure the canvas itself: on small screens the stage is a flex
       column (canvas + controls + panel), so the parent is much taller
       than the canvas and would squash the framing */
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  let running = true;
  let rafId = 0;
  let reveal = reduced ? 1 : 0;
  let time = 0;
  let morph = 0;              /* rendered value */
  let morphTarget = 0;        /* 0 = slot A front, 1 = slot B front */
  let resolve = 0;            /* rendered value */
  let resolveTarget = 0;      /* 1 = settled into the photograph */
  let hold = 0;               /* seconds the assembled weave has been held */
  let pending = null;         /* next look, sampled and waiting for the stage */
  let firstLook = true;
  let lookToken = 0;
  const clock = new THREE.Clock();
  const REDUCED_TIME = 4.2;
  const HOLD_SECONDS = reduced ? 0.2 : 0.7;

  function applyPending() {
    const { pos, col, img, aspect, lift } = pending;
    pending = null;
    hold = 0;
    if (firstLook) {
      /* the entrance: slot A holds the scattered nebula, so morphing
         to slot B assembles the dust into the outfit */
      geometry.attributes.aPos1.array.set(pos);
      geometry.attributes.aPos1.needsUpdate = true;
      geometry.attributes.aCol1.array.set(col);
      geometry.attributes.aCol1.needsUpdate = true;
      morphTarget = 1;
      firstLook = false;
    } else {
      const toB = morphTarget < 0.5;       /* write into the back slot */
      geometry.attributes[toB ? 'aPos1' : 'aPos0'].array.set(pos);
      geometry.attributes[toB ? 'aPos1' : 'aPos0'].needsUpdate = true;
      geometry.attributes[toB ? 'aCol1' : 'aCol0'].array.set(col);
      geometry.attributes[toB ? 'aCol1' : 'aCol0'].needsUpdate = true;
      morphTarget = toB ? 1 : 0;
    }
    /* stage the photograph the weave will settle into */
    const tex = new THREE.Texture(img);
    tex.needsUpdate = true;
    for (const mesh of [photo, photoMirror]) {
      const old = mesh.material.uniforms.uMap.value;
      mesh.material.uniforms.uMap.value = tex;
      mesh.material.uniforms.uLift.value = lift;
      if (old && old !== tex) old.dispose();
    }
    const w = FIG_HEIGHT * aspect;
    photo.scale.set(w, FIG_HEIGHT, 1);
    photoMirror.scale.set(w, -FIG_HEIGHT, 1);
    photo.visible = photoMirror.visible = true;
  }

  function frame() {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;
    const t = reduced ? REDUCED_TIME : time;

    reveal += (1 - reveal) * Math.min(1, dt * 1.6);
    morph += (morphTarget - morph) * Math.min(1, dt * (reduced ? 8 : 2.2));
    /* settling is unhurried; dissolving back to particles is quicker */
    const rk = resolveTarget > resolve ? 1.05 : 2.4;
    resolve += (resolveTarget - resolve) * Math.min(1, dt * (reduced ? 8 : rk));
    accent.lerp(accentTarget, 1 - Math.exp(-dt * 3.2));

    /* choreography: dissolve -> reweave -> hold -> settle into the photo */
    if (pending && resolve < 0.06) applyPending();
    else if (!pending && resolveTarget < 1 && Math.abs(morph - morphTarget) < 0.04) {
      hold += dt;
      if (hold > HOLD_SECONDS) resolveTarget = 1;
    }

    for (const mat of [figure.material, reflection.material]) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uReveal.value = reveal;
      mat.uniforms.uMorph.value = morph;
      mat.uniforms.uResolve.value = resolve;
    }

    /* the photograph shares the weave's easing turntable and breath so
       the settle is seamless (same eased curve as the vertex shader) */
    const settle = resolve * resolve * (3 - 2 * resolve);
    const live = 1 - settle;
    const rot = Math.sin(t * 0.16) * 0.5 * live;
    const bob = Math.sin(t * 1.2) * 0.04 * live;
    const midY = FIG_HEIGHT / 2 + 0.05;
    photo.rotation.y = photoMirror.rotation.y = rot;
    photo.position.y = midY + bob;
    photoMirror.position.y = -(midY + bob);
    photo.material.uniforms.uProgress.value = resolve * reveal;
    photoMirror.material.uniforms.uProgress.value = resolve * reveal;

    floor.material.uniforms.uTime.value = t;

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

  const inspectCorner = new THREE.Vector3();

  return {
    /* screen-space rect of the settled photograph (canvas CSS px), or
       null while the weave is still particles — drives the inspect loupe */
    inspect() {
      if (!photo.visible || resolve < 0.9) return null;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return null;
      photo.updateWorldMatrix(true, false);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [cx, cy] of [[-0.5, 0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, -0.5]]) {
        inspectCorner.set(cx, cy, 0).applyMatrix4(photo.matrixWorld).project(camera);
        const x = (inspectCorner.x * 0.5 + 0.5) * w;
        const y = (-inspectCorner.y * 0.5 + 0.5) * h;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      return {
        x: minX, y: minY, w: maxX - minX, h: maxY - minY,
        lift: photo.material.uniforms.uLift.value,
      };
    },
    setLook(look) {
      accentTarget.set(brightest(look.colors));
      const token = ++lookToken;
      /* the settled photograph dissolves back into particles while the
         next look loads; applyPending() fires once the stage is dust */
      resolveTarget = 0;
      hold = 0;
      loadImage(look.image).then((img) => {
        if (token !== lookToken) return;     /* superseded by a later pick */
        const { pos, col, aspect, lift } = sampleImage(img, COUNT);
        pending = { pos, col, img, aspect, lift };
      }).catch(() => {});                    /* missing image: keep current */
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
      for (const mesh of [photo, photoMirror]) {
        mesh.geometry.dispose();
        if (mesh.material.uniforms.uMap.value) mesh.material.uniforms.uMap.value.dispose();
        mesh.material.dispose();
      }
      floor.geometry.dispose();
      floor.material.dispose();
      renderer.dispose();
    },
  };
}

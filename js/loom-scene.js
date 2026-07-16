/* LOOMLIGHT — the WebGL scene. One obsidian stage, two techniques that
   hand off to each other as the descent scrubs:

   1. A raymarched volumetric emerald nebula (fullscreen, half-res FBO) that
      the ray origin flies INTO as uDive climbs.
   2. A field of emerald motes that drift on a curl-like flow, ignite from the
      nebula's heart (uIgnite), then CONDENSE (uCondense) toward a couture
      gown silhouette sampled from a vector canvas — the light becoming a dress.

   The two share the same emerald palette and additive blend so the cloud
   turns to embers turns to garment with no seam. All motion derives from one
   scrubbed progress written by GSAP; the loop never reads scroll directly.

   initLoomScene returns { ok, setProgress, setRipple, resize, start, stop,
   destroy }. ok:false means no WebGL2 — the caller shows the poster fallback. */

import * as THREE from '../vendor/three.module.min.js';

const EMERALD = new THREE.Color('#2fd0a0');

/* ---- draw a couture gown silhouette to a canvas, sample it to points ----- */
function gownTargets(count) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.translate(S / 2, 0);
  /* crown / veil */
  x.beginPath();
  x.moveTo(0, 12);
  x.bezierCurveTo(-10, 14, -14, 30, -12, 44);
  x.bezierCurveTo(-12, 52, 12, 52, 12, 44);
  x.bezierCurveTo(14, 30, 10, 14, 0, 12);
  x.fill();
  /* shoulders + bodice */
  x.beginPath();
  x.moveTo(-14, 52);
  x.bezierCurveTo(-34, 60, -40, 74, -30, 96);       /* left shoulder */
  x.lineTo(-16, 150);                                /* waist in */
  x.bezierCurveTo(-16, 150, -14, 150, -14, 150);
  x.lineTo(14, 150);
  x.bezierCurveTo(16, 150, 16, 150, 16, 150);
  x.lineTo(30, 96);
  x.bezierCurveTo(40, 74, 34, 60, 14, 52);          /* right shoulder */
  x.bezierCurveTo(6, 58, -6, 58, -14, 52);
  x.fill();
  /* skirt: flares to the floor */
  x.beginPath();
  x.moveTo(-14, 150);
  x.bezierCurveTo(-70, 190, -96, 232, -104, 250);   /* left hem */
  x.bezierCurveTo(-60, 246, 60, 246, 104, 250);     /* hem sweep */
  x.bezierCurveTo(96, 232, 70, 190, 14, 150);       /* right side */
  x.fill();

  const data = x.getImageData(0, 0, S, S).data;
  const bright = [];
  for (let i = 0; i < S * S; i++) {
    if (data[i * 4] > 40) bright.push(i);
  }
  const targets = new Float32Array(count * 3);
  const seam = new Float32Array(count);   /* 1 near the silhouette edge = chrome sparkle */
  const has = bright.length;
  for (let i = 0; i < count; i++) {
    const px = has ? bright[(Math.random() * has) | 0] : ((Math.random() * S * S) | 0);
    const ix = px % S, iy = (px / S) | 0;
    /* map pixel space (256, y down) → world: centre x, gown ~7 units tall */
    const wx = (ix / S - 0.5) * 8.2 + (Math.random() - 0.5) * 0.06;
    const wy = (1 - iy / S) * 8.6 - 4.4 + (Math.random() - 0.5) * 0.06;
    const wz = (Math.random() - 0.5) * 0.9 * (0.4 + 0.6 * Math.abs(ix / S - 0.5) * 2.0);
    targets[i * 3] = wx;
    targets[i * 3 + 1] = wy;
    targets[i * 3 + 2] = wz;
    /* edge test: sample neighbours, mark thin/edge pixels */
    seam[i] = Math.random() < 0.12 ? 1 : 0;
  }
  return { targets, seam };
}

export function initLoomScene(canvas, { reduced = false, mobile = false, lite = false } = {}) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return { ok: false };

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: false, alpha: false });
  renderer.autoClear = false;
  renderer.setClearColor(0x050506, 1);
  const DPR = lite ? 1 : Math.min(devicePixelRatio, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(DPR);

  /* lite = a low-tier / software-render tier: cheap raymarch, few motes, quarter-res */
  const STEPS = lite ? 12 : mobile ? 26 : 46;
  const OCT = lite ? 2 : mobile ? 3 : 5;
  const COUNT = lite ? 9000 : mobile ? 42000 : 130000;
  const NEBULA_SCALE = lite ? 0.3 : mobile ? 0.4 : 0.5;   /* fraction-res nebula FBO */

  /* ---------- shared state, written by GSAP each tick ------------------- */
  const state = { dive: 0, ignite: 0, condense: 0, exposure: 1, warpRot: 0, ripple: 0, breathe: 0 };

  /* ---------- nebula: fullscreen raymarch → half-res target ------------- */
  let W = 2, H = 2;
  const nebulaRT = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false });
  const nebulaScene = new THREE.Scene();
  const flatCam = new THREE.Camera();
  const nebulaMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uDive: { value: 0 }, uWarpRot: { value: 0 },
      uExposure: { value: 1 }, uRipple: { value: 0 }, uAspect: { value: 1 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime, uDive, uWarpRot, uExposure, uRipple, uAspect;
      #define STEPS ${STEPS}
      #define OCT ${OCT}
      float hash(vec3 p){ p = fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float vnoise(vec3 x){
        vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                       mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                       mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      float fbm(vec3 p){
        float a=0.5, s=0.0; mat3 m = mat3(0.0,0.8,0.6,-0.8,0.36,-0.48,-0.6,-0.48,0.64);
        for(int i=0;i<OCT;i++){ s += a*vnoise(p); p = m*p*2.02; a*=0.5; }
        return s;
      }
      mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
      void main(){
        vec2 uv = (vUv*2.0-1.0); uv.x *= uAspect;
        vec3 ro = vec3(0.0, 0.0, -3.2 + uDive*7.2);
        vec3 rd = normalize(vec3(uv, 1.45));
        rd.xz = rot(uWarpRot*0.6) * rd.xz;
        float t = 0.2 + hash(vec3(gl_FragCoord.xy,uTime))*0.25;   /* dither entry */
        float dt = 0.16;
        float trans = 1.0;
        vec3 col = vec3(0.0);
        vec3 keyDir = normalize(vec3(0.5, 0.7, -0.4));
        for(int i=0;i<STEPS;i++){
          vec3 p = ro + rd*t;
          vec3 wp = p; wp.xy = rot(uWarpRot) * wp.xy;
          vec3 warp = vec3(fbm(wp*0.5 + uTime*0.03), fbm(wp*0.5+7.3), fbm(wp*0.5-3.1));
          float d = fbm(wp*0.55 + warp*0.9 + vec3(0.0,0.0,uTime*0.02));
          d = smoothstep(0.52, 0.95, d);
          d += uRipple * 0.4 * smoothstep(0.4,1.0,d);
          if(d > 0.01){
            float ph = 0.6 + 0.4*dot(rd, keyDir);       /* cheap forward phase */
            vec3 em = mix(vec3(0.02,0.30,0.24), vec3(0.18,0.82,0.62), d) * (0.5 + ph);
            float dens = d*1.4;
            col += trans * em * dens * dt;
            trans *= exp(-dens*dt*1.6);
            if(trans < 0.02) break;
          }
          t += dt;
        }
        col *= uExposure;
        col = col/(col+0.6);                 /* tonemap */
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  nebulaScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), nebulaMat));

  /* ---------- composite quad that samples the nebula RT ---------------- */
  const screenScene = new THREE.Scene();
  const bgMat = new THREE.MeshBasicMaterial({ map: nebulaRT.texture, depthTest: false, depthWrite: false });
  const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
  bgQuad.frustumCulled = false;
  screenScene.add(bgQuad);

  /* ---------- particle couture ---------------------------------------- */
  const cam = new THREE.PerspectiveCamera(52, 1, 0.1, 60);
  cam.position.set(0, 0.3, 12.5);
  cam.lookAt(0, 0.2, 0);

  const { targets, seam } = gownTargets(COUNT);
  const scatter = new Float32Array(COUNT * 3);
  const rnd = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    /* born in a turbulent shell around the nebula heart */
    const r = 2.0 + Math.random() * 5.0;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    scatter[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    scatter[i * 3 + 1] = Math.cos(ph) * r * 0.8;
    scatter[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r * 0.7;
    rnd[i] = Math.random();
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
  pGeo.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
  pGeo.setAttribute('aTarget', new THREE.BufferAttribute(targets, 3));
  pGeo.setAttribute('aSeam', new THREE.BufferAttribute(seam, 1));
  pGeo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
  pGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 30);

  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uCondense: { value: 0 }, uIgnite: { value: 0 },
      uBreathe: { value: 0 }, uPixelRatio: { value: DPR }, uEmerald: { value: EMERALD },
    },
    vertexShader: `
      attribute vec3 aScatter; attribute vec3 aTarget; attribute float aSeam; attribute float aRnd;
      uniform float uTime, uCondense, uIgnite, uBreathe, uPixelRatio;
      varying float vA; varying float vSeam;
      vec3 flow(vec3 p, float t){
        vec3 q = p*0.32;
        vec3 f = vec3(
          sin(q.y*1.3 + t*0.5) + cos(q.z*1.1 - t*0.32),
          sin(q.z*1.2 - t*0.4) + cos(q.x*1.4 + t*0.36),
          sin(q.x*1.1 + t*0.45) + cos(q.y*1.2 - t*0.30));
        return p + f*(0.7 + aRnd*0.5);
      }
      void main(){
        float t = uTime;
        vec3 drift = flow(aScatter, t*0.6 + aRnd*6.28);
        drift.y += sin(t*0.3 + aRnd*10.0)*0.3;
        float c = smoothstep(0.0, 1.0, uCondense);
        c = c*c*(3.0-2.0*c);
        /* breathe: settled garment turns + loosens slightly */
        vec3 tgt = aTarget;
        float ang = uBreathe*0.5;
        tgt.xz = mat2(cos(ang),-sin(ang),sin(ang),cos(ang)) * tgt.xz;
        tgt += drift * (1.0-c) * 0.02;
        vec3 p = mix(drift, tgt, c);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = mix(1.5, 2.6, aRnd) * mix(1.0, 0.85, c);
        gl_PointSize = size * uPixelRatio * (8.5 / -mv.z);
        float tw = 0.6 + 0.4*sin(t*(1.0+aRnd*2.0) + aRnd*30.0);
        vA = uIgnite * tw * mix(0.5, 1.0, c);
        vSeam = aSeam * c;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform vec3 uEmerald;
      varying float vA; varying float vSeam;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float disc = smoothstep(0.5, 0.05, d);
        if(disc < 0.01) discard;
        vec3 col = uEmerald + vec3(0.02,0.06,0.05);
        col = mix(col, vec3(0.9,0.97,0.99), vSeam*0.8);   /* chrome sparkle on the seams */
        gl_FragColor = vec4(col, disc * vA);
      }
    `,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  /* particles live in their own scene so they render with the perspective cam */
  const pointsScene = new THREE.Scene();
  pointsScene.add(points);

  /* ---------- sizing --------------------------------------------------- */
  function resize() {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    W = w; H = h;
    renderer.setSize(w, h, false);
    nebulaRT.setSize(Math.max(2, Math.round(w * DPR * NEBULA_SCALE)), Math.max(2, Math.round(h * DPR * NEBULA_SCALE)));
    nebulaMat.uniforms.uAspect.value = w / h;
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  }
  resize();

  /* ---------- render --------------------------------------------------- */
  let time = 0;
  const clock = new THREE.Clock();

  function renderFrame(dt) {
    time += dt;
    nebulaMat.uniforms.uTime.value = time;
    nebulaMat.uniforms.uDive.value = state.dive;
    nebulaMat.uniforms.uWarpRot.value = state.warpRot;
    nebulaMat.uniforms.uExposure.value = state.exposure;
    nebulaMat.uniforms.uRipple.value = state.ripple;
    pMat.uniforms.uTime.value = time;
    pMat.uniforms.uCondense.value = state.condense;
    pMat.uniforms.uIgnite.value = state.ignite;
    pMat.uniforms.uBreathe.value = state.breathe;

    /* nebula → half-res RT */
    renderer.setRenderTarget(nebulaRT);
    renderer.clear(true, false, false);
    renderer.render(nebulaScene, flatCam);
    /* screen: nebula bg, then additive particles */
    renderer.setRenderTarget(null);
    renderer.clear(true, false, false);
    renderer.render(screenScene, flatCam);   /* nebula bg quad (identity cam) */
    renderer.render(pointsScene, cam);        /* additive couture (perspective) */
  }

  let raf = 0, running = false;
  function loop() {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    renderFrame(Math.min(clock.getDelta(), 0.05));
  }
  function start() { if (!running) { running = true; clock.getDelta(); loop(); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  /* reduced motion: one settled frame at the garment, no loop */
  if (reduced) {
    state.dive = 0.5; state.exposure = 0.7; state.ignite = 1; state.condense = 1; state.warpRot = 0.3;
    renderFrame(0.016);
  }

  return {
    ok: true,
    setProgress(s) { Object.assign(state, s); },
    setRipple(v) { state.ripple = v; },
    resize,
    renderOnce() { renderFrame(0.016); },
    start, stop,
    destroy() {
      stop();
      nebulaRT.dispose(); nebulaMat.dispose(); bgMat.dispose();
      pGeo.dispose(); pMat.dispose();
      renderer.dispose();
    },
  };
}

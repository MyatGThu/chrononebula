/* Finale — the world ends by collapsing into a single point of light.
   As the epilogue rises into view, a scattered field of emerald and silver
   motes spirals inward and condenses to one bright star, then blooms. The
   whole thing is a function of the epilogue's scroll progress, so it plays
   forward as you arrive and rewinds if you scroll back up.

   Lazy, paused offscreen, reduced motion renders the settled star. */

import * as THREE from '../vendor/three.module.min.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);

export function initFinale(canvas, { section, reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 12;

  const mobile = matchMedia('(max-width: 760px)').matches;
  const COUNT = mobile ? 4000 : 9000;

  const start = new Float32Array(COUNT * 3);
  const rand = new Float32Array(COUNT);
  const shade = new Float32Array(COUNT);
  let seed = 7;
  const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < COUNT; i++) {
    const r = 4 + rng() * 9;
    const th = rng() * Math.PI * 2;
    const ph = Math.acos(2 * rng() - 1);
    start[i * 3] = Math.sin(ph) * Math.cos(th) * r * 1.5;
    start[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * r;
    start[i * 3 + 2] = Math.cos(ph) * r * 0.7;
    rand[i] = rng();
    shade[i] = rng();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
  geo.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
  geo.setAttribute('aShade', new THREE.BufferAttribute(shade, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 20);

  const uniforms = {
    uTime: { value: 0 },
    uCollapse: { value: reduced ? 0.9 : 0 },   /* 0 scattered → 1 point of light */
    uPixelRatio: { value: renderer.getPixelRatio() },
  };

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms,
    vertexShader: /* glsl */ `
      attribute vec3 aStart;
      attribute float aRand;
      attribute float aShade;
      uniform float uTime;
      uniform float uCollapse;
      uniform float uPixelRatio;
      varying float vAlpha;
      varying float vShade;
      void main(){
        float c = uCollapse;
        /* spiral inward: rotate more the closer to collapse, shrink radius */
        float ang = (1.0 - c) * 0.0 + c * (6.2831 * (1.0 + aRand)) ;
        float ca = cos(ang), sa = sin(ang);
        vec3 p = aStart;
        p.xy = mat2(ca, -sa, sa, ca) * p.xy;
        p *= (1.0 - c * 0.985);                     /* collapse to a point */
        p.y -= c * 3.3;                             /* ...that settles below the text */
        /* drifting shimmer while still scattered */
        float live = 1.0 - c;
        p.x += sin(uTime * 0.6 + aRand * 30.0) * 0.5 * live;
        p.y += cos(uTime * 0.5 + aRand * 24.0) * 0.5 * live;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = mix(1.4, 3.0, aRand) * (1.0 + c * 2.2);
        gl_PointSize = size * uPixelRatio * (10.0 / -mv.z);
        float tw = 0.6 + 0.4 * sin(uTime * (1.0 + aRand * 2.0) + aRand * 40.0);
        vAlpha = tw * mix(0.5, 1.0, c);
        vShade = aShade;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying float vAlpha;
      varying float vShade;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float disc = smoothstep(0.5, 0.05, d);
        if (disc < 0.01) discard;
        vec3 emerald = vec3(0.184, 0.816, 0.627);
        vec3 silver = vec3(0.86, 0.90, 0.93);
        vec3 col = mix(emerald, silver, step(0.7, vShade));
        gl_FragColor = vec4(col, disc * vAlpha * 0.55);
      }
    `,
  });

  scene.add(new THREE.Points(geo, mat));

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (reduced || !running) renderer.render(scene, camera);
  }

  function progress() {
    if (reduced) return 0.9;
    const r = section.getBoundingClientRect();
    /* 0 as the section's top reaches the bottom edge, 1 as it centres */
    return clamp((innerHeight - r.top) / (innerHeight * 0.9), 0, 1);
  }

  let running = !reduced;
  let raf = 0;
  let time = 0;
  const clock = new THREE.Clock();

  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    time += Math.min(clock.getDelta(), 0.05);
    uniforms.uTime.value = time;
    uniforms.uCollapse.value = smooth(progress());
    renderer.render(scene, camera);
  }

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);

  function setRunning(next) {
    if (next === running) return;
    running = next;
    if (running) { clock.getDelta(); frame(); } else cancelAnimationFrame(raf);
  }

  if (reduced) {
    uniforms.uTime.value = 2.0;
    renderer.render(scene, camera);
  } else {
    let inView = true;
    const io = new IntersectionObserver((e) => {
      inView = e[e.length - 1].isIntersecting;
      setRunning(inView && !document.hidden);
    }, { rootMargin: '30% 0px' });
    io.observe(canvas);
    document.addEventListener('visibilitychange', () => setRunning(inView && !document.hidden));
    frame();
  }

  return { destroy() { setRunning(false); ro.disconnect(); geo.dispose(); mat.dispose(); renderer.dispose(); } };
}

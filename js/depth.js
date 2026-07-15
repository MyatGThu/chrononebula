/* Depth — a persistent parallax starfield behind the entire site, so the
   whole atlas floats in 3D space rather than sitting on flat black between
   the set-piece scenes (hero, aurora, monolith, galaxy, finale).

   A single fixed fullscreen canvas. A perspective camera drifts downward
   with scroll, so nearer motes parallax faster than far ones — real depth,
   not a moving flat layer. Deliberately faint: it must never fight the copy.

   Lazy (booted at idle), paused when the tab is hidden, capped resolution.
   Reduced motion renders one still frame and stops. No WebGL: main.js never
   calls this and the obsidian body background stands in. */

import * as THREE from '../vendor/three.module.min.js';

export function initDepth(canvas, { reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 200);
  camera.position.set(0, 0, 32);

  const mobile = matchMedia('(max-width: 760px)').matches;
  const COUNT = mobile ? 1200 : 2600;

  const SPREAD_X = 90;
  const SPREAD_Y = 120;   /* tall: the field scrolls past top to bottom */
  const Z_NEAR = 18;
  const Z_FAR = -46;

  const pos = new Float32Array(COUNT * 3);
  const seed = new Float32Array(COUNT * 3);   /* twinkle phase, size, hue */
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * SPREAD_X;
    pos[i * 3 + 1] = (Math.random() - 0.5) * SPREAD_Y;
    pos[i * 3 + 2] = Z_FAR + Math.random() * (Z_NEAR - Z_FAR);
    seed[i * 3] = Math.random() * 100;                 /* phase */
    seed[i * 3 + 1] = 0.5 + Math.random() * 1.4;       /* size */
    seed[i * 3 + 2] = Math.random();                   /* hue: mostly silver, a few emerald */
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -14), 160);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aSeed;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vAlpha;
      varying float vHue;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float twinkle = 0.55 + 0.45 * sin(uTime * (0.5 + aSeed.y) + aSeed.x * 6.28);
        gl_PointSize = aSeed.y * uPixelRatio * (40.0 / -mv.z);
        /* fade the far plane so the field dissolves into the void, never a wall */
        vAlpha = twinkle * smoothstep(-52.0, -8.0, mv.z) * 0.62;
        vHue = aSeed.z;
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;
      varying float vAlpha;
      varying float vHue;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float disc = smoothstep(0.5, 0.0, d);
        if (disc < 0.01) discard;
        vec3 silver  = vec3(0.72, 0.78, 0.82);
        vec3 emerald = vec3(0.18, 0.78, 0.60);
        vec3 col = mix(silver, emerald, step(0.86, vHue));   /* ~14% emerald motes */
        gl_FragColor = vec4(col, disc * vAlpha);
      }
    `,
  });

  const field = new THREE.Points(geometry, material);
  scene.add(field);

  function resize() {
    const w = innerWidth;
    const h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!running) renderer.render(scene, camera);   /* repaint the static frame */
  }

  /* scroll drift: the camera glides down the field as the page scrolls, so
     near motes sweep past faster than far ones (parallax by depth). */
  let camY = 0;
  function scrollTarget() {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    return -(window.scrollY / max) * 58;   /* total vertical travel through the field */
  }

  let running = !reduced;
  let rafId = 0;
  let time = 0;
  const clock = new THREE.Clock();

  function frame() {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    time += Math.min(clock.getDelta(), 0.05);
    material.uniforms.uTime.value = time;
    /* ease toward the scroll target so it feels weighty; add a slow lateral drift */
    camY += (scrollTarget() - camY) * 0.06;
    camera.position.y = camY;
    camera.position.x = Math.sin(time * 0.04) * 1.6;
    camera.lookAt(0, camY, 0);
    renderer.render(scene, camera);
  }

  function setRunning(next) {
    if (next === running) return;
    running = next;
    if (running) { clock.getDelta(); frame(); }
    else cancelAnimationFrame(rafId);
  }

  resize();
  const onResize = () => resize();
  window.addEventListener('resize', onResize, { passive: true });

  if (reduced) {
    camera.position.y = scrollTarget();
    camera.lookAt(0, camera.position.y, 0);
    material.uniforms.uTime.value = 1.0;
    renderer.render(scene, camera);
  } else {
    const onVis = () => setRunning(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    frame();
    return {
      destroy() {
        setRunning(false);
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVis);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      },
    };
  }

  return {
    destroy() {
      window.removeEventListener('resize', onResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

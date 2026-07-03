/* Hero: a slow field of emerald and silver motes drifting over the city
   of Cindra, with gentle pointer and scroll parallax. */

import * as THREE from '../vendor/three.module.min.js';

export function initHero(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 60);
  camera.position.z = 10;

  const COUNT = matchMedia('(max-width: 760px)').matches ? 900 : 1800;
  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT * 3);
  const shades = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
    positions[i * 3 + 2] = (Math.random() - 0.72) * 12;
    seeds[i * 3] = Math.random() * 100;
    seeds[i * 3 + 1] = 0.35 + Math.random() * 0.8;
    seeds[i * 3 + 2] = Math.random();
    shades[i] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  geometry.setAttribute('aShade', new THREE.BufferAttribute(shades, 1));

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
      attribute float aShade;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vAlpha;
      varying float vShade;
      void main() {
        vec3 p = position;
        float t = uTime * aSeed.y;
        p.x += sin(t * 0.22 + aSeed.x) * 1.1;
        p.y += sin(t * 0.16 + aSeed.x * 1.7) * 0.9 + sin(uTime * 0.05 + aSeed.x) * 0.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = mix(1.2, 3.4, aSeed.z);
        gl_PointSize = size * uPixelRatio * (9.0 / -mv.z);
        float tw = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed.y) + aSeed.x * 3.0);
        vAlpha = tw * smoothstep(-14.0, -2.0, mv.z);
        vShade = aShade;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      varying float vShade;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float disc = smoothstep(0.5, 0.08, d);
        vec3 emerald = vec3(0.0, 1.0, 0.70);
        vec3 silver = vec3(0.82, 0.86, 0.88);
        vec3 col = mix(emerald, silver, step(0.72, vShade));
        gl_FragColor = vec4(col, disc * vAlpha * 0.5);
      }
    `,
  });

  scene.add(new THREE.Points(geometry, material));

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e) => {
    pointer.tx = (e.clientX / innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / innerHeight - 0.5) * 2;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);

  let running = true;
  let rafId = 0;
  let time = 0;
  const clock = new THREE.Clock();

  function frame() {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    time += Math.min(clock.getDelta(), 0.05);
    material.uniforms.uTime.value = time;

    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;

    /* scroll parallax: sampled inside the loop, no scroll listener */
    const scroll = Math.min(scrollY / innerHeight, 1.2);
    camera.position.x = pointer.x * 0.6;
    camera.position.y = -pointer.y * 0.4 + scroll * 2.2;
    camera.lookAt(0, scroll * 2.2, 0);
    renderer.render(scene, camera);
  }

  function setRunning(next) {
    if (next === running) return;
    running = next;
    if (running) {
      clock.getDelta(); /* swallow the paused interval */
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
    destroy() {
      setRunning(false);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

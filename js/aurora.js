/* Aurora — a flowing emerald curtain that breathes behind the manifesto.
   A single fullscreen fragment shader (fbm-driven), vignetted dark through
   the middle so the statement stays legible, and lit by scroll velocity:
   the faster the reader moves through the world, the brighter it burns.

   Lazy, paused offscreen, capped resolution. Reduced motion renders one
   still frame and stops. */

import * as THREE from '../vendor/three.module.min.js';

export function initAurora(canvas, { reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1));   /* atmosphere: cheap */

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTime: { value: 0 },
    uEnergy: { value: 0.4 },
    uAspect: { value: 1 },
  };

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform float uEnergy;
      uniform float uAspect;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i), b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      float fbm(vec2 p){
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; }
        return v;
      }

      void main(){
        vec2 uv = vUv;
        vec2 p = vec2(uv.x * uAspect, uv.y);
        float t = uTime * 0.05;
        /* two layers of drifting curtains rising through the frame */
        float warp = fbm(p * 2.0 + vec2(t, -t * 1.5));
        float flow = fbm(vec2(p.x * 3.0, p.y * 1.4 - t * 2.2) + warp * 0.7);
        float curtain = smoothstep(0.32, 0.95, flow);
        /* dark through the centre so the statement keeps its contrast */
        float edge = pow(abs(uv.y - 0.5) * 2.0, 1.6);
        float amt = curtain * edge * uEnergy;

        vec3 deep = vec3(0.004, 0.302, 0.251);   /* Dark Emerald #014D40 */
        vec3 lum  = vec3(0.184, 0.816, 0.627);   /* luminous emerald */
        vec3 col = mix(deep, lum, pow(curtain, 1.5));
        float alpha = clamp(amt, 0.0, 0.62);
        gl_FragColor = vec4(col * (0.5 + amt), alpha);
      }
    `,
  });

  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    uniforms.uAspect.value = w / h;
    if (reduced || !running) renderer.render(scene, camera);
  }

  let running = !reduced;
  let raf = 0;
  let time = 0;
  let lastScroll = window.scrollY;
  const clock = new THREE.Clock();

  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    time += Math.min(clock.getDelta(), 0.05);
    uniforms.uTime.value = time;
    /* scroll velocity → energy (eased) */
    const v = Math.min(1, Math.abs(window.scrollY - lastScroll) / 90);
    lastScroll = window.scrollY;
    uniforms.uEnergy.value += ((0.42 + v * 0.9) - uniforms.uEnergy.value) * 0.06;
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
    uniforms.uEnergy.value = 0.5;
    uniforms.uTime.value = 3.0;
    renderer.render(scene, camera);
  } else {
    let inView = true;
    const io = new IntersectionObserver((e) => {
      inView = e[e.length - 1].isIntersecting;
      setRunning(inView && !document.hidden);
    }, { rootMargin: '20% 0px' });
    io.observe(canvas);
    document.addEventListener('visibilitychange', () => setRunning(inView && !document.hidden));
    frame();
  }

  return {
    destroy() { setRunning(false); ro.disconnect(); mat.dispose(); renderer.dispose(); },
  };
}

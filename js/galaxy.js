/* Universe map: eight worlds orbiting the Chrono Core.
   Drag to rotate, click a planet to select it. Labels are HTML,
   projected onto the canvas each frame. */

import * as THREE from '../vendor/three.module.min.js';
import { PLANETS } from './data.js';

const ORBIT_SCALE = 1.05;

function haloTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.4, inner.replace(/,1\)$/, ',0.35)'));
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const planetVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;
const planetFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uGlow;
  uniform float uSelected;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vView);
    vec3 lightDir = normalize(vec3(0.5, 0.9, 0.6));
    float lambert = clamp(dot(n, lightDir), 0.0, 1.0);
    float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.4);
    vec3 base = uColor * (0.28 + 0.72 * lambert);
    vec3 col = base + uGlow * rim * (0.75 + uSelected * 0.9);
    col += uGlow * uSelected * 0.12;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function initGalaxy({ canvas, labelLayer, reduced = false, onSelect }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(0, 5.4, 14.2);
  camera.lookAt(0, 0, 0);

  const root = new THREE.Group();
  root.rotation.x = 0.06;
  scene.add(root);

  const wide = matchMedia('(min-width: 901px)');
  function placeRoot() {
    root.position.x = wide.matches ? -1.6 : 0;
  }
  placeRoot();
  wide.addEventListener?.('change', placeRoot);

  /* Starfield */
  {
    const N = 700;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 40 + Math.random() * 50;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 60;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.09,
      color: 0xbfc5cc,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
      depthWrite: false,
    });
    scene.add(new THREE.Points(geo, mat));
  }

  /* Chrono Core */
  const coreGlow = haloTexture('rgba(47,208,160,1)');
  {
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.62, 3),
      new THREE.ShaderMaterial({
        vertexShader: planetVertex,
        fragmentShader: planetFragment,
        uniforms: {
          uColor: { value: new THREE.Color('#053a2c') },
          uGlow: { value: new THREE.Color('#2fd0a0') },
          uSelected: { value: 0.6 },
        },
      })
    );
    root.add(core);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: coreGlow,
        color: 0x2fd0a0,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    halo.scale.setScalar(4.2);
    root.add(halo);
  }

  /* Orbit rings */
  const ringMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.13,
  });
  for (const p of PLANETS) {
    const pts = [];
    const R = p.orbit * ORBIT_SCALE;
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    root.add(new THREE.Line(geo, ringMat));
  }

  /* Planets */
  const whiteHalo = haloTexture('rgba(255,255,255,1)');
  const planetMeshes = [];
  const labels = new Map();

  for (const p of PLANETS) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(p.radius * 0.34, 3),
      new THREE.ShaderMaterial({
        vertexShader: planetVertex,
        fragmentShader: planetFragment,
        uniforms: {
          uColor: { value: new THREE.Color(p.color) },
          uGlow: { value: new THREE.Color(p.glow) },
          uSelected: { value: 0 },
        },
      })
    );
    mesh.userData.planetId = p.id;
    group.add(mesh);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: whiteHalo,
        color: new THREE.Color(p.glow),
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    halo.scale.setScalar(p.radius * 1.5);
    group.add(halo);

    if (p.ringed) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(p.radius * 0.46, p.radius * 0.62, 48),
        new THREE.MeshBasicMaterial({
          color: 0x2fd0a0,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
        })
      );
      ring.rotation.x = Math.PI / 2.4;
      group.add(ring);
    }

    group.userData = {
      id: p.id,
      angle: Math.random() * Math.PI * 2,
      speed: p.speed * 0.05,
      orbit: p.orbit * ORBIT_SCALE,
      labelPx: 14 + p.radius * 9,
      halo,
      mesh,
    };
    root.add(group);
    planetMeshes.push(mesh);

    const label = document.createElement('span');
    label.className = 'planet-label';
    label.textContent = p.name;
    labelLayer.append(label);
    labels.set(p.id, label);
  }

  /* Apex glimmer: an unclassified spark beyond the outer ring */
  {
    const spark = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: whiteHalo,
        color: 0xcbb8ff,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    spark.position.set(11.4, 1.6, -3.2);
    spark.scale.setScalar(0.55);
    spark.userData.isApex = true;
    root.add(spark);
  }

  /* Interaction: drag to rotate, click to select */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let dragging = false;
  let moved = 0;
  let lastX = 0;
  let lastY = 0;
  let velocity = 0;
  let targetYaw = null;
  let selectedId = null;
  let dirty = true;

  function pick(e) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(planetMeshes, false);
    return hits[0]?.object.userData.planetId ?? null;
  }

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    targetYaw = null;
    canvas.classList.add('dragging');
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      lastX = e.clientX;
      lastY = e.clientY;
      root.rotation.y += dx * 0.005;
      root.rotation.x = THREE.MathUtils.clamp(root.rotation.x + dy * 0.002, -0.2, 0.38);
      velocity = dx * 0.005;
      dirty = true;
    } else {
      canvas.style.cursor = pick(e) ? 'pointer' : 'grab';
    }
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('dragging');
    if (reduced) velocity = 0; /* no inertia under reduced motion */
    if (moved < 7) {
      const id = pick(e);
      if (id) {
        select(id);
        onSelect?.(id);
      }
    }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  function select(id) {
    selectedId = id;
    for (const mesh of planetMeshes) {
      const on = mesh.userData.planetId === id;
      mesh.material.uniforms.uSelected.value = on ? 1 : 0;
      mesh.parent.userData.halo.material.opacity = on ? 0.6 : 0.32;
    }
    labels.forEach((el, pid) => el.classList.toggle('active', pid === id));
    dirty = true;
  }

  function focusPlanet(id) {
    select(id);
    const group = root.children.find((g) => g.userData?.id === id);
    if (!group) return;
    /* rotate the system so the chosen world swings to the front:
       world angle = local angle - rotation.y, front sits at PI/2 */
    const a = group.userData.angle;
    const front = Math.PI / 2;
    let yaw = a - front;
    const cur = root.rotation.y;
    yaw = cur + THREE.MathUtils.euclideanModulo(yaw - cur + Math.PI, Math.PI * 2) - Math.PI;
    if (reduced) {
      root.rotation.y = yaw;
      targetYaw = null;
    } else {
      targetYaw = yaw;
    }
    dirty = true;
  }

  /* Layout */
  let viewW = 0;
  let viewH = 0;
  function resize() {
    const holder = canvas.parentElement;
    const w = holder.clientWidth;
    const h = canvas.clientHeight || holder.clientHeight;
    viewW = w;
    viewH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);

  /* Render loop */
  const worldPos = new THREE.Vector3();
  let running = true;
  let rafId = 0;
  const clock = new THREE.Clock();

  function updateLabels() {
    /* sizes cached by resize(): no per-frame layout read in the loop */
    const rect = { width: viewW, height: viewH };
    for (const group of root.children) {
      const id = group.userData?.id;
      if (!id) continue;
      const label = labels.get(id);
      group.getWorldPosition(worldPos);
      const projected = worldPos.clone().project(camera);
      if (projected.z > 1) {
        label.style.opacity = '0';
        continue;
      }
      const x = (projected.x * 0.5 + 0.5) * rect.width;
      const y = (-projected.y * 0.5 + 0.5) * rect.height;
      const camSpace = worldPos.clone().applyMatrix4(camera.matrixWorldInverse);
      const depth = THREE.MathUtils.clamp((-camSpace.z - 6) / 14, 0, 1);
      label.style.opacity = String(0.9 - depth * 0.55);
      label.style.transform = `translate(${x}px, ${y + group.userData.labelPx}px) translateX(-50%)`;
    }
  }

  function frame() {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);

    if (!reduced) {
      for (const group of root.children) {
        if (!group.userData?.id) continue;
        group.userData.angle += group.userData.speed * dt;
      }
      if (!dragging && targetYaw === null) root.rotation.y += 0.02 * dt;
      dirty = true;
    }

    for (const group of root.children) {
      const u = group.userData;
      if (!u?.id) continue;
      group.position.set(Math.cos(u.angle) * u.orbit, 0, Math.sin(u.angle) * u.orbit);
    }

    if (!dragging && targetYaw !== null) {
      if (reduced) {
        root.rotation.y = targetYaw;
        targetYaw = null;
      } else {
        const diff = targetYaw - root.rotation.y;
        root.rotation.y += diff * Math.min(1, dt * 4);
        if (Math.abs(diff) < 0.002) targetYaw = null;
      }
      dirty = true;
    } else if (!dragging && Math.abs(velocity) > 0.0002) {
      root.rotation.y += velocity;
      velocity *= 0.94;
      dirty = true;
    }

    if (dirty || !reduced) {
      renderer.render(scene, camera);
      updateLabels();
      dirty = false;
    }
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
  const onRestored = () => { dirty = true; };
  canvas.addEventListener('webglcontextrestored', onRestored);

  frame();

  return {
    focusPlanet,
    destroy() {
      setRunning(false);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      wide.removeEventListener?.('change', placeRoot);
      labels.forEach((el) => el.remove());
      scene.traverse((obj) => {
        obj.geometry?.dispose?.();
        if (obj.material) {
          for (const m of Array.isArray(obj.material) ? obj.material : [obj.material]) {
            m.map?.dispose?.();
            m.dispose?.();
          }
        }
      });
      renderer.dispose();
    },
  };
}

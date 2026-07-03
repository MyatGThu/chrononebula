/* AI Lab tiles: three lightweight 2D-canvas material studies.
   Each tile pauses offscreen; under reduced motion it renders one
   composed frame and stops. */

const EMERALD = 'rgba(0, 255, 179,';
const SILVER = 'rgba(197, 202, 208,';

function setupCanvas(canvas) {
  const dpr = Math.min(devicePixelRatio, 1.75);
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w: rect.width, h: rect.height };
}

/* Living Fabric: particles carried by a soft flow field, leaving threads */
function fabricSim(canvas) {
  let { ctx, w, h } = setupCanvas(canvas);
  const N = 240;
  const pts = Array.from({ length: N }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    life: Math.random() * 200,
  }));
  ctx.fillStyle = '#0a0b0d';
  ctx.fillRect(0, 0, w, h);

  return (t) => {
    ctx.fillStyle = 'rgba(10, 11, 13, 0.045)';
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1;
    for (const p of pts) {
      const a =
        Math.sin(p.x * 0.006 + t * 0.24) +
        Math.cos(p.y * 0.008 - t * 0.18) +
        Math.sin((p.x + p.y) * 0.003 + t * 0.1);
      const vx = Math.cos(a) * 1.15;
      const vy = Math.sin(a) * 1.15;
      const nx = p.x + vx;
      const ny = p.y + vy;
      const bright = 0.16 + 0.1 * Math.sin(p.life * 0.05);
      ctx.strokeStyle = (p.life % 11 === 0 ? SILVER : EMERALD) + bright + ')';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      p.x = nx;
      p.y = ny;
      p.life++;
      if (p.x < -4 || p.x > w + 4 || p.y < -4 || p.y > h + 4 || p.life > 460) {
        p.x = Math.random() * w;
        p.y = Math.random() * h;
        p.life = 0;
      }
    }
  };
}

/* Chrono Energy: concentric rings that breathe like a clock of light */
function chronoSim(canvas) {
  let { ctx, w, h } = setupCanvas(canvas);
  const cx = () => w / 2;
  const cy = () => h / 2;

  return (t) => {
    ctx.fillStyle = 'rgba(10, 11, 13, 0.3)';
    ctx.fillRect(0, 0, w, h);
    const rings = 7;
    for (let i = 0; i < rings; i++) {
      const phase = t * 0.5 + i * 0.9;
      const r = 14 + i * (Math.min(w, h) / 16) + Math.sin(phase) * 6;
      const alpha = 0.32 - i * 0.035 + Math.sin(phase) * 0.06;
      ctx.strokeStyle = (i % 3 === 2 ? SILVER : EMERALD) + Math.max(alpha, 0.03) + ')';
      ctx.lineWidth = i % 3 === 2 ? 0.75 : 1.25;
      ctx.beginPath();
      const gap = 0.5 + Math.sin(t * 0.3 + i) * 0.4;
      ctx.arc(cx(), cy(), r, gap, gap + Math.PI * 1.86);
      ctx.stroke();
    }
    /* the hand of the clock */
    const a = t * 0.42;
    ctx.strokeStyle = EMERALD + '0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx(), cy());
    ctx.lineTo(cx() + Math.cos(a) * (Math.min(w, h) * 0.34), cy() + Math.sin(a) * (Math.min(w, h) * 0.34));
    ctx.stroke();
  };
}

/* Nano-Weave: a lattice that looms itself, thread by thread */
function weaveSim(canvas) {
  let { ctx, w, h } = setupCanvas(canvas);
  const cell = 26;

  return (t) => {
    ctx.fillStyle = 'rgba(10, 11, 13, 0.16)';
    ctx.fillRect(0, 0, w, h);
    const cols = Math.ceil(w / cell) + 1;
    const rows = Math.ceil(h / cell) + 1;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const pulse = Math.sin(i * 0.7 + j * 0.9 + t * 1.1);
        if (pulse < 0.55) continue;
        const x = i * cell;
        const y = j * cell;
        const a = (pulse - 0.55) * 0.5;
        ctx.strokeStyle = ((i + j) % 5 === 0 ? SILVER : EMERALD) + a + ')';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        if ((i + j) % 2 === 0) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + cell, y + cell);
        } else {
          ctx.moveTo(x + cell, y);
          ctx.lineTo(x, y + cell);
        }
        ctx.stroke();
      }
    }
  };
}

const SIMS = { fabric: fabricSim, chrono: chronoSim, weave: weaveSim };

export function initLab(cells, reduced = false) {
  for (const cell of cells) {
    const canvas = cell.querySelector('canvas');
    const make = SIMS[cell.dataset.sim];
    if (!canvas || !make) continue;

    let draw = make(canvas);
    let running = false;
    let rafId = 0;
    const start = performance.now();

    const loop = () => {
      if (!running) return;
      rafId = requestAnimationFrame(loop);
      draw((performance.now() - start) / 1000);
    };

    if (reduced) {
      /* compose one settled frame */
      for (let i = 0; i < 90; i++) draw(i * 0.06);
      continue;
    }

    /* No visibilitychange handling needed: the browser suspends rAF in
       hidden tabs, and draw() uses absolute time, so resume is seamless. */
    const io = new IntersectionObserver((entries) => {
      const next = entries[entries.length - 1].isIntersecting;
      if (next === running) return;
      running = next;
      if (running) loop();
      else cancelAnimationFrame(rafId);
    });
    io.observe(cell);

    let resizeTimer;
    new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        draw = make(canvas);
      }, 150);
    }).observe(cell);
  }
}

import { useEffect, useRef } from 'react';
import type { FC } from 'react';

interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  size: number; hue: number;
}

const N = 72;
const LINK_DIST = 175;
const FOV = 390;
const DEPTH = 500;

/**
 * 3D particle network — depth-simulated perspective, mouse parallax.
 * Adapts glow colours to the current dark/light theme on every frame.
 * Respects prefers-reduced-motion.
 */
const HeroBackground: FC = () => {
  const cvs = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 });
  const pts = useRef<Particle[]>([]);
  const raf = useRef(0);
  const paused = useRef(false);

  useEffect(() => {
    const canvas = cvs.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const build = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const W = canvas.width;
      const H = canvas.height;
      pts.current = Array.from({ length: N }, () => ({
        x: (Math.random() - 0.5) * W * 2.4,
        y: (Math.random() - 0.5) * H * 2.4,
        z: Math.random() * DEPTH,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.17,
        vz: (Math.random() - 0.5) * 0.36,
        size: 0.9 + Math.random() * 2.1,
        hue: 210 + Math.random() * 80, // blue → purple → violet
      }));
    };

    build();

    const ro = new ResizeObserver(build);
    ro.observe(canvas);

    const onMove = (e: MouseEvent) => {
      mouse.current.tx = e.clientX / window.innerWidth;
      mouse.current.ty = e.clientY / window.innerHeight;
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    const onVis = () => {
      paused.current = document.hidden;
      if (!paused.current) tick();
    };
    document.addEventListener('visibilitychange', onVis);

    const tick = () => {
      if (paused.current) return;

      // Adapt to current theme every frame (O(1), negligible cost)
      const isDark = document.documentElement.classList.contains('dark');
      // Dark: bright glowing particles; Light: darker particles visible on white bg
      const pL  = isDark ? '82%'  : '38%'; // particle lightness
      const pS  = isDark ? '90%'  : '78%'; // particle saturation
      const pL2 = isDark ? '65%'  : '30%'; // gradient mid-stop lightness
      const lA  = isDark ? 0.28   : 0.20;  // line alpha multiplier

      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;

      const m = mouse.current;
      m.x += (m.tx - m.x) * 0.045;
      m.y += (m.ty - m.y) * 0.045;
      const px = (m.x - 0.5) * 0.14;
      const py = (m.y - 0.5) * 0.10;

      ctx.clearRect(0, 0, W, H);

      type P2 = { sx: number; sy: number; sz: number; size: number; alpha: number; hue: number };
      const p2: P2[] = pts.current.map((p) => {
        p.x += p.vx + px;
        p.y += p.vy + py;
        p.z += p.vz;
        if (p.z > DEPTH) p.z = 0;
        if (p.z < 0)     p.z = DEPTH;
        if (p.x > W) p.x = -W; else if (p.x < -W) p.x = W;
        if (p.y > H) p.y = -H; else if (p.y < -H) p.y = H;

        const s  = FOV / (FOV + p.z);
        const d1 = p.z / DEPTH;
        return {
          sx: cx + p.x * s,
          sy: cy + p.y * s,
          sz: p.z,
          size: p.size * s,
          alpha: 1 - d1 * 0.68,
          hue: p.hue,
        };
      });

      // Connection lines
      ctx.lineWidth = 0.6;
      for (let i = 0; i < p2.length; i++) {
        for (let j = i + 1; j < p2.length; j++) {
          const a = p2[i];
          const b = p2[j];
          const d = Math.hypot(a.sx - b.sx, a.sy - b.sy);
          if (d < LINK_DIST) {
            const la = (1 - d / LINK_DIST) * Math.min(a.alpha, b.alpha) * lA;
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.lineTo(b.sx, b.sy);
            ctx.strokeStyle = `hsla(${(a.hue + b.hue) * 0.5},70%,${pL2},${la})`;
            ctx.stroke();
          }
        }
      }

      // Particles — painter's sort: far → near
      p2.sort((a, b) => b.sz - a.sz);
      p2.forEach(({ sx, sy, sz, size, alpha, hue }) => {
        const r = Math.max(size * 3.2, 0.9);
        if (sz / DEPTH < 0.65) {
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
          g.addColorStop(0,    `hsla(${hue},${pS},${pL},${alpha})`);
          g.addColorStop(0.45, `hsla(${hue},75%,${pL2},${alpha * 0.44})`);
          g.addColorStop(1,    `hsla(${hue},70%,${pL2},0)`);
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(size * 1.2, 0.4), 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue},${pS},${pL},${alpha * 0.55})`;
          ctx.fill();
        }
      });

      raf.current = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(raf.current);
      ro.disconnect();
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <canvas
      ref={cvs}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
};

export default HeroBackground;

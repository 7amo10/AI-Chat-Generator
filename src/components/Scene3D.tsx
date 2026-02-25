import { Canvas, useFrame } from '@react-three/fiber';
import { memo, useMemo, useRef, useEffect } from 'react';
import type { FC } from 'react';
import * as THREE from 'three';

/* ---------- Grid config ---------- */
const COLS    = 70;
const ROWS    = 50;
const SPACING = 5.2;
const COUNT   = COLS * ROWS;
const WAVE_A  = 20;   // primary wave amplitude
const WAVE_B  = 10;   // secondary wave amplitude

/* ---------- Precompute static grid base positions ---------- */
const { BASE_X, BASE_Z } = (() => {
  const BASE_X = new Float32Array(COUNT);
  const BASE_Z = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    BASE_X[i] = ((i % COLS) - COLS * 0.5) * SPACING;
    BASE_Z[i] = (Math.floor(i / COLS) - ROWS * 0.5) * SPACING;
  }
  return { BASE_X, BASE_Z };
})();

/* ---------- Theme palette (no object creation in hot loop) ---------- */
let darkMode = true;
const PALETTES = {
  dark:  { ar: 0.376, ag: 0.647, ab: 0.980,  // blue-400  (peak)
           br: 0.486, bg: 0.227, bb: 0.902 }, // purple-500 (trough)
  light: { ar: 0.231, ag: 0.510, ab: 0.965,
           br: 0.576, bg: 0.345, bb: 0.965 },
};

/* ---------- Wave particle field ---------- */
const WaveField: FC = () => {
  const groupRef  = useRef<THREE.Group>(null!);
  const pointsRef = useRef<THREE.Points>(null!);
  const elapsed   = useRef(0);
  const mouse     = useRef({ x: 0, y: 0 });

  /* Geometry (mutable position + color buffers) */
  const geo = useMemo(() => {
    const g   = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = BASE_X[i];
      pos[i * 3 + 2] = BASE_Z[i];
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    return g;
  }, []);

  /* Material */
  const mat = useMemo(() => new THREE.PointsMaterial({
    size: 1.6,
    vertexColors: true,
    transparent: true,
    opacity: 0.78,
    sizeAttenuation: true,
    depthWrite: false,
  }), []);

  /* Mouse parallax listener */
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      mouse.current.x =  (e.clientX / window.innerWidth  - 0.5);
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('mousemove', fn, { passive: true });
    return () => window.removeEventListener('mousemove', fn);
  }, []);

  /* Theme observer */
  useEffect(() => {
    const update = () => { darkMode = document.documentElement.classList.contains('dark'); };
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useFrame((_, delta) => {
    elapsed.current += delta * 0.55; // slow it down a bit
    const t   = elapsed.current;
    const pos = geo.attributes['position'].array as Float32Array;
    const col = geo.attributes['color'].array    as Float32Array;
    const p   = darkMode ? PALETTES.dark : PALETTES.light;

    for (let i = 0; i < COUNT; i++) {
      const x = BASE_X[i];
      const z = BASE_Z[i];
      const d = Math.sqrt(x * x + z * z);

      /* Interference pattern of two travelling waves */
      const y =
        Math.sin(d * 0.036 - t * 1.0) * WAVE_A +
        Math.sin(x * 0.042 + t * 0.7) * WAVE_B +
        Math.sin(z * 0.038 - t * 0.5) * WAVE_B;

      pos[i * 3 + 1] = y;

      /* Color: lerp from peak colour (blue) to trough colour (purple) based on normalised Y */
      const n = Math.max(0, Math.min(1, y / (WAVE_A + WAVE_B * 2) * 0.5 + 0.5));
      col[i * 3]     = p.ar + (p.br - p.ar) * (1 - n);
      col[i * 3 + 1] = p.ag + (p.bg - p.ag) * (1 - n);
      col[i * 3 + 2] = p.ab + (p.bb - p.ab) * (1 - n);
    }

    geo.attributes['position'].needsUpdate = true;
    geo.attributes['color'].needsUpdate    = true;

    if (groupRef.current) {
      /* Slow auto-rotation */
      groupRef.current.rotation.y = t * 0.028;
      /* Smooth mouse parallax */
      groupRef.current.rotation.x += (-0.32 + mouse.current.y * 0.06 - groupRef.current.rotation.x) * 0.04;
      groupRef.current.rotation.z += (mouse.current.x * 0.04 - groupRef.current.rotation.z) * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={geo} material={mat} />
    </group>
  );
};

/* ---------- Root: fixed canvas with scroll-reactive blur ---------- */
const Scene3D: FC = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      if (!wrapperRef.current) return;
      /* 0 → 1 over the first viewport-height of scroll */
      const progress = Math.min(1, window.scrollY / (window.innerHeight * 0.75));
      /* blur: 0.5px at top → 5px deep in timeline */
      wrapperRef.current.style.filter = `blur(${0.5 + progress * 4.5}px)`;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', filter: 'blur(0.5px)' }}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 90, 200], fov: 60, near: 1, far: 1200 }}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        dpr={[1, Math.min(1.5, window.devicePixelRatio)]}
        style={{ width: '100%', height: '100%' }}
      >
        <WaveField />
      </Canvas>
    </div>
  );
};

export default memo(Scene3D);

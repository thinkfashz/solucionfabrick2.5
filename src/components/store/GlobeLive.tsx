'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

interface LiveMarker {
  id: string;
  location: [number, number];
}

interface GlobeLiveProps {
  markers?: LiveMarker[];
  className?: string;
  speed?: number;
  compact?: boolean;
}

const defaultMarkers: LiveMarker[] = [
  { id: 'chile', location: [-35.84, -71.54] },
  { id: 'santiago', location: [-33.45, -70.66] },
  { id: 'linares', location: [-35.85, -71.60] },
  { id: 'nyc', location: [40.71, -74.01] },
  { id: 'madrid', location: [40.41, -3.70] },
  { id: 'tokyo', location: [35.68, 139.65] },
];

function project(lat: number, lng: number, rot: number, size: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + rot) * Math.PI) / 180;
  const x = Math.sin(phi) * Math.cos(theta);
  const y = Math.cos(phi);
  const z = Math.sin(phi) * Math.sin(theta);
  const scale = 0.78 + z * 0.22;
  return { x: size / 2 + x * size * 0.34 * scale, y: size / 2 - y * size * 0.34 * scale, visible: z > -0.35, z };
}

export default function GlobeLive({ markers = defaultMarkers, className = '', speed = 0.22, compact = false }: GlobeLiveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const rotRef = useRef(0);
  const paused = useRef(false);
  const visible = useRef(false);
  const [liveViewers, setLiveViewers] = useState(2847);
  const [markerPositions, setMarkerPositions] = useState<Array<{ id: string; x: number; y: number; visible: boolean }>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveViewers((v) => Math.max(120, v + Math.floor(Math.random() * 21) - 8));
    }, 900);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      visible.current = true;
      return;
    }
    const io = new IntersectionObserver(([entry]) => { visible.current = Boolean(entry?.isIntersecting); }, { threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointer.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    paused.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    pointer.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    paused.current = false;
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!pointer.current) return;
      rotRef.current += (e.clientX - pointer.current.x) * 0.18;
      pointer.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerUp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let dpr = 1;
    let size = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.4 : 1.8);
      size = Math.max(180, Math.floor(wrap.clientWidth));
      canvas.width = Math.floor(size * dpr);
      canvas.height = Math.floor(size * dpr);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      if (visible.current && !paused.current) rotRef.current += speed;
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const r = size * 0.39;
      const glow = ctx.createRadialGradient(cx, cy, r * 0.08, cx, cy, r * 1.2);
      glow.addColorStop(0, 'rgba(250,204,21,0.26)');
      glow.addColorStop(0.45, 'rgba(250,204,21,0.10)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.24, 0, Math.PI * 2);
      ctx.fill();

      const globe = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.05, cx, cy, r);
      globe.addColorStop(0, '#2f3b4a');
      globe.addColorStop(0.38, '#121926');
      globe.addColorStop(1, '#030507');
      ctx.fillStyle = globe;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = 'rgba(250,204,21,0.13)';
      ctx.lineWidth = 1;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy + i * r * 0.22, r * 0.9, r * 0.12, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * 0.2, r * 0.94, (i * Math.PI) / 7 + rotRef.current * 0.004, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      const nextPositions = markers.slice(0, compact ? 3 : 5).map((m) => {
        const p = project(m.location[0], m.location[1], rotRef.current, size);
        if (p.visible) {
          ctx.fillStyle = 'rgba(239,68,68,0.95)';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(p.x, p.y, compact ? 3.5 : 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        return { id: m.id, x: p.x, y: p.y, visible: p.visible };
      });
      setMarkerPositions(nextPositions);

      canvas.style.opacity = '1';
      raf = requestAnimationFrame(draw);
    }

    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(wrap);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [markers, speed, compact]);

  return <div ref={wrapRef} className={`relative aspect-square select-none ${className}`}>
    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(250,204,21,.16),transparent_58%)] blur-xl" />
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      style={{ width: '100%', height: '100%', cursor: 'grab', opacity: 0, transition: 'opacity 1.2s ease', borderRadius: '50%', touchAction: 'none' }}
    />
    <div className="pointer-events-none absolute inset-x-3 top-3 overflow-hidden rounded-full border border-yellow-300/20 bg-black/55 px-3 py-1.5 backdrop-blur-xl">
      <div className="relative flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.18em] text-red-300"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_12px_#ef4444]" />LIVE</span>
        <span className="text-[9px] font-bold uppercase tracking-[.12em] text-white/65">{liveViewers.toLocaleString()} mirando</span>
      </div>
    </div>
    {markerPositions.map((m) => (
      <div key={m.id} className="pointer-events-none absolute rounded-full border border-white/15 bg-black/65 px-2 py-1 text-[8px] font-black uppercase tracking-[.14em] text-yellow-200 backdrop-blur-xl" style={{ left: m.x, top: m.y, transform: 'translate(-50%, -140%)', opacity: m.visible ? 0.9 : 0 } as CSSProperties}>
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />{m.id}
      </div>
    ))}
  </div>;
}

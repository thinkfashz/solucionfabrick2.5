'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import createGlobe from 'cobe';

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

export default function GlobeLive({ markers = defaultMarkers, className = '', speed = 0.003, compact = false }: GlobeLiveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiOffset = useRef(0);
  const thetaOffset = useRef(0);
  const paused = useRef(false);
  const visible = useRef(false);
  const [liveViewers, setLiveViewers] = useState(2847);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveViewers((v) => Math.max(120, v + Math.floor(Math.random() * 21) - 8));
    }, 700);
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
    if (pointer.current !== null) {
      phiOffset.current += dragOffset.current.phi;
      thetaOffset.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
    }
    pointer.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    paused.current = false;
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointer.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointer.current.x) / 300,
          theta: (e.clientY - pointer.current.y) / 1000,
        };
      }
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerUp]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let animationId = 0;
    let phi = 0;

    function init() {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, compact ? 1.35 : 1.7),
        width,
        height: width,
        phi: 0,
        theta: 0.22,
        dark: 1,
        diffuse: 1.25,
        mapSamples: compact ? 5200 : 9000,
        mapBrightness: 5.2,
        baseColor: [0.05, 0.05, 0.05],
        markerColor: [1, 0.28, 0.12],
        glowColor: [1, 0.76, 0.16],
        markerElevation: 0.025,
        markers: markers.map((m) => ({ location: m.location, size: compact ? 0.026 : 0.032, id: m.id })),
        onRender: (state) => {
          if (visible.current && !paused.current) phi += speed;
          state.phi = phi + phiOffset.current + dragOffset.current.phi;
          state.theta = 0.22 + thetaOffset.current + dragOffset.current.theta;
        },
      });
      animationId = requestAnimationFrame(function fade() {
        if (canvas) canvas.style.opacity = '1';
      });
    }

    if (canvas.offsetWidth > 0) {
      init();
    } else if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect();
          init();
        }
      });
      ro.observe(canvas);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (globe) globe.destroy();
    };
  }, [markers, speed, compact]);

  return <div ref={wrapRef} className={`relative aspect-square select-none ${className}`}>
    <style jsx>{`
      @keyframes live-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.58; transform:scale(.82); } }
      @keyframes live-scan { 0% { transform:translateX(-120%); } 100% { transform:translateX(120%); } }
    `}</style>
    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(250,204,21,.16),transparent_58%)] blur-xl" />
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      style={{ width: '100%', height: '100%', cursor: 'grab', opacity: 0, transition: 'opacity 1.2s ease', borderRadius: '50%', touchAction: 'none' }}
    />
    <div className="pointer-events-none absolute inset-x-3 top-3 overflow-hidden rounded-full border border-yellow-300/20 bg-black/55 px-3 py-1.5 backdrop-blur-xl">
      <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent [animation:live-scan_2.8s_linear_infinite]" />
      <div className="relative flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.18em] text-red-300"><span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_12px_#ef4444] [animation:live-pulse_1.5s_ease-in-out_infinite]" />LIVE</span>
        <span className="text-[9px] font-bold uppercase tracking-[.12em] text-white/65">{liveViewers.toLocaleString()} mirando</span>
      </div>
    </div>
    {markers.slice(0, compact ? 3 : 5).map((m, i) => (
      <div key={m.id} className="pointer-events-none absolute rounded-full border border-white/15 bg-black/65 px-2 py-1 text-[8px] font-black uppercase tracking-[.14em] text-yellow-200 backdrop-blur-xl" style={{ left: `${14 + i * 17}%`, bottom: `${12 + (i % 2) * 16}%`, opacity: 0.88 } as CSSProperties}>
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />{m.id}
      </div>
    ))}
  </div>;
}

'use client';

import { useEffect, useState } from 'react';

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
];

export default function GlobeLive({ markers = defaultMarkers, className = '', compact = false }: GlobeLiveProps) {
  const [liveViewers, setLiveViewers] = useState(2847);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveViewers((value) => Math.max(120, value + Math.floor(Math.random() * 21) - 8));
    }, 1100);
    return () => clearInterval(interval);
  }, []);

  const shownMarkers = markers.slice(0, compact ? 3 : 5);

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(250,204,21,.18),transparent_58%)] blur-xl" />
      <div className="absolute inset-[8%] rounded-full border border-yellow-300/20 bg-[radial-gradient(circle_at_35%_28%,#394150_0%,#131722_38%,#040506_74%)] shadow-[inset_0_0_45px_rgba(250,204,21,.08),0_25px_80px_rgba(0,0,0,.45)]">
        <div className="absolute inset-[14%] rounded-full border border-yellow-300/10" />
        <div className="absolute inset-[25%] rounded-full border border-yellow-300/10" />
        <div className="absolute left-1/2 top-[12%] h-[76%] w-px -translate-x-1/2 rounded-full bg-yellow-300/10" />
        <div className="absolute left-[18%] top-1/2 h-px w-[64%] -translate-y-1/2 rounded-full bg-yellow-300/10" />
        <div className="absolute inset-[5%] rounded-full border border-white/5" />
      </div>

      <div className="pointer-events-none absolute inset-x-3 top-3 overflow-hidden rounded-full border border-yellow-300/20 bg-black/55 px-3 py-1.5 backdrop-blur-xl">
        <div className="relative flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.18em] text-red-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_12px_#ef4444]" />LIVE
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[.12em] text-white/65">{liveViewers.toLocaleString()} mirando</span>
        </div>
      </div>

      {shownMarkers.map((marker, index) => (
        <div
          key={marker.id}
          className="pointer-events-none absolute rounded-full border border-white/15 bg-black/65 px-2 py-1 text-[8px] font-black uppercase tracking-[.14em] text-yellow-200 opacity-90 backdrop-blur-xl"
          style={{ left: `${18 + index * 22}%`, top: `${62 - (index % 2) * 28}%`, transform: 'translate(-50%, -50%)' }}
        >
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />{marker.id}
        </div>
      ))}
    </div>
  );
}

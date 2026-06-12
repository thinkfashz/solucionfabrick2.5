'use client';

import { useEffect, useState } from 'react';

function format(ms: number) {
  if (ms <= 0) return 'expirado';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${hours}h ${minutes}m ${seconds}s`;
}

function readHours() {
  if (typeof document === 'undefined') return 720;
  const input = document.querySelector('input[type="number"]') as HTMLInputElement | null;
  const value = Number(input?.value || 720);
  return Number.isFinite(value) && value > 0 ? value : 720;
}

export default function PageEngineLiveExpiryBadge() {
  const [hours, setHours] = useState(720);
  const [label, setLabel] = useState('720h');

  useEffect(() => {
    let expiresAt = Date.now() + readHours() * 3600000;
    const sync = () => {
      const nextHours = readHours();
      setHours(nextHours);
      expiresAt = Date.now() + nextHours * 3600000;
    };
    const tick = () => setLabel(format(expiresAt - Date.now()));
    const onInput = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input[type="number"]')) sync();
    };
    sync();
    tick();
    const id = window.setInterval(tick, 1000);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onInput);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('input', onInput);
      document.removeEventListener('change', onInput);
    };
  }, []);

  return <div className="fixed bottom-[84px] right-3 z-[60] rounded-2xl border border-amber-300/25 bg-black/75 px-4 py-3 text-xs font-black text-amber-100 shadow-[0_18px_60px_rgba(0,0,0,.45)] backdrop-blur-xl sm:right-5">
    <span className="block text-[9px] uppercase tracking-[0.22em] text-amber-300/75">Desactivación</span>
    <span className="text-sm">{label}</span>
    <span className="ml-2 text-[10px] text-white/45">({hours}h)</span>
  </div>;
}

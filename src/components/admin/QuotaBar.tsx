'use client';

import * as React from 'react';

export interface QuotaBarProps {
  provider: string;
  used: number | null;
  limit: number | null;
  capturedAt: string;
  unit?: string;
}

function formatNumber(n: number, unit?: string): string {
  if (unit === '$') return `$${n.toFixed(2)}`;
  if (Number.isInteger(n)) return n.toLocaleString('es-CL');
  return n.toFixed(2);
}

function relativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const hours = Math.round((Date.now() - t) / 3_600_000);
  if (hours < 1) return 'hace <1h';
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.round(hours / 24)}d`;
}

export function QuotaBar({ provider, used, limit, capturedAt, unit }: QuotaBarProps) {
  if (used == null && limit == null) return null;

  if (used == null && limit != null) {
    return (
      <div role="group" aria-label={`Cuota ${provider}`} className="rounded-xl border border-emerald-600/15 bg-emerald-500/7 px-3 py-2 text-[11px] text-emerald-900">
        <div className="flex items-center justify-between gap-2">
          <span className="font-black uppercase tracking-[.13em]">Cuota</span>
          <span className="text-emerald-700">{relativeTime(capturedAt)}</span>
        </div>
        <div className="mt-1 text-xs font-semibold">{formatNumber(limit, unit)} {unit && unit !== '$' ? unit : 'créditos'} restantes</div>
      </div>
    );
  }

  const usedNum = used ?? 0;
  const limitNum = limit ?? 0;
  const pct = limitNum > 0 ? Math.min(100, Math.max(0, (usedNum / limitNum) * 100)) : 0;
  const tone = pct > 90 ? 'rose' : pct >= 70 ? 'amber' : 'emerald';
  const palette = {
    emerald: { bg: 'bg-emerald-500/7', border: 'border-emerald-600/15', text: 'text-emerald-900', bar: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-500/8', border: 'border-amber-600/15', text: 'text-amber-900', bar: 'bg-amber-500' },
    rose: { bg: 'bg-rose-500/7', border: 'border-rose-600/15', text: 'text-rose-900', bar: 'bg-rose-500' },
  }[tone];

  return (
    <div role="group" aria-label={`Cuota ${provider}`} className={`rounded-xl border ${palette.border} ${palette.bg} px-3 py-2 text-[11px] ${palette.text}`}>
      <div className="flex items-center justify-between gap-2"><span className="font-black uppercase tracking-[.13em]">Cuota</span><span className="opacity-70">{relativeTime(capturedAt)}</span></div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/8"><div className={`h-full ${palette.bar}`} style={{ width: `${pct.toFixed(1)}%` }} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} role="progressbar" /></div>
        <span className="shrink-0 text-xs font-black tabular-nums">{Math.round(pct)}%</span>
      </div>
      <div className="mt-1 opacity-80">{formatNumber(usedNum, unit)} / {limit != null ? formatNumber(limitNum, unit) : '—'}{unit && unit !== '$' ? ` ${unit}` : ''}</div>
    </div>
  );
}

export default QuotaBar;

export function unitForProvider(provider: string): string {
  switch (provider) {
    case 'openrouter': return '$';
    case 'serper': return 'créditos';
    case 'serpapi': return 'búsquedas';
    default: return '';
  }
}

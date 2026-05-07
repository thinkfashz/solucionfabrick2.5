'use client';

import * as React from 'react';

/**
 * <QuotaBar /> — Mini usage bar shown in the header of each provider card
 * in /admin/integraciones.
 *
 * Data source: `GET /api/admin/integrations/quota`, fed by the daily
 * health-check cron. Providers without a quota endpoint (Meta, Google,
 * etc.) simply do not appear in the response and the component renders
 * nothing for them.
 *
 * Color coding (matches the rest of the admin theme):
 *   <70%    → emerald  (plenty of room)
 *   70–90%  → amber    (start watching)
 *   >90%    → red      (act now)
 *
 * For providers that only expose "credits remaining" (Serper) and not a
 * total, we render the remaining credits as a stand-alone row instead of
 * a percentage bar so we don't fabricate fake limits.
 */

export interface QuotaBarProps {
	provider: string;
	/** Number of units used during the snapshot. May be null if the API only reports remaining. */
	used: number | null;
	/** Hard limit for the period. May be null when unknown. */
	limit: number | null;
	/** ISO timestamp when the snapshot was captured. */
	capturedAt: string;
	/** Custom unit label (default: empty). */
	unit?: string;
}

function formatNumber(n: number, unit?: string): string {
	if (unit === '$') return `$${n.toFixed(2)}`;
	if (Number.isInteger(n)) return n.toLocaleString('es-CL');
	return n.toFixed(2);
}

const MS_PER_HOUR = 3_600_000;

function relativeTime(iso: string): string {
	const t = Date.parse(iso);
	if (Number.isNaN(t)) return iso;
	const diffMs = Date.now() - t;
	const hours = Math.round(diffMs / MS_PER_HOUR);
	if (hours < 1) return 'hace <1h';
	if (hours < 24) return `hace ${hours}h`;
	const days = Math.round(hours / 24);
	return `hace ${days}d`;
}

export function QuotaBar({ provider, used, limit, capturedAt, unit }: QuotaBarProps) {
	// No usable signal at all → render nothing.
	if (used == null && limit == null) return null;

	// Only "remaining" known (no limit) → text-only row.
	if (used == null && limit != null) {
		return (
			<div
				role="group"
				aria-label={`Cuota ${provider}`}
				className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[11px] text-emerald-200"
			>
				<div className="flex items-center justify-between gap-2">
					<span className="font-bold uppercase tracking-[0.18em]">Cuota</span>
					<span className="text-emerald-300/80">{relativeTime(capturedAt)}</span>
				</div>
				<div className="mt-1 text-[12px] text-emerald-100">
					{formatNumber(limit, unit)} {unit && unit !== '$' ? unit : 'créditos'} restantes
				</div>
			</div>
		);
	}

	// We have used + limit → render the bar.
	const usedNum = used ?? 0;
	const limitNum = limit ?? 0;
	const pct = limitNum > 0 ? Math.min(100, Math.max(0, (usedNum / limitNum) * 100)) : 0;
	const tone = pct > 90 ? 'red' : pct >= 70 ? 'amber' : 'emerald';
	const palette = {
		emerald: { border: 'border-emerald-400/25', bg: 'bg-emerald-400/5', text: 'text-emerald-200', bar: 'bg-emerald-400' },
		amber: { border: 'border-amber-400/25', bg: 'bg-amber-400/5', text: 'text-amber-200', bar: 'bg-amber-400' },
		red: { border: 'border-rose-400/25', bg: 'bg-rose-400/5', text: 'text-rose-200', bar: 'bg-rose-400' },
	}[tone];

	return (
		<div
			role="group"
			aria-label={`Cuota ${provider}`}
			className={`rounded-lg border ${palette.border} ${palette.bg} px-3 py-2 text-[11px] ${palette.text}`}
		>
			<div className="flex items-center justify-between gap-2">
				<span className="font-bold uppercase tracking-[0.18em]">Cuota</span>
				<span className="opacity-70">{relativeTime(capturedAt)}</span>
			</div>
			<div className="mt-1.5 flex items-center gap-2">
				<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
					<div
						className={`h-full ${palette.bar}`}
						style={{ width: `${pct.toFixed(1)}%` }}
						aria-valuenow={Math.round(pct)}
						aria-valuemin={0}
						aria-valuemax={100}
						role="progressbar"
					/>
				</div>
				<span className="shrink-0 text-[12px] tabular-nums">
					{Math.round(pct)}%
				</span>
			</div>
			<div className="mt-1 text-[11px] opacity-80">
				{formatNumber(usedNum, unit)} / {limit != null ? formatNumber(limitNum, unit) : '—'}
				{unit && unit !== '$' ? ` ${unit}` : ''}
			</div>
		</div>
	);
}

export default QuotaBar;

/** Maps provider id → preferred unit string for display. Pure helper. */
export function unitForProvider(provider: string): string {
	switch (provider) {
		case 'openrouter':
			return '$';
		case 'serper':
			return 'créditos';
		case 'serpapi':
			return 'búsquedas';
		default:
			return '';
	}
}

'use client';

import { useMemo } from 'react';

export type LatencyBarStatus = 'ok' | 'unconfigured' | 'unreachable' | 'invalid_token' | 'idle' | 'checking';
export type LatencyBarMode = 'production' | 'sandbox' | 'unknown';

interface LatencyBarProps {
  /** Sequence of latency samples in ms (oldest → newest). */
  history: number[];
  /** Most recent sample. `null` when no probe yet or when unreachable. */
  currentMs: number | null;
  status: LatencyBarStatus;
  mode?: LatencyBarMode;
  height?: number;
  width?: number;
  /** Show the "DEMO" pill when mode === 'sandbox'. Default: true. */
  showDemoPill?: boolean;
  className?: string;
}

const COLOUR_OK = '#34d399'; // emerald-400
const COLOUR_WARN = '#fbbf24'; // amber-400
const COLOUR_BAD = '#f87171'; // red-400
const GRID = '#27272a'; // zinc-800

function bandFor(ms: number) {
  if (ms < 300) return 'ok';
  if (ms < 800) return 'warn';
  return 'bad';
}

function colourForCurrent(currentMs: number | null, status: LatencyBarStatus) {
  if (status === 'unreachable' || status === 'unconfigured' || status === 'invalid_token') {
    return COLOUR_BAD;
  }
  if (currentMs == null) return GRID;
  const b = bandFor(currentMs);
  return b === 'ok' ? COLOUR_OK : b === 'warn' ? COLOUR_WARN : COLOUR_BAD;
}

/**
 * Tiny inline-SVG sparkline for the live MP latency probe. Pure presentational
 * (no network calls of its own) so the parent decides the polling cadence.
 *
 * Visual semantics:
 *   - green   : <300 ms (excellent)
 *   - amber   : 300–800 ms (acceptable)
 *   - red     : ≥800 ms or upstream unreachable
 *   - the "DEMO" pill appears whenever mode === 'sandbox' so a buyer (or admin)
 *     can never confuse a test environment with a live one.
 */
export default function LatencyBar({
  history,
  currentMs,
  status,
  mode = 'unknown',
  height = 48,
  width = 240,
  showDemoPill = true,
  className,
}: LatencyBarProps) {
  const { points, maxObserved } = useMemo(() => {
    if (history.length === 0) {
      return { points: '', maxObserved: 0 };
    }
    // Cap visualised range at 2000 ms so spikes don't squash everything else.
    const max = Math.max(2000, ...history);
    const stepX = history.length > 1 ? width / (history.length - 1) : 0;
    const pts = history
      .map((v, i) => {
        const x = i * stepX;
        const y = height - (Math.min(v, max) / max) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    return { points: pts, maxObserved: max };
  }, [history, width, height]);

  const stroke = colourForCurrent(currentMs, status);
  const label =
    status === 'unconfigured'
      ? 'No configurado'
      : status === 'invalid_token'
        ? 'Token inválido'
        : status === 'unreachable'
          ? 'No responde'
          : currentMs != null
            ? `${currentMs} ms`
            : '—';

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-black/40 p-3 ${className ?? ''}`}
      role="status"
      aria-live="polite"
      aria-label={`Latencia Mercado Pago ${label}`}
    >
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-500">
        <span>Latencia → api.mercadopago.com</span>
        <div className="flex items-center gap-2">
          {showDemoPill && mode === 'sandbox' && (
            <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-300 ring-1 ring-amber-400/50">
              Demo
            </span>
          )}
          <span style={{ color: stroke }}>{label}</span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        className="mt-2"
      >
        {/* Threshold guides */}
        {[300, 800].map((t) => {
          const y = height - (t / Math.max(2000, maxObserved)) * (height - 4) - 2;
          if (y < 0 || y > height) return null;
          return (
            <line
              key={t}
              x1={0}
              x2={width}
              y1={y}
              y2={y}
              stroke={GRID}
              strokeDasharray="2 3"
              strokeWidth={1}
            />
          );
        })}
        {points ? (
          <polyline
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        ) : (
          <text
            x={width / 2}
            y={height / 2 + 3}
            textAnchor="middle"
            fontSize={10}
            fill="#71717a"
          >
            esperando primera muestra…
          </text>
        )}
      </svg>
    </div>
  );
}

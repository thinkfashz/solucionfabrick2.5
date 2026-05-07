'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, AlertTriangle, CheckCircle2, RefreshCcw, XCircle } from 'lucide-react';
import type { LatencyBucket, ModelHealth, ModelStats } from '@/lib/aiChatStats';

interface StatsResponse {
  window_hours: number;
  total_calls: number;
  stats: ModelStats[];
}

const BUCKET_COLORS: Record<LatencyBucket, string> = {
  fast: '#10b981', // emerald-500
  medium: '#f59e0b', // amber-500
  slow: '#ef4444', // red-500
};

const HEALTH_LABEL: Record<ModelHealth, string> = {
  working: '✅ funciona',
  flaky: '⚠️ inestable',
  down: '🛑 caído',
  unknown: '· sin datos',
};

const HEALTH_ICON: Record<ModelHealth, React.ComponentType<{ className?: string }>> = {
  working: CheckCircle2,
  flaky: AlertTriangle,
  down: XCircle,
  unknown: Activity,
};

const HEALTH_TONE: Record<ModelHealth, string> = {
  working: 'text-emerald-400',
  flaky: 'text-amber-400',
  down: 'text-red-400',
  unknown: 'text-neutral-500',
};

export interface ModelPerformanceChartProps {
  /** Auto-refresh interval in seconds (0 = off). */
  refreshSec?: number;
  /** Callback cuando cambian las stats — útil para que el page reordene su selector. */
  onStatsChange?: (stats: ModelStats[]) => void;
}

/**
 * Gráfica de rendimiento de modelos OpenRouter, alimentada por
 * `GET /api/admin/ai-chat/stats`. Refresco automático cada 30 s por
 * defecto + botón manual.
 */
export function ModelPerformanceChart({ refreshSec = 30, onStatsChange }: ModelPerformanceChartProps) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/ai-chat/stats?hours=24');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? 'Error');
        if (cancelled) return;
        setData(json as StatsResponse);
        if (onStatsChange) onStatsChange((json as StatsResponse).stats ?? []);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tick, onStatsChange]);

  useEffect(() => {
    if (!refreshSec || refreshSec <= 0) return;
    const id = setInterval(() => setTick((t) => t + 1), refreshSec * 1000);
    return () => clearInterval(id);
  }, [refreshSec]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.stats
      .filter((s) => s.calls > 0)
      .slice(0, 12)
      .map((s) => ({
        // Acortar id largo del modelo para etiquetas
        name: s.model.length > 28 ? `…${s.model.slice(-26)}` : s.model,
        fullName: s.model,
        latency: s.avg_latency_ms,
        bucket: s.bucket,
        successPct: Math.round(s.success_rate * 100),
        calls: s.calls,
        health: s.health,
      }));
  }, [data]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 inline-flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-amber-400" /> Rendimiento (24 h)
          </p>
          <p className="text-[10px] text-neutral-500 mt-0.5">
            {data ? `${data.total_calls} llamadas · ${data.stats.length} modelos` : 'Sin datos aún'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTick((t) => t + 1)}
          className="text-amber-400 hover:underline inline-flex items-center gap-1 text-xs"
          disabled={loading}
        >
          <RefreshCcw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> refrescar
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-300">
          {error}
        </div>
      )}

      {chartData.length === 0 && !loading && (
        <p className="text-[11px] text-neutral-500 py-4 text-center">
          Aún no hay métricas. Envía algún mensaje al asistente para empezar a registrar.
        </p>
      )}

      {chartData.length > 0 && (
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 9, fill: '#737373' }} stroke="#404040" />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 9, fill: '#a3a3a3' }}
                width={140}
                stroke="#404040"
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #404040', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#fafafa' }}
                formatter={(value: number, _name, props) => {
                  const p = (props as unknown as { payload: typeof chartData[number] }).payload;
                  return [`${value} ms · ${p.successPct}% OK · ${p.calls} calls`, p.fullName];
                }}
              />
              <Bar dataKey="latency" radius={[0, 4, 4, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={BUCKET_COLORS[d.bucket as LatencyBucket]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data && data.stats.length > 0 && (
        <ul className="space-y-1 text-[11px]">
          {data.stats.slice(0, 8).map((s) => {
            const Icon = HEALTH_ICON[s.health];
            return (
              <li key={s.model} className="flex items-center gap-2 px-1">
                <Icon className={`h-3 w-3 flex-shrink-0 ${HEALTH_TONE[s.health]}`} />
                <span className="flex-1 truncate text-neutral-300">{s.model}</span>
                <span className="text-neutral-500">{s.avg_latency_ms} ms</span>
                <span className={s.success_rate >= 0.8 ? 'text-emerald-400' : s.success_rate >= 0.3 ? 'text-amber-400' : 'text-red-400'}>
                  {Math.round(s.success_rate * 100)}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export { HEALTH_LABEL };

/**
 * Cálculos puros para el dashboard de rendimiento del asistente IA y el
 * algoritmo de auto-fallback. Mantenidos en un módulo aparte (sin
 * `server-only`) para poder testearlos directamente con vitest sin
 * mockear InsForge.
 */

export type MetricStatus = 'ok' | 'timeout' | 'error' | 'rate_limit' | 'empty';

export interface MetricRow {
  model: string;
  ts: string;          // ISO timestamp
  latency_ms: number;
  status: MetricStatus | string;
  is_free?: boolean | null;
}

export type LatencyBucket = 'fast' | 'medium' | 'slow';
export type ModelHealth = 'working' | 'flaky' | 'down' | 'unknown';

export interface ModelStats {
  model: string;
  calls: number;
  ok_calls: number;
  success_rate: number;     // 0..1
  avg_latency_ms: number;
  p95_latency_ms: number;
  last_status: string | null;
  last_ts: string | null;
  is_free: boolean;
  bucket: LatencyBucket;
  health: ModelHealth;
}

const FAST_MS = 2000;
const SLOW_MS = 6000;
const STALE_MS = 60 * 60 * 1000; // 1 h

export function classifyBucket(avgMs: number): LatencyBucket {
  if (avgMs < FAST_MS) return 'fast';
  if (avgMs <= SLOW_MS) return 'medium';
  return 'slow';
}

export function classifyHealth(opts: {
  calls: number;
  successRate: number;
  lastStatus: string | null;
  lastTs: string | null;
  now?: number;
}): ModelHealth {
  const now = opts.now ?? Date.now();
  if (opts.calls === 0) return 'unknown';
  // Si hace más de 1h que no responde OK, lo damos por caído
  if (opts.lastStatus && opts.lastStatus !== 'ok' && opts.lastTs) {
    const age = now - new Date(opts.lastTs).getTime();
    if (Number.isFinite(age) && age > STALE_MS) return 'down';
  }
  if (opts.successRate < 0.3) return 'down';
  if (opts.successRate >= 0.8 && opts.calls >= 3) return 'working';
  return 'flaky';
}

export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.ceil(p * sortedAsc.length) - 1));
  return sortedAsc[idx];
}

/** Agrupa filas crudas en stats por modelo. */
export function aggregateMetrics(rows: MetricRow[], now: number = Date.now()): ModelStats[] {
  const byModel = new Map<string, MetricRow[]>();
  for (const r of rows) {
    if (!r || typeof r.model !== 'string') continue;
    const arr = byModel.get(r.model);
    if (arr) arr.push(r);
    else byModel.set(r.model, [r]);
  }

  const out: ModelStats[] = [];
  for (const [model, arr] of byModel.entries()) {
    arr.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
    const calls = arr.length;
    const okCalls = arr.filter((r) => r.status === 'ok').length;
    const successRate = calls === 0 ? 0 : okCalls / calls;
    const latencies = arr.map((r) => Number(r.latency_ms) || 0).sort((a, b) => a - b);
    const avg = latencies.reduce((s, v) => s + v, 0) / Math.max(1, latencies.length);
    const last = arr[arr.length - 1];
    const isFree = arr.some((r) => r.is_free === true);
    out.push({
      model,
      calls,
      ok_calls: okCalls,
      success_rate: Number(successRate.toFixed(4)),
      avg_latency_ms: Math.round(avg),
      p95_latency_ms: percentile(latencies, 0.95),
      last_status: last?.status ?? null,
      last_ts: last?.ts ?? null,
      is_free: isFree,
      bucket: classifyBucket(avg),
      health: classifyHealth({
        calls,
        successRate,
        lastStatus: last?.status ?? null,
        lastTs: last?.ts ?? null,
        now,
      }),
    });
  }

  // Orden por score: working > flaky > unknown > down; dentro, por avg_latency asc
  const healthRank: Record<ModelHealth, number> = { working: 0, flaky: 1, unknown: 2, down: 3 };
  out.sort((a, b) => {
    const dh = healthRank[a.health] - healthRank[b.health];
    if (dh !== 0) return dh;
    return a.avg_latency_ms - b.avg_latency_ms;
  });
  return out;
}

/** Score numérico [0..1] usado para ordenar candidatos en el fallback. */
export function modelScore(stats: ModelStats): number {
  // 70% éxito + 30% velocidad relativa (capada a 10 s)
  const speed = Math.max(0, 1 - Math.min(stats.avg_latency_ms, 10000) / 10000);
  return Number((stats.success_rate * 0.7 + speed * 0.3).toFixed(4));
}

/**
 * Decide si un modelo debe excluirse de la lista de candidatos del
 * fallback. Reglas: success_rate < 30% O ≥ 3 fallos consecutivos en las
 * últimas 2 h.
 */
export function shouldExcludeModel(rows: MetricRow[], now: number = Date.now()): boolean {
  if (rows.length === 0) return false;
  const recent = rows
    .filter((r) => now - new Date(r.ts).getTime() <= 2 * 60 * 60 * 1000)
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()); // newest first
  if (recent.length === 0) return false;
  const ok = recent.filter((r) => r.status === 'ok').length;
  if (recent.length >= 3 && ok / recent.length < 0.3) return true;
  // 3+ fallos consecutivos al inicio
  let consecutiveFails = 0;
  for (const r of recent) {
    if (r.status === 'ok') break;
    consecutiveFails++;
    if (consecutiveFails >= 3) return true;
  }
  return false;
}

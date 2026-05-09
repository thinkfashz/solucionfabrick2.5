import { describe, expect, it } from 'vitest';
import {
  aggregateMetrics,
  classifyBucket,
  classifyHealth,
  modelScore,
  percentile,
  shouldExcludeModel,
  type MetricRow,
} from '@/lib/aiChatStats';

const NOW = new Date('2026-01-01T12:00:00Z').getTime();

function row(model: string, status: string, latency: number, agoMin = 5, isFree = true): MetricRow {
  return {
    model,
    status,
    latency_ms: latency,
    ts: new Date(NOW - agoMin * 60_000).toISOString(),
    is_free: isFree,
  };
}

describe('classifyBucket', () => {
  it('clasifica latencia en fast/medium/slow', () => {
    expect(classifyBucket(0)).toBe('fast');
    expect(classifyBucket(1999)).toBe('fast');
    expect(classifyBucket(2000)).toBe('medium');
    expect(classifyBucket(6000)).toBe('medium');
    expect(classifyBucket(6001)).toBe('slow');
  });
});

describe('classifyHealth', () => {
  it('working con success ≥ 80% y al menos 3 calls', () => {
    expect(
      classifyHealth({ calls: 5, successRate: 0.9, lastStatus: 'ok', lastTs: new Date(NOW).toISOString(), now: NOW }),
    ).toBe('working');
  });
  it('flaky entre 30% y 80%', () => {
    expect(
      classifyHealth({ calls: 5, successRate: 0.5, lastStatus: 'ok', lastTs: new Date(NOW).toISOString(), now: NOW }),
    ).toBe('flaky');
  });
  it('down con success < 30%', () => {
    expect(
      classifyHealth({ calls: 10, successRate: 0.1, lastStatus: 'error', lastTs: new Date(NOW).toISOString(), now: NOW }),
    ).toBe('down');
  });
  it('down si último estado distinto a ok hace > 1h', () => {
    const oldTs = new Date(NOW - 2 * 60 * 60 * 1000).toISOString();
    expect(
      classifyHealth({ calls: 10, successRate: 0.95, lastStatus: 'timeout', lastTs: oldTs, now: NOW }),
    ).toBe('down');
  });
  it('unknown sin calls', () => {
    expect(classifyHealth({ calls: 0, successRate: 0, lastStatus: null, lastTs: null, now: NOW })).toBe('unknown');
  });
});

describe('percentile', () => {
  it('p95 de [1..100] ≈ 95', () => {
    const arr = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(arr, 0.95)).toBe(95);
  });
  it('lista vacía → 0', () => {
    expect(percentile([], 0.95)).toBe(0);
  });
});

describe('aggregateMetrics', () => {
  it('calcula stats por modelo y ordena por health/latencia', () => {
    const rows: MetricRow[] = [
      row('A', 'ok', 1000, 10),
      row('A', 'ok', 1500, 5),
      row('A', 'ok', 800, 1),
      row('A', 'ok', 1200, 0.5),
      row('B', 'error', 2000, 5),
      row('B', 'error', 2000, 3),
      row('B', 'error', 2000, 1),
    ];
    const stats = aggregateMetrics(rows, NOW);
    const a = stats.find((s) => s.model === 'A')!;
    const b = stats.find((s) => s.model === 'B')!;
    expect(a.calls).toBe(4);
    expect(a.success_rate).toBe(1);
    expect(a.health).toBe('working');
    expect(b.health).toBe('down');
    // working antes que down
    expect(stats[0].model).toBe('A');
    expect(stats[stats.length - 1].model).toBe('B');
  });
});

describe('modelScore', () => {
  it('combina success y velocidad', () => {
    const fast = modelScore({
      model: 'x',
      calls: 10,
      ok_calls: 10,
      success_rate: 1,
      avg_latency_ms: 500,
      p95_latency_ms: 600,
      last_status: 'ok',
      last_ts: null,
      is_free: true,
      bucket: 'fast',
      health: 'working',
    });
    const slow = modelScore({
      model: 'y',
      calls: 10,
      ok_calls: 10,
      success_rate: 1,
      avg_latency_ms: 8000,
      p95_latency_ms: 9000,
      last_status: 'ok',
      last_ts: null,
      is_free: true,
      bucket: 'slow',
      health: 'working',
    });
    expect(fast).toBeGreaterThan(slow);
  });
});

describe('shouldExcludeModel', () => {
  it('excluye con 3 fallos consecutivos recientes', () => {
    const rows: MetricRow[] = [
      row('A', 'timeout', 25_000, 1),
      row('A', 'timeout', 25_000, 2),
      row('A', 'error', 0, 3),
    ];
    expect(shouldExcludeModel(rows, NOW)).toBe(true);
  });
  it('no excluye si la mayoría reciente es ok', () => {
    const rows: MetricRow[] = [
      row('A', 'ok', 1000, 1),
      row('A', 'ok', 1000, 2),
      row('A', 'error', 0, 3),
      row('A', 'ok', 1000, 4),
    ];
    expect(shouldExcludeModel(rows, NOW)).toBe(false);
  });
  it('excluye si success_rate < 30% en últimas 2h', () => {
    const rows: MetricRow[] = [
      row('A', 'error', 0, 1),
      row('A', 'error', 0, 2),
      row('A', 'ok', 1000, 3),
      row('A', 'error', 0, 4),
      row('A', 'error', 0, 5),
    ];
    expect(shouldExcludeModel(rows, NOW)).toBe(true);
  });
  it('ignora filas más viejas que 2h', () => {
    const rows: MetricRow[] = [
      row('A', 'error', 0, 60 * 3),
      row('A', 'error', 0, 60 * 4),
      row('A', 'error', 0, 60 * 5),
    ];
    expect(shouldExcludeModel(rows, NOW)).toBe(false);
  });
});

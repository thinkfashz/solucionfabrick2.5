#!/usr/bin/env node
/**
 * Dependency-free smoke/load probe for Soluciones Fabrick.
 *
 * Safe defaults: GET-only public endpoints, low concurrency, short run.
 * Do NOT use this as a 100k stress test against production. Use it to validate
 * cache headers, latency and error rates before moving to a real load platform.
 *
 * Usage:
 *   BASE_URL=https://www.solucionesfabrick.com pnpm load:smoke
 *   BASE_URL=https://preview.vercel.app LOAD_TOTAL=500 LOAD_CONCURRENCY=25 pnpm load:smoke
 */

const BASE_URL = (process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
const TOTAL = Number.parseInt(process.env.LOAD_TOTAL || '120', 10);
const CONCURRENCY = Number.parseInt(process.env.LOAD_CONCURRENCY || '10', 10);
const TIMEOUT_MS = Number.parseInt(process.env.LOAD_TIMEOUT_MS || '8000', 10);

const PATHS = [
  '/',
  '/tienda',
  '/api/tienda/products',
  '/api/productos?limit=3',
  '/api/site-structure/nav-menu',
  '/api/payments/mp-status',
];

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function request(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: path.startsWith('/api/') ? 'application/json' : 'text/html' },
    });
    const latency = Math.round(performance.now() - started);
    await res.arrayBuffer().catch(() => undefined);
    return {
      path,
      ok: res.ok,
      status: res.status,
      latency,
      cache: res.headers.get('cache-control') || '',
    };
  } catch (error) {
    return {
      path,
      ok: false,
      status: 0,
      latency: Math.round(performance.now() - started),
      error: error instanceof Error ? error.name : 'fetch_error',
      cache: '',
    };
  } finally {
    clearTimeout(timer);
  }
}

async function worker(queue, results) {
  while (queue.length > 0) {
    const idx = queue.shift();
    if (idx == null) return;
    const path = PATHS[idx % PATHS.length];
    results.push(await request(path));
  }
}

const startedAt = Date.now();
const queue = Array.from({ length: Math.max(1, TOTAL) }, (_, i) => i);
const results = [];
await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, () => worker(queue, results)));

const byPath = new Map();
for (const result of results) {
  const group = byPath.get(result.path) || [];
  group.push(result);
  byPath.set(result.path, group);
}

const latency = results.map((r) => r.latency);
const errors = results.filter((r) => !r.ok);
const durationSec = Math.max(0.001, (Date.now() - startedAt) / 1000);
const summary = {
  baseUrl: BASE_URL,
  total: results.length,
  concurrency: CONCURRENCY,
  durationSec: Number(durationSec.toFixed(2)),
  rps: Number((results.length / durationSec).toFixed(2)),
  errorRate: Number((errors.length / Math.max(1, results.length)).toFixed(4)),
  p50: percentile(latency, 50),
  p95: percentile(latency, 95),
  p99: percentile(latency, 99),
  byPath: Object.fromEntries(
    [...byPath.entries()].map(([path, rows]) => {
      const rowLatency = rows.map((r) => r.latency);
      return [path, {
        count: rows.length,
        ok: rows.filter((r) => r.ok).length,
        errors: rows.filter((r) => !r.ok).length,
        p95: percentile(rowLatency, 95),
        statuses: rows.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {}),
        cacheHeaders: [...new Set(rows.map((r) => r.cache).filter(Boolean))].slice(0, 3),
      }];
    }),
  ),
};

console.log(JSON.stringify(summary, null, 2));

if (summary.errorRate > 0.02 || summary.p95 > 2500) {
  console.error('Smoke load check failed: errorRate > 2% or p95 > 2500ms.');
  process.exit(1);
}

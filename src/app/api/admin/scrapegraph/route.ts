export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  smartScrape,
  searchAndScrape,
  batchScrape,
  resolveAiConfig,
  resolveSerperKey,
} from '@/lib/scrapegraph';

/* ─── InsForge helpers ───────────────────────────────────────────────────── */
const INSFORGE_URL =
  process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function resolveApiKey() {
  if (process.env.INSFORGE_API_KEY) return process.env.INSFORGE_API_KEY;
  if (process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY) return process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  return 'ik_7e23032539c2dc64d5d27ca29d07b928';
}

function sqlText(value: unknown) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value: unknown) {
  return `${sqlText(JSON.stringify(value ?? {}))}::jsonb`;
}

async function runRawSql(query: string) {
  const apiKey = resolveApiKey();
  const url = `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(30_000),
    cache: 'no-store',
  });
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

async function ensureTable() {
  return runRawSql(`
CREATE TABLE IF NOT EXISTS scrapegraph_runs (
  id SERIAL PRIMARY KEY,
  mode TEXT NOT NULL,
  input JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  model TEXT,
  provider TEXT,
  duration_ms INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE scrapegraph_runs ADD COLUMN IF NOT EXISTS provider TEXT;
`);
}

/* ─── GET — history ──────────────────────────────────────────────────────── */
export async function GET() {
  void ensureTable().catch(() => null);
  const result = await runRawSql(
    `SELECT id, mode, input, result, model, provider, duration_ms, error, created_at FROM scrapegraph_runs ORDER BY created_at DESC LIMIT 50;`,
  );
  const rows = (result.data as { data?: { rows?: unknown[] } })?.data?.rows ?? [];
  return NextResponse.json({ runs: rows });
}

/* ─── POST — execute scrape ──────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  void ensureTable().catch(() => null);

  let body: {
    mode: 'smart' | 'search' | 'batch';
    url?: string;
    urls?: string[];
    query?: string;
    prompt: string;
    outputSchema?: string;
  };

  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { mode, prompt, url, urls, query, outputSchema } = body;

  if (!mode || !prompt) {
    return NextResponse.json({ error: 'Faltan campos: mode y prompt son requeridos' }, { status: 400 });
  }

  const aiConfig = await resolveAiConfig();
  if (!aiConfig) {
    return NextResponse.json({ error: 'No hay API key de IA configurada. Ve a Centro de Integraciones.' }, { status: 503 });
  }

  const serperKey = await resolveSerperKey();

  let result: unknown = null;
  let durationMs = 0;
  let errorMsg: string | null = null;

  try {
    if (mode === 'smart') {
      if (!url) return NextResponse.json({ error: 'Falta url para modo smart' }, { status: 400 });
      const r = await smartScrape({ url, prompt, outputSchema, aiConfig });
      result = r.data;
      durationMs = r.duration_ms;
    } else if (mode === 'search') {
      if (!query) return NextResponse.json({ error: 'Falta query para modo search' }, { status: 400 });
      const r = await searchAndScrape({ query, prompt, serperKey, aiConfig });
      result = r.results;
      durationMs = r.duration_ms;
    } else if (mode === 'batch') {
      if (!urls?.length) return NextResponse.json({ error: 'Falta urls para modo batch' }, { status: 400 });
      const r = await batchScrape({ urls, prompt, aiConfig });
      result = r.results;
      durationMs = r.duration_ms;
    } else {
      return NextResponse.json({ error: 'Modo inválido' }, { status: 400 });
    }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  // Persist run
  const input = { url, urls, query, prompt, outputSchema };
  await runRawSql(`
INSERT INTO scrapegraph_runs (mode, input, result, model, provider, duration_ms, error)
VALUES (
  ${sqlText(mode)},
  ${sqlJson(input)},
  ${result !== null ? sqlJson(result) : 'NULL'},
  ${sqlText(aiConfig.modelo)},
  ${sqlText(aiConfig.provider)},
  ${durationMs},
  ${sqlText(errorMsg)}
);`).catch(() => null);

  if (errorMsg) {
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    mode,
    result,
    model: aiConfig.modelo,
    provider: aiConfig.provider,
    duration_ms: durationMs,
  });
}

/* ─── DELETE — remove run ────────────────────────────────────────────────── */
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  await runRawSql(`DELETE FROM scrapegraph_runs WHERE id = ${Number(id)};`);
  return NextResponse.json({ ok: true });
}

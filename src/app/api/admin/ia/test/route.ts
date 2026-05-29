export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function insforgeKey() {
  return process.env.INSFORGE_API_KEY
    || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
    || 'ik_7e23032539c2dc64d5d27ca29d07b928';
}

interface DbConfigRow { anthropic_api_key?: string; modelo_ia?: string }
interface DbResult { data?: { rows?: DbConfigRow[] } }

async function getStoredConfig(): Promise<{ apiKey: string | null; modelo: string }> {
  const envKey = process.env.ANTHROPIC_API_KEY || null;
  try {
    const res = await fetch(
      `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': insforgeKey() },
        body: JSON.stringify({ query: `SELECT anthropic_api_key, modelo_ia FROM configuracion_ia WHERE id = 'singleton' LIMIT 1;` }),
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      },
    );
    if (res.ok) {
      const data = await res.json() as DbResult;
      const row = data.data?.rows?.[0];
      if (row?.anthropic_api_key) return { apiKey: row.anthropic_api_key, modelo: row.modelo_ia || 'claude-haiku-4-5-20251001' };
    }
  } catch { /* fall through to env */ }
  return { apiKey: envKey, modelo: 'claude-haiku-4-5-20251001' };
}

interface AnthropicMsg { content?: { text?: string }[] }

export async function POST() {
  const t0 = Date.now();
  const { apiKey, modelo } = await getStoredConfig();
  if (!apiKey) return NextResponse.json({ ok: false, error: 'Sin API key configurada' }, { status: 400 });

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: modelo, max_tokens: 16, messages: [{ role: 'user', content: 'Di OK.' }] }),
      signal: AbortSignal.timeout(20_000),
    });
    const latency_ms = Date.now() - t0;
    if (!res.ok) return NextResponse.json({ ok: false, error: await res.text(), latency_ms });
    const data = await res.json() as AnthropicMsg;
    return NextResponse.json({ ok: true, model: modelo, latency_ms, reply: data.content?.[0]?.text || 'OK' });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message, latency_ms: Date.now() - t0 }, { status: 502 });
  }
}

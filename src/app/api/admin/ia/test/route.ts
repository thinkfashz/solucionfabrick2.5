export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function insforgeKey() {
  return process.env.INSFORGE_API_KEY
    || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
    || 'ik_7e23032539c2dc64d5d27ca29d07b928';
}

interface DbConfigRow { anthropic_api_key?: string; modelo_ia?: string; proveedor_ia?: string }
interface DbIntegrationRow { credentials?: Record<string, string> }
interface DbResult { data?: { rows?: (DbConfigRow | DbIntegrationRow)[] } }

async function rawsql(query: string) {
  const res = await fetch(
    `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': insforgeKey() },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    },
  );
  if (!res.ok) return null;
  return res.json() as Promise<DbResult>;
}

type Provider = 'anthropic' | 'groq' | 'openrouter';

interface AiConfig { provider: Provider; apiKey: string; modelo: string; siteUrl?: string; appName?: string }

async function getStoredConfig(): Promise<AiConfig | null> {
  try {
    const configData = await rawsql(
      `SELECT anthropic_api_key, modelo_ia, proveedor_ia FROM configuracion_ia WHERE id = 'singleton' LIMIT 1;`
    );
    const row = (configData?.data?.rows as DbConfigRow[] | undefined)?.[0];
    const proveedor = (row?.proveedor_ia ?? 'anthropic') as Provider;
    const prefModelo = row?.modelo_ia ?? '';

    if (proveedor === 'openrouter') {
      const d = await rawsql(`SELECT credentials FROM integrations WHERE provider = 'openrouter' LIMIT 1;`);
      const r = (d?.data?.rows as DbIntegrationRow[] | undefined)?.[0];
      const k = (r?.credentials?.api_key ?? '').trim();
      if (k) return { provider: 'openrouter', apiKey: k, modelo: prefModelo || 'meta-llama/llama-3.3-70b-instruct:free', siteUrl: r?.credentials?.site_url, appName: r?.credentials?.app_name };
    }

    if (proveedor === 'groq') {
      const groqData = await rawsql(`SELECT credentials FROM integrations WHERE provider = 'groq' LIMIT 1;`);
      const groqRow = (groqData?.data?.rows as DbIntegrationRow[] | undefined)?.[0];
      const groqKey = (groqRow?.credentials?.api_key ?? '').trim();
      if (groqKey) return { provider: 'groq', apiKey: groqKey, modelo: prefModelo || groqRow?.credentials?.modelo || 'llama-3.3-70b-versatile' };
    }

    // Try anthropic from integrations table
    const anthropicData = await rawsql(`SELECT credentials FROM integrations WHERE provider = 'anthropic' LIMIT 1;`);
    const anthropicRow = (anthropicData?.data?.rows as DbIntegrationRow[] | undefined)?.[0];
    const anthropicKey = (anthropicRow?.credentials?.api_key ?? '').trim();
    if (anthropicKey) {
      return { provider: 'anthropic', apiKey: anthropicKey, modelo: prefModelo || anthropicRow?.credentials?.modelo || 'claude-haiku-4-5-20251001' };
    }

    // Fallback: try openrouter even if not primary
    const orData = await rawsql(`SELECT credentials FROM integrations WHERE provider = 'openrouter' LIMIT 1;`);
    const orRow = (orData?.data?.rows as DbIntegrationRow[] | undefined)?.[0];
    const orKey = (orRow?.credentials?.api_key ?? '').trim();
    if (orKey) return { provider: 'openrouter', apiKey: orKey, modelo: prefModelo || 'meta-llama/llama-3.3-70b-instruct:free', siteUrl: orRow?.credentials?.site_url, appName: orRow?.credentials?.app_name };

    // Legacy key in configuracion_ia
    if (row?.anthropic_api_key) {
      return { provider: 'anthropic', apiKey: row.anthropic_api_key, modelo: prefModelo || 'claude-haiku-4-5-20251001' };
    }
  } catch { /* fall through */ }

  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) return { provider: 'anthropic', apiKey: envKey, modelo: 'claude-haiku-4-5-20251001' };
  return null;
}

interface AnthropicMsg { content?: { text?: string }[] }
interface GroqMsg { choices?: { message?: { content?: string } }[] }

export async function POST() {
  const t0 = Date.now();
  const config = await getStoredConfig();
  if (!config) return NextResponse.json({ ok: false, error: 'Sin API key configurada' }, { status: 400 });

  try {
    if (config.provider === 'groq' || config.provider === 'openrouter') {
      const url = config.provider === 'groq'
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://openrouter.ai/api/v1/chat/completions';
      const headers: Record<string, string> = {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      };
      if (config.provider === 'openrouter') {
        if (config.siteUrl) headers['HTTP-Referer'] = config.siteUrl;
        if (config.appName) headers['X-Title'] = config.appName;
      }
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.modelo,
          max_tokens: 16,
          messages: [{ role: 'user', content: 'Di OK.' }],
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const latency_ms = Date.now() - t0;
      if (!res.ok) return NextResponse.json({ ok: false, error: await res.text(), latency_ms });
      const data = await res.json() as GroqMsg;
      return NextResponse.json({ ok: true, model: config.modelo, provider: config.provider, latency_ms, reply: data.choices?.[0]?.message?.content || 'OK' });
    }

    // Anthropic
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: config.modelo, max_tokens: 16, messages: [{ role: 'user', content: 'Di OK.' }] }),
      signal: AbortSignal.timeout(20_000),
    });
    const latency_ms = Date.now() - t0;
    if (!res.ok) return NextResponse.json({ ok: false, error: await res.text(), latency_ms });
    const data = await res.json() as AnthropicMsg;
    return NextResponse.json({ ok: true, model: config.modelo, provider: 'anthropic', latency_ms, reply: data.content?.[0]?.text || 'OK' });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message, latency_ms: Date.now() - t0 }, { status: 502 });
  }
}

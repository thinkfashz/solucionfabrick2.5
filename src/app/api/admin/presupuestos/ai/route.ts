export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

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
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
    },
  );
  if (!res.ok) return null;
  return res.json() as Promise<DbResult>;
}

type Provider = 'anthropic' | 'groq';

interface AiConfig {
  provider: Provider;
  apiKey: string;
  modelo: string;
}

async function resolveAiConfig(): Promise<AiConfig | null> {
  // 1. Check configuracion_ia table for proveedor_ia + anthropic key
  try {
    const data = await rawsql(
      `SELECT anthropic_api_key, modelo_ia, proveedor_ia FROM configuracion_ia WHERE id = 'singleton' LIMIT 1;`
    );
    const row = (data?.data?.rows as DbConfigRow[] | undefined)?.[0];
    const proveedor = (row?.proveedor_ia as Provider | undefined) ?? 'anthropic';

    if (proveedor === 'groq') {
      // Check integrations table for groq key
      const groqData = await rawsql(
        `SELECT credentials FROM integrations WHERE provider = 'groq' LIMIT 1;`
      );
      const groqRow = (groqData?.data?.rows as DbIntegrationRow[] | undefined)?.[0];
      const groqKey = (groqRow?.credentials?.api_key ?? '').trim();
      const groqModelo = (groqRow?.credentials?.modelo ?? 'llama-3.3-70b-versatile').trim();
      if (groqKey) return { provider: 'groq', apiKey: groqKey, modelo: groqModelo };
    }

    // Try anthropic: first check integrations table
    const anthropicData = await rawsql(
      `SELECT credentials FROM integrations WHERE provider = 'anthropic' LIMIT 1;`
    );
    const anthropicRow = (anthropicData?.data?.rows as DbIntegrationRow[] | undefined)?.[0];
    const anthropicKey = (anthropicRow?.credentials?.api_key ?? '').trim();
    const anthropicModelo = (anthropicRow?.credentials?.modelo ?? '').trim();
    if (anthropicKey) {
      return {
        provider: 'anthropic',
        apiKey: anthropicKey,
        modelo: anthropicModelo || row?.modelo_ia || 'claude-haiku-4-5-20251001',
      };
    }

    // Fall back to configuracion_ia anthropic key
    if (row?.anthropic_api_key) {
      return {
        provider: 'anthropic',
        apiKey: row.anthropic_api_key,
        modelo: row.modelo_ia || 'claude-haiku-4-5-20251001',
      };
    }
  } catch { /* fall through */ }

  // 2. Env var fallback
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) return { provider: 'anthropic', apiKey: envKey, modelo: 'claude-haiku-4-5-20251001' };

  return null;
}

async function callAnthropic(apiKey: string, modelo: string, systemPrompt: string, userPrompt: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: modelo, max_tokens: 1024, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error Anthropic (${res.status}): ${err}`);
  }
  const data = await res.json() as { content?: { text?: string }[] };
  return data.content?.[0]?.text ?? '';
}

async function callGroq(apiKey: string, modelo: string, systemPrompt: string, userPrompt: string) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelo,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error Groq (${res.status}): ${err}`);
  }
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}

export async function POST(req: NextRequest) {
  const config = await resolveAiConfig();

  if (!config) {
    return NextResponse.json({
      error: 'No hay API key de IA configurada. Ve a Admin → Centro de Integraciones y agrega tu clave de Anthropic o Groq, o ve a Admin → Configuración IA.',
    }, { status: 500 });
  }

  let body: { prompt?: string };
  try { body = await req.json() as { prompt?: string }; }
  catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }); }

  const { prompt } = body;
  if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt vacío' }, { status: 400 });

  const systemPrompt = `Eres un asistente experto en presupuestos de construcción y mobiliario en Chile.
Dado un brief del proyecto, genera los campos del presupuesto en español chileno formal.
Responde ÚNICAMENTE con un JSON válido con estos campos exactos (sin texto adicional antes ni después):
{
  "titulo": "string corto descriptivo",
  "descripcion": "2-3 oraciones describiendo el alcance del proyecto",
  "incluye": ["ítem incluido 1", "ítem incluido 2"],
  "no_incluye": ["ítem excluido 1", "ítem excluido 2"],
  "materiales": ["material 1", "material 2"],
  "observacion_tecnica": "1-2 oraciones con observaciones técnicas relevantes"
}
Genera entre 5-8 ítems en incluye, 4-6 en no_incluye, 4-8 en materiales.`;

  try {
    const text = config.provider === 'groq'
      ? await callGroq(config.apiKey, config.modelo, systemPrompt, prompt.trim())
      : await callAnthropic(config.apiKey, config.modelo, systemPrompt, prompt.trim());

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? text) as Record<string, unknown>;
    return NextResponse.json({ result: parsed, model: config.modelo, provider: config.provider });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('{')) {
      // JSON parse error on a response we got
      return NextResponse.json({ error: 'La IA no devolvió JSON válido', raw: msg }, { status: 422 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

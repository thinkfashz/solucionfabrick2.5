export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function insforgeKey() {
  return process.env.INSFORGE_API_KEY
    || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
    || 'ik_7e23032539c2dc64d5d27ca29d07b928';
}

interface DbConfigRow { anthropic_api_key?: string; modelo_ia?: string }
interface DbResult { data?: { rows?: DbConfigRow[] } }

async function resolveAiConfig(): Promise<{ apiKey: string | null; modelo: string }> {
  // Prefer DB-stored key; fall back to env var
  try {
    const res = await fetch(
      `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': insforgeKey() },
        body: JSON.stringify({ query: `SELECT anthropic_api_key, modelo_ia FROM configuracion_ia WHERE id = 'singleton' LIMIT 1;` }),
        signal: AbortSignal.timeout(8_000),
        cache: 'no-store',
      },
    );
    if (res.ok) {
      const data = await res.json() as DbResult;
      const row = data.data?.rows?.[0];
      if (row?.anthropic_api_key) {
        return { apiKey: row.anthropic_api_key, modelo: row.modelo_ia || 'claude-haiku-4-5-20251001' };
      }
    }
  } catch { /* fall through */ }
  return { apiKey: process.env.ANTHROPIC_API_KEY || null, modelo: 'claude-haiku-4-5-20251001' };
}

interface AnthropicResponse { content?: { text?: string }[] }

export async function POST(req: NextRequest) {
  const { apiKey, modelo } = await resolveAiConfig();

  if (!apiKey) {
    return NextResponse.json({
      error: 'No hay API key de Anthropic configurada. Ve a Admin → Configuración IA para agregarla.',
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

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: modelo, max_tokens: 1024, system: systemPrompt, messages: [{ role: 'user', content: prompt.trim() }] }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `Error Anthropic: ${err}` }, { status: res.status });
  }

  const data = await res.json() as AnthropicResponse;
  const text = data.content?.[0]?.text || '';
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? text) as Record<string, unknown>;
    return NextResponse.json({ result: parsed, model: modelo });
  } catch {
    return NextResponse.json({ error: 'La IA no devolvió JSON válido', raw: text }, { status: 422 });
  }
}

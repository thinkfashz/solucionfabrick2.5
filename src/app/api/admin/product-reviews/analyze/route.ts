import { NextResponse, type NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { getAdminTenantId } from '@/lib/adminApi';
import { insforgeAdmin } from '@/lib/insforge';
import { resolveTenantProviderConfig } from '@/lib/tenantAiConfig';
import { getOpenRouterCredentials } from '@/lib/openrouter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Provider = 'ollama' | 'openrouter';

type ReviewAnalysis = {
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  summary: string;
  topics: string[];
  riskFlags: string[];
  replySuggestion: string;
  confidence: number;
  provider: Provider | 'local';
  model: string | null;
  analyzedAt: string;
};

function cleanText(value: unknown, max = 1000) {
  return String(value ?? '').trim().replace(/[<>]/g, '').slice(0, max);
}

function cleanList(value: unknown, limit = 8) {
  return Array.isArray(value)
    ? Array.from(new Set(value.map((item) => cleanText(item, 120)).filter(Boolean))).slice(0, limit)
    : [];
}

function cleanJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  const raw = fenced || (start >= 0 && end > start ? text.slice(start, end + 1) : text);
  return JSON.parse(raw) as Record<string, unknown>;
}

function localAnalysis(rating: number, body: string): ReviewAnalysis {
  const sentiment: ReviewAnalysis['sentiment'] = rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral';
  const short = body.length > 180 ? body.slice(0, 177) + '…' : body;
  return {
    sentiment,
    summary: short || 'Opinión sin texto suficiente para resumir.',
    topics: [],
    riskFlags: [],
    replySuggestion: rating <= 2
      ? 'Gracias por contarnos tu experiencia. Queremos revisar lo ocurrido y ayudarte a resolverlo. Escríbenos con los datos de tu compra para revisarlo contigo.'
      : 'Gracias por compartir tu experiencia. Tu opinión nos ayuda a mejorar y también orienta a otros clientes.',
    confidence: 45,
    provider: 'local',
    model: null,
    analyzedAt: new Date().toISOString(),
  };
}

function normalizeAnalysis(raw: Record<string, unknown>, fallback: ReviewAnalysis, provider: Provider, model: string): ReviewAnalysis {
  const sentimentRaw = cleanText(raw.sentiment, 20).toLowerCase();
  const sentiment = ['positive','neutral','negative','mixed'].includes(sentimentRaw)
    ? sentimentRaw as ReviewAnalysis['sentiment']
    : fallback.sentiment;
  const confidenceNumber = Number(raw.confidence);
  return {
    sentiment,
    summary: cleanText(raw.summary, 500) || fallback.summary,
    topics: cleanList(raw.topics, 8),
    riskFlags: cleanList(raw.riskFlags, 8),
    replySuggestion: cleanText(raw.replySuggestion, 900) || fallback.replySuggestion,
    confidence: Number.isFinite(confidenceNumber) ? Math.min(100, Math.max(0, Math.round(confidenceNumber))) : 65,
    provider,
    model: model || null,
    analyzedAt: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'update' });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as { reviewId?: unknown; provider?: unknown; model?: unknown };
  const reviewId = cleanText(body.reviewId, 80);
  const provider: Provider = body.provider === 'openrouter' ? 'openrouter' : 'ollama';
  const requestedModel = cleanText(body.model, 180);
  if (!reviewId) return NextResponse.json({ error: 'Falta la opinión.' }, { status: 400 });

  const tenantId = await getAdminTenantId(request);
  const { data: rows, error } = await insforgeAdmin.database
    .from('product_reviews')
    .select('id,product_id,author_name,rating,body,status,analysis')
    .eq('tenant_id', tenantId)
    .eq('id', reviewId)
    .limit(1);
  if (error) return NextResponse.json({ error: error.message || 'No se pudo cargar la opinión.' }, { status: 500 });
  const review = Array.isArray(rows) ? rows[0] as Record<string, unknown> | undefined : undefined;
  if (!review) return NextResponse.json({ error: 'Opinión no encontrada.' }, { status: 404 });

  const productId = cleanText(review.product_id, 80);
  const { data: productRows } = await insforgeAdmin.database
    .from('products')
    .select('name')
    .eq('tenant_id', tenantId)
    .eq('id', productId)
    .limit(1);
  const productName = Array.isArray(productRows) && productRows[0] ? cleanText((productRows[0] as { name?: unknown }).name, 180) : 'Producto';
  const rating = Math.min(5, Math.max(1, Math.round(Number(review.rating) || 5)));
  const reviewBody = cleanText(review.body, 1200);
  const fallback = localAnalysis(rating, reviewBody);

  const prompt = `Analiza una opinión real de ecommerce para Soluciones Fabrick, Chile.
Devuelve SOLO JSON válido:
{"sentiment":"positive|neutral|negative|mixed","summary":"...","topics":["..."],"riskFlags":["..."],"replySuggestion":"...","confidence":0}

Producto: ${productName}
Puntuación: ${rating}/5
Cliente: ${cleanText(review.author_name, 80)}
Opinión: ${reviewBody}

Reglas:
- Resume lo que realmente dice el cliente; no inventes hechos.
- riskFlags solo para señales verificables del texto: seguridad, daño, incumplimiento, fraude, garantía, despacho, maltrato o riesgo reputacional.
- replySuggestion debe sonar humano, breve y profesional.
- No afirmes que una compra está verificada ni prometas compensaciones.
- Si faltan datos para concluir algo, dilo en el resumen.
`;

  let analysis = fallback;

  try {
    if (provider === 'ollama') {
      const config = await resolveTenantProviderConfig('ollama', requestedModel, tenantId);
      if (config) {
        const model = requestedModel || config.modelo;
        const response = await fetch(`${(config.baseUrl || 'https://ollama.com/v1').replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, temperature: 0.2, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] }),
          cache: 'no-store',
          signal: AbortSignal.timeout(75_000),
        });
        const json = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
        if (!response.ok) throw new Error(json.error?.message || `Ollama HTTP ${response.status}`);
        const text = json.choices?.[0]?.message?.content || '';
        if (text) analysis = normalizeAnalysis(cleanJson(text), fallback, 'ollama', model);
      }
    } else {
      const credentials = await getOpenRouterCredentials();
      if (credentials) {
        const model = requestedModel || 'openai/gpt-4o-mini';
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            'Content-Type': 'application/json',
            'X-Title': credentials.appName,
            ...(credentials.siteUrl ? { 'HTTP-Referer': credentials.siteUrl } : {}),
          },
          body: JSON.stringify({ model, temperature: 0.2, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] }),
          cache: 'no-store',
          signal: AbortSignal.timeout(75_000),
        });
        const json = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
        if (!response.ok) throw new Error(json.error?.message || `OpenRouter HTTP ${response.status}`);
        const text = json.choices?.[0]?.message?.content || '';
        if (text) analysis = normalizeAnalysis(cleanJson(text), fallback, 'openrouter', model);
      }
    }
  } catch (aiError) {
    analysis = { ...fallback, riskFlags: [`IA no disponible: ${aiError instanceof Error ? aiError.message.slice(0, 140) : 'error desconocido'}`] };
  }

  const { data: updated, error: updateError } = await insforgeAdmin.database
    .from('product_reviews')
    .update({ analysis, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('id', reviewId)
    .select('id,analysis')
    .limit(1);
  if (updateError) return NextResponse.json({ error: updateError.message || 'No se pudo guardar el análisis.' }, { status: 500 });

  return NextResponse.json({ ok: true, analysis, review: Array.isArray(updated) ? updated[0] : null });
}

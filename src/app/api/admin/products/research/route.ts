import { NextResponse, type NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { getAdminTenantId } from '@/lib/adminApi';
import { resolveTenantProviderConfig } from '@/lib/tenantAiConfig';
import { getOpenRouterCredentials } from '@/lib/openrouter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Provider = 'ollama' | 'openrouter';
type RefInput = {
  source?: unknown;
  sourceId?: unknown;
  title?: unknown;
  price?: unknown;
  currency?: unknown;
  url?: unknown;
  image?: unknown;
  position?: unknown;
  raw?: unknown;
};
type ProductInput = {
  name?: unknown;
  description?: unknown;
  tagline?: unknown;
  category?: unknown;
  price?: unknown;
};
type Feature = {
  label: string;
  value: string;
  confidence: number;
  sourceIndexes: number[];
};
type ResearchResult = {
  summary: string;
  tagline: string;
  description: string;
  features: Feature[];
  warnings: string[];
  searchTerms: string[];
  referenceImages: Array<{ url: string; sourceIndex: number; source: string }>;
  priceReference: {
    count: number;
    min: number | null;
    median: number | null;
    avg: number | null;
    max: number | null;
    currency: string | null;
  };
  provider: Provider | 'local';
  model: string | null;
};

function cleanText(value: unknown, max = 1000) {
  return String(value ?? '').trim().replace(/[<>]/g, '').replace(/\s+/g, ' ').slice(0, max);
}

function cleanUrl(value: unknown) {
  const url = cleanText(value, 2000);
  return /^https:\/\//i.test(url) ? url : '';
}

function numberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function cleanJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return JSON.parse(fenced || (start >= 0 && end > start ? text.slice(start, end + 1) : text)) as Record<string, unknown>;
}

function normalizeFeature(value: unknown, sourceCount: number): Feature | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const label = cleanText(row.label, 90);
  const featureValue = cleanText(row.value, 220);
  if (!label || !featureValue) return null;
  const confidence = Math.min(100, Math.max(0, Math.round(Number(row.confidence) || 60)));
  const sourceIndexes = Array.isArray(row.sourceIndexes)
    ? Array.from(new Set(row.sourceIndexes.map(Number).filter((index) => Number.isInteger(index) && index >= 1 && index <= sourceCount))).slice(0, 6)
    : [];
  return { label, value: featureValue, confidence, sourceIndexes };
}

type MlDetail = {
  id?: string;
  title?: string;
  warranty?: string;
  condition?: string;
  attributes?: Array<{ name?: string; value_name?: string; values?: Array<{ name?: string }> }>;
  pictures?: Array<{ secure_url?: string; url?: string }>;
};

async function fetchMlDetail(sourceId: string): Promise<MlDetail | null> {
  if (!/^ML[A-Z]\d+$/i.test(sourceId)) return null;
  try {
    const response = await fetch(`https://api.mercadolibre.com/items/${encodeURIComponent(sourceId)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    return await response.json() as MlDetail;
  } catch {
    return null;
  }
}

function rawSnippet(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return '';
  const row = raw as Record<string, unknown>;
  return cleanText(row.snippet || row.description || row.source || '', 500);
}

function priceStats(refs: Array<{ price: number | null; currency: string }>) {
  const prices = refs.map((ref) => ref.price).filter((value): value is number => typeof value === 'number' && value > 0);
  return {
    count: prices.length,
    min: prices.length ? Math.min(...prices) : null,
    median: median(prices),
    avg: prices.length ? prices.reduce((sum, value) => sum + value, 0) / prices.length : null,
    max: prices.length ? Math.max(...prices) : null,
    currency: refs.find((ref) => ref.currency)?.currency || null,
  };
}

function localResult(
  product: { name: string; description: string; tagline: string; category: string },
  enriched: Array<{ title: string; attributes: Array<{ label: string; value: string }>; pictures: string[]; source: string }>,
  priceReference: ResearchResult['priceReference'],
): ResearchResult {
  const featureMap = new Map<string, Feature>();
  enriched.forEach((reference, index) => {
    for (const feature of reference.attributes) {
      const key = feature.label.toLowerCase();
      if (!featureMap.has(key)) featureMap.set(key, { label: feature.label, value: feature.value, confidence: 88, sourceIndexes: [index + 1] });
    }
  });
  const referenceImages = enriched.flatMap((reference, index) => reference.pictures.slice(0, 5).map((url) => ({ url, sourceIndex: index + 1, source: reference.source }))).slice(0, 16);
  return {
    summary: enriched.length ? `Se encontraron ${enriched.length} referencias útiles para contrastar ${product.name}.` : 'No se obtuvieron suficientes referencias estructuradas.',
    tagline: product.tagline,
    description: product.description,
    features: Array.from(featureMap.values()).slice(0, 18),
    warnings: ['Revisa medidas, garantía y compatibilidad antes de publicar; distintas referencias pueden corresponder a variantes del mismo producto.'],
    searchTerms: [product.name, `${product.name} ficha técnica`, `${product.name} Chile`].filter(Boolean),
    referenceImages,
    priceReference,
    provider: 'local',
    model: null,
  };
}

function normalizeAiResult(
  raw: Record<string, unknown>,
  fallback: ResearchResult,
  provider: Provider,
  model: string,
  sourceCount: number,
): ResearchResult {
  const features = Array.isArray(raw.features)
    ? raw.features.map((value) => normalizeFeature(value, sourceCount)).filter((value): value is Feature => Boolean(value)).slice(0, 24)
    : fallback.features;
  const warnings = Array.isArray(raw.warnings) ? raw.warnings.map((value) => cleanText(value, 240)).filter(Boolean).slice(0, 10) : fallback.warnings;
  const searchTerms = Array.isArray(raw.searchTerms) ? raw.searchTerms.map((value) => cleanText(value, 140)).filter(Boolean).slice(0, 8) : fallback.searchTerms;
  return {
    ...fallback,
    summary: cleanText(raw.summary, 600) || fallback.summary,
    tagline: cleanText(raw.tagline, 180) || fallback.tagline,
    description: cleanText(raw.description, 3500) || fallback.description,
    features,
    warnings,
    searchTerms,
    provider,
    model: model || null,
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'read' });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as {
    product?: ProductInput;
    refs?: RefInput[];
    provider?: unknown;
    model?: unknown;
    guide?: unknown;
  };
  const product = {
    name: cleanText(body.product?.name, 180),
    description: cleanText(body.product?.description, 3500),
    tagline: cleanText(body.product?.tagline, 180),
    category: cleanText(body.product?.category, 160),
    price: numberOrNull(body.product?.price),
  };
  if (!product.name) return NextResponse.json({ error: 'Escribe o selecciona un producto antes de investigar.' }, { status: 400 });

  const refs = (Array.isArray(body.refs) ? body.refs : []).slice(0, 12).map((ref) => ({
    source: cleanText(ref.source, 30),
    sourceId: cleanText(ref.sourceId, 120),
    title: cleanText(ref.title, 320),
    price: numberOrNull(ref.price),
    currency: cleanText(ref.currency, 12) || 'CLP',
    url: cleanUrl(ref.url),
    image: cleanUrl(ref.image),
    position: Number(ref.position) || 0,
    snippet: rawSnippet(ref.raw),
  }));
  if (!refs.length) return NextResponse.json({ error: 'Selecciona al menos una referencia de la búsqueda online.' }, { status: 400 });

  const details = await Promise.all(refs.map((ref) => ref.source === 'mercadolibre' && ref.sourceId ? fetchMlDetail(ref.sourceId) : Promise.resolve(null)));
  const enriched = refs.map((ref, index) => {
    const detail = details[index];
    const attributes = (detail?.attributes || []).map((attribute) => ({
      label: cleanText(attribute.name, 90),
      value: cleanText(attribute.value_name || attribute.values?.[0]?.name, 220),
    })).filter((attribute) => attribute.label && attribute.value).slice(0, 35);
    if (detail?.warranty) attributes.push({ label: 'Garantía informada', value: cleanText(detail.warranty, 220) });
    if (detail?.condition) attributes.push({ label: 'Condición', value: cleanText(detail.condition, 80) });
    const pictures = Array.from(new Set([
      ref.image,
      ...(detail?.pictures || []).map((picture) => cleanUrl(picture.secure_url || picture.url)),
    ].filter(Boolean))).slice(0, 10);
    return {
      index: index + 1,
      source: ref.source,
      sourceId: ref.sourceId,
      title: detail?.title ? cleanText(detail.title, 320) : ref.title,
      price: ref.price,
      currency: ref.currency,
      url: ref.url,
      snippet: ref.snippet,
      attributes,
      pictures,
    };
  });

  const priceReference = priceStats(refs);
  const fallback = localResult(product, enriched, priceReference);
  const provider: Provider = body.provider === 'openrouter' ? 'openrouter' : 'ollama';
  const requestedModel = cleanText(body.model, 180);
  const guide = cleanText(body.guide, 2500);

  const evidence = enriched.map((ref) => ({
    index: ref.index,
    source: ref.source,
    title: ref.title,
    price: ref.price,
    currency: ref.currency,
    url: ref.url,
    snippet: ref.snippet,
    attributes: ref.attributes,
  }));

  const prompt = `Actúa como investigador de producto para una tienda chilena de construcción y hogar.
Tu tarea es completar una ficha comercial SOLO con la evidencia proporcionada. Devuelve SOLO JSON válido:
{"summary":"...","tagline":"...","description":"...","features":[{"label":"...","value":"...","confidence":90,"sourceIndexes":[1]}],"warnings":["..."],"searchTerms":["..."]}

Producto actual:
${JSON.stringify(product)}

Referencias numeradas:
${JSON.stringify(evidence)}

Guía del administrador:
${guide || 'Sin guía adicional.'}

Reglas:
- No inventes potencia, dimensiones, materiales, certificaciones, garantía, compatibilidad ni stock.
- Si dos referencias parecen variantes distintas, no combines atributos incompatibles: adviértelo.
- sourceIndexes debe indicar qué referencias sustentan cada característica.
- confidence alto solo si el dato aparece explícitamente en la evidencia.
- La descripción puede mejorar redacción, pero no añadir hechos no sustentados.
- Devuelve entre 4 y 18 características útiles cuando la evidencia alcance.
- searchTerms son nuevas búsquedas útiles para verificar información faltante.
`;

  let result = fallback;
  const tenantId = await getAdminTenantId(request);

  try {
    if (provider === 'ollama') {
      const config = await resolveTenantProviderConfig('ollama', requestedModel, tenantId);
      if (config) {
        const model = requestedModel || config.modelo;
        const response = await fetch(`${(config.baseUrl || 'https://ollama.com/v1').replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, temperature: 0.15, max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }),
          cache: 'no-store',
          signal: AbortSignal.timeout(90_000),
        });
        const json = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
        if (!response.ok) throw new Error(json.error?.message || `Ollama HTTP ${response.status}`);
        const text = json.choices?.[0]?.message?.content || '';
        if (text) result = normalizeAiResult(cleanJson(text), fallback, 'ollama', model, enriched.length);
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
          body: JSON.stringify({ model, temperature: 0.15, max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }),
          cache: 'no-store',
          signal: AbortSignal.timeout(90_000),
        });
        const json = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
        if (!response.ok) throw new Error(json.error?.message || `OpenRouter HTTP ${response.status}`);
        const text = json.choices?.[0]?.message?.content || '';
        if (text) result = normalizeAiResult(cleanJson(text), fallback, 'openrouter', model, enriched.length);
      }
    }
  } catch (error) {
    result = { ...fallback, warnings: [...fallback.warnings, `IA no disponible: ${error instanceof Error ? error.message.slice(0, 160) : 'error desconocido'}`] };
  }

  return NextResponse.json({
    ok: true,
    result,
    references: enriched,
  });
}

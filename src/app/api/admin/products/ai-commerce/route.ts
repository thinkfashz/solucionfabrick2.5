import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { getOpenRouterCredentials } from '@/lib/openrouter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MODELS = [process.env.OPENROUTER_MODEL, 'openai/gpt-4o-mini', 'google/gemini-2.0-flash-001'].filter(Boolean) as string[];

type Body = {
  product?: {
    name?: string;
    description?: string;
    category?: string;
    price?: number | string;
    cost?: number | string;
    stock?: number | string;
    specifications?: Record<string, unknown>;
  };
};

type Analysis = {
  title: string;
  shortDescription: string;
  longDescription: string;
  category: string;
  tags: string[];
  rating: number;
  estimatedDemand: number;
  estimatedPurchasePopularity: number;
  priceLow: number;
  priceMid: number;
  priceHigh: number;
  recommendedPrice: number;
  marginNote: string;
  buyerProfile: string;
  positioning: string;
  evidenceNote: string;
};

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return cookie ? decodeSession(cookie) : null;
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function fallback(body: Body): Analysis {
  const product = body.product || {};
  const current = Math.max(1, number(product.price, 10000));
  const cost = number(product.cost, 0);
  const low = Math.round(current * 0.9);
  const mid = Math.round(current);
  const high = Math.round(current * 1.18);
  return {
    title: product.name?.trim() || 'Producto para el hogar',
    shortDescription: product.description?.trim().slice(0, 220) || 'Producto seleccionado para proyectos de hogar, construcción o remodelación.',
    longDescription: product.description?.trim() || 'Producto pensado para personas que buscan comparar precio, utilidad y disponibilidad antes de comprar. Revisa medidas, compatibilidad, despacho e instalación cuando corresponda.',
    category: product.category?.trim() || 'Hogar y construcción',
    tags: ['hogar', 'construcción', 'remodelación', 'soluciones fabrick'],
    rating: 4,
    estimatedDemand: 62,
    estimatedPurchasePopularity: 58,
    priceLow: low,
    priceMid: mid,
    priceHigh: high,
    recommendedPrice: cost > 0 ? Math.max(mid, Math.round(cost * 1.35)) : mid,
    marginNote: cost > 0 ? 'El precio recomendado considera un margen base orientativo sobre el costo informado.' : 'No hay costo proveedor informado; valida margen, despacho, comisión e impuestos antes de publicar.',
    buyerProfile: 'Personas en Chile interesadas en mejorar, equipar o remodelar su hogar.',
    positioning: 'Presentar utilidad, contexto de uso, precio claro y soporte de instalación cuando corresponda.',
    evidenceNote: 'Estimación editorial generada sin una fuente de volumen de búsquedas en tiempo real.',
  };
}

function cleanJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return JSON.parse(fenced || (start >= 0 && end > start ? text.slice(start, end + 1) : text)) as Partial<Analysis>;
}

function normalize(value: Partial<Analysis>, base: Analysis): Analysis {
  const clamp = (input: unknown, min: number, max: number, fallbackValue: number) => Math.min(max, Math.max(min, Math.round(number(input, fallbackValue))));
  const money = (input: unknown, fallbackValue: number) => Math.max(0, Math.round(number(input, fallbackValue)));
  const tags = Array.isArray(value.tags) ? value.tags.map(String).map((item) => item.trim().toLowerCase()).filter(Boolean).slice(0, 12) : base.tags;
  return {
    title: String(value.title || base.title).trim().slice(0, 160),
    shortDescription: String(value.shortDescription || base.shortDescription).trim().slice(0, 320),
    longDescription: String(value.longDescription || base.longDescription).trim().slice(0, 1800),
    category: String(value.category || base.category).trim().slice(0, 100),
    tags,
    rating: Math.round(Math.min(5, Math.max(1, number(value.rating, base.rating))) * 10) / 10,
    estimatedDemand: clamp(value.estimatedDemand, 20, 95, base.estimatedDemand),
    estimatedPurchasePopularity: clamp(value.estimatedPurchasePopularity, 20, 95, base.estimatedPurchasePopularity),
    priceLow: money(value.priceLow, base.priceLow),
    priceMid: money(value.priceMid, base.priceMid),
    priceHigh: money(value.priceHigh, base.priceHigh),
    recommendedPrice: money(value.recommendedPrice, base.recommendedPrice),
    marginNote: String(value.marginNote || base.marginNote).trim().slice(0, 420),
    buyerProfile: String(value.buyerProfile || base.buyerProfile).trim().slice(0, 420),
    positioning: String(value.positioning || base.positioning).trim().slice(0, 420),
    evidenceNote: String(value.evidenceNote || base.evidenceNote).trim().slice(0, 320),
  };
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Body;
  if (!body.product?.name?.trim()) return NextResponse.json({ error: 'Producto requerido.' }, { status: 400 });

  const base = fallback(body);
  const credentials = await getOpenRouterCredentials();
  if (!credentials) return NextResponse.json({ ok: true, analysis: base, source: 'fallback', warning: base.evidenceNote });

  const product = body.product;
  const prompt = `Actúa como analista privado de ecommerce chileno, merchandiser y copywriter de catálogo. Devuelve SOLO JSON válido con esta estructura:
{"title":"...","shortDescription":"...","longDescription":"...","category":"...","tags":["..."],"rating":4.4,"estimatedDemand":70,"estimatedPurchasePopularity":68,"priceLow":10000,"priceMid":12000,"priceHigh":15000,"recommendedPrice":12990,"marginNote":"...","buyerProfile":"...","positioning":"...","evidenceNote":"..."}
Producto:
- Nombre: ${product.name}
- Descripción: ${product.description || 'sin descripción'}
- Categoría: ${product.category || 'sin categoría'}
- Precio actual: ${product.price || 'sin precio'}
- Costo proveedor: ${product.cost || 'sin costo'}
- Stock: ${product.stock || 'sin stock'}
Reglas:
- Genera título y descripciones claras, comerciales y naturales.
- Clasifica el producto y genera etiquetas específicas.
- Propón precio mínimo, medio, máximo y recomendado para ecommerce en Chile.
- Si no hay datos verificables de mercado en tiempo real, dilo explícitamente en evidenceNote.
- estimatedDemand y estimatedPurchasePopularity son estimaciones editoriales de 20 a 95, no búsquedas ni ventas reales.
- rating es una recomendación editorial inicial de 1 a 5; no debe presentarse como reseña real de clientes.
- No inventes materiales, potencia, medidas, certificaciones, garantía ni compatibilidad.
- El precio debe considerar costo cuando exista, pero aclara que faltan comisiones, IVA, despacho, devoluciones y publicidad cuando corresponda.`;

  let lastError = '';
  for (const model of MODELS) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${credentials.apiKey}`, 'Content-Type': 'application/json', 'X-Title': credentials.appName, ...(credentials.siteUrl ? { 'HTTP-Referer': credentials.siteUrl } : {}) },
        body: JSON.stringify({ model, temperature: 0.35, max_tokens: 1800, messages: [{ role: 'user', content: prompt }] }),
        cache: 'no-store',
      });
      const json = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
      if (!response.ok) { lastError = json.error?.message || `HTTP ${response.status}`; continue; }
      const text = json.choices?.[0]?.message?.content || '';
      if (!text) { lastError = 'Sin contenido'; continue; }
      return NextResponse.json({ ok: true, analysis: normalize(cleanJson(text), base), source: 'ai', model });
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Error desconocido';
    }
  }

  return NextResponse.json({ ok: true, analysis: base, source: 'fallback', warning: `La IA no respondió: ${lastError}` });
}

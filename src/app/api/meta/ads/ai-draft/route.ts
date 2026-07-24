import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { getOpenRouterCredentials } from '@/lib/openrouter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MODELS = [
  process.env.OPENROUTER_MODEL,
  'google/gemini-2.0-flash-001',
  'openai/gpt-4o-mini',
  'qwen/qwen-2.5-72b-instruct',
].filter(Boolean) as string[];

type RequestBody = {
  product?: string;
  audience?: string;
  objective?: string;
  offer?: string;
  location?: string;
  destinationUrl?: string;
  tone?: string;
  price?: string;
  differentiators?: string;
};

type AdVariant = {
  name: string;
  angle: string;
  primaryText: string;
  headline: string;
  description: string;
  callToAction: string;
  hook: string;
  proof: string;
  urgency: string;
  audienceInsight: string;
  visualDirection: string;
  keywords: string[];
  hashtags: string[];
  persuasionFramework: string;
  salesProbability: number;
  scoreBreakdown: {
    clarity: number;
    relevance: number;
    trust: number;
    offerStrength: number;
    urgency: number;
    visualFit: number;
  };
};

type AiResponse = {
  variants?: Array<Partial<AdVariant>>;
  campaignSummary?: string;
  recommendedAudience?: string;
  recommendedPlacement?: string;
  risks?: string[];
  tests?: string[];
};

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return decodeSession(cookie);
}

function clampScore(value: unknown, fallback = 70) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(95, Math.max(25, Math.round(parsed))) : fallback;
}

function cleanList(value: unknown, fallback: string[], limit = 12) {
  const source = Array.isArray(value) ? value : fallback;
  return Array.from(new Set(source.map((item) => String(item).replace(/^#/, '').trim()).filter(Boolean))).slice(0, limit);
}

function cleanJson<T>(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return JSON.parse(fenced || (start >= 0 && end > start ? text.slice(start, end + 1) : text)) as Partial<T>;
}

function fallbackVariant(body: RequestBody, index: number): AdVariant {
  const product = body.product?.trim() || 'tu proyecto';
  const audience = body.audience?.trim() || 'personas que quieren construir o remodelar';
  const offer = body.offer?.trim() || 'evaluación inicial y orientación personalizada';
  const isSecond = index === 1;
  return {
    name: isSecond ? 'Confianza y claridad' : 'Problema y solución',
    angle: isSecond ? 'Reducir el riesgo de una mala decisión' : 'Transformar una necesidad concreta en una solución clara',
    primaryText: isSecond
      ? `Construir o remodelar no debería comenzar con dudas. En Soluciones Fabrick te ayudamos a ordenar ${product}, revisar alternativas y avanzar con un rango inicial más claro. ${offer}.`
      : `¿Necesitas resolver ${product} sin improvisar? Reunimos planificación, cálculo inicial y acompañamiento para que puedas comparar opciones y tomar una decisión con más seguridad. ${offer}.`,
    headline: isSecond ? `Planifica ${product} con más claridad` : `Convierte tu idea en un plan concreto`,
    description: `Orientación para ${audience}. Solicita una revisión por WhatsApp.`,
    callToAction: 'Más información',
    hook: isSecond ? 'Evita comenzar sin alcance ni rango de inversión.' : 'Tu proyecto necesita claridad antes de comenzar.',
    proof: 'Calculadoras referenciales, servicios especializados y revisión humana.',
    urgency: 'Agenda una revisión inicial y organiza el siguiente paso.',
    audienceInsight: audience,
    visualDirection: 'Imagen limpia del resultado final, texto corto y un punto focal evidente.',
    keywords: ['construcción chile', 'remodelación', 'cotización', 'soluciones fabrick', product],
    hashtags: ['SolucionesFabrick', 'ConstruccionChile', 'Remodelacion', 'Cotizacion'],
    persuasionFramework: isSecond ? 'PAS + reducción de riesgo' : 'AIDA + problema/solución',
    salesProbability: isSecond ? 72 : 68,
    scoreBreakdown: { clarity: 82, relevance: 76, trust: 74, offerStrength: 68, urgency: 58, visualFit: 75 },
  };
}

function normalizeVariant(value: Partial<AdVariant>, fallback: AdVariant): AdVariant {
  const score = value.scoreBreakdown || fallback.scoreBreakdown;
  return {
    name: String(value.name || fallback.name).trim().slice(0, 70),
    angle: String(value.angle || fallback.angle).trim().slice(0, 180),
    primaryText: String(value.primaryText || fallback.primaryText).trim().slice(0, 800),
    headline: String(value.headline || fallback.headline).trim().slice(0, 80),
    description: String(value.description || fallback.description).trim().slice(0, 180),
    callToAction: String(value.callToAction || fallback.callToAction).trim().slice(0, 40),
    hook: String(value.hook || fallback.hook).trim().slice(0, 180),
    proof: String(value.proof || fallback.proof).trim().slice(0, 220),
    urgency: String(value.urgency || fallback.urgency).trim().slice(0, 180),
    audienceInsight: String(value.audienceInsight || fallback.audienceInsight).trim().slice(0, 240),
    visualDirection: String(value.visualDirection || fallback.visualDirection).trim().slice(0, 280),
    keywords: cleanList(value.keywords, fallback.keywords, 12),
    hashtags: cleanList(value.hashtags, fallback.hashtags, 10),
    persuasionFramework: String(value.persuasionFramework || fallback.persuasionFramework).trim().slice(0, 100),
    salesProbability: clampScore(value.salesProbability, fallback.salesProbability),
    scoreBreakdown: {
      clarity: clampScore(score.clarity, fallback.scoreBreakdown.clarity),
      relevance: clampScore(score.relevance, fallback.scoreBreakdown.relevance),
      trust: clampScore(score.trust, fallback.scoreBreakdown.trust),
      offerStrength: clampScore(score.offerStrength, fallback.scoreBreakdown.offerStrength),
      urgency: clampScore(score.urgency, fallback.scoreBreakdown.urgency),
      visualFit: clampScore(score.visualFit, fallback.scoreBreakdown.visualFit),
    },
  };
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as RequestBody;
  if (!body.product?.trim()) return NextResponse.json({ error: 'Describe el producto o servicio que quieres anunciar.' }, { status: 400 });

  const fallback = [fallbackVariant(body, 0), fallbackVariant(body, 1)];
  const credentials = await getOpenRouterCredentials();
  if (!credentials) return NextResponse.json({
    ok: true,
    variants: fallback,
    campaignSummary: 'Dos enfoques editables para presentar la oferta con claridad y reducir fricción antes del contacto.',
    recommendedAudience: body.audience || 'Personas con intención de construir, remodelar o mejorar su hogar.',
    recommendedPlacement: 'Feed de Facebook e Instagram para explicación; Stories y Reels para el gancho visual.',
    risks: ['Oferta poco específica', 'Falta de prueba visual', 'Segmentación demasiado amplia'],
    tests: ['Probar problema/solución contra confianza', 'Comparar CTA WhatsApp contra Más información'],
    source: 'fallback',
    warning: 'OpenRouter no está configurado. Se generaron propuestas locales editables.',
  });

  const prompt = `Actúa como estratega senior de Meta Ads, copywriter de respuesta directa y analista de conversión para una empresa chilena de construcción, remodelación y hogar.
Genera exactamente DOS variantes distintas y devuelve SOLO JSON válido:
{"variants":[{"name":"...","angle":"...","primaryText":"...","headline":"...","description":"...","callToAction":"...","hook":"...","proof":"...","urgency":"...","audienceInsight":"...","visualDirection":"...","keywords":["..."],"hashtags":["..."],"persuasionFramework":"...","salesProbability":70,"scoreBreakdown":{"clarity":80,"relevance":80,"trust":80,"offerStrength":80,"urgency":80,"visualFit":80}}],"campaignSummary":"...","recommendedAudience":"...","recommendedPlacement":"...","risks":["..."],"tests":["..."]}
Contexto:
- Producto o servicio: ${body.product}
- Público: ${body.audience || 'sin definir'}
- Objetivo: ${body.objective || 'generar conversaciones y ventas'}
- Oferta: ${body.offer || 'sin definir'}
- Ubicación: ${body.location || 'Chile'}
- Precio o rango: ${body.price || 'no definido'}
- Diferenciadores: ${body.differentiators || 'sin definir'}
- Tono: ${body.tone || 'profesional, cercano y confiable'}
- URL: ${body.destinationUrl || 'sin definir'}
Reglas:
- Variante 1 debe usar problema-agitación-solución o AIDA.
- Variante 2 debe enfocarse en confianza, prueba, claridad y reducción de riesgo.
- No uses promesas falsas, escasez inventada, cifras no verificadas ni miedo exagerado.
- El texto debe persuadir sin sonar genérico ni agresivo.
- Titular máximo 40 caracteres idealmente; descripción máximo 125 caracteres idealmente.
- Incluye un CTA compatible con Meta.
- salesProbability es una estimación editorial de 25 a 95 basada en claridad, relevancia, confianza, oferta, urgencia y ajuste visual. No representa una conversión garantizada ni datos reales de Meta.
- Devuelve riesgos y pruebas A/B concretas.`;

  let lastError = '';
  for (const model of MODELS) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': credentials.appName,
          ...(credentials.siteUrl ? { 'HTTP-Referer': credentials.siteUrl } : {}),
        },
        body: JSON.stringify({ model, temperature: 0.55, max_tokens: 2100, messages: [{ role: 'user', content: prompt }] }),
        cache: 'no-store',
      });
      const json = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
      if (!response.ok) { lastError = json.error?.message || `HTTP ${response.status}`; continue; }
      const text = json.choices?.[0]?.message?.content || '';
      const parsed = cleanJson<AiResponse>(text);
      const variants = [0, 1].map((index) => normalizeVariant(parsed.variants?.[index] || {}, fallback[index]));
      return NextResponse.json({
        ok: true,
        variants,
        campaignSummary: String(parsed.campaignSummary || '').trim(),
        recommendedAudience: String(parsed.recommendedAudience || body.audience || '').trim(),
        recommendedPlacement: String(parsed.recommendedPlacement || '').trim(),
        risks: cleanList(parsed.risks, [], 8),
        tests: cleanList(parsed.tests, [], 8),
        source: 'ai',
        model,
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Error desconocido';
    }
  }

  return NextResponse.json({
    ok: true,
    variants: fallback,
    campaignSummary: 'Propuestas locales editables para preparar el anuncio antes de publicarlo.',
    recommendedAudience: body.audience || '',
    recommendedPlacement: 'Feed, Stories y Reels según el formato creativo disponible.',
    risks: ['Revisar oferta y prueba visual'],
    tests: ['Comparar ambos enfoques'],
    source: 'fallback',
    warning: `La IA no respondió. Se utilizaron propuestas locales: ${lastError}`,
  });
}

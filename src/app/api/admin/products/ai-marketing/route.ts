import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { getOpenRouterCredentials } from '@/lib/openrouter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MODELS = [
  process.env.OPENROUTER_VISION_MODEL,
  'google/gemini-2.0-flash-001',
  'openai/gpt-4o-mini',
  'qwen/qwen2.5-vl-32b-instruct:free',
].filter(Boolean) as string[];

type ProductInput = {
  id?: string;
  name?: string;
  description?: string;
  tagline?: string;
  category?: string;
  price?: number | string;
  stock?: number | string;
  specifications?: Record<string, unknown>;
};

type RequestBody = {
  product?: ProductInput;
  imageUrls?: string[];
  goal?: string;
  location?: string;
};

type ProductOption = {
  name: string;
  tagline: string;
  shortDescription: string;
  longDescription: string;
  niche: string;
  targetAudience: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  longTailKeywords: string[];
  commercialKeywords: string[];
  hashtags: string[];
  seoTitle: string;
  seoDescription: string;
  slug: string;
  imageAltTexts: string[];
  imageCaptions: string[];
  adPrimaryText: string;
  adHeadline: string;
  adDescription: string;
  callToAction: string;
  visualPrompts: string[];
  searchPotential: number;
  salesPotential: number;
  keywordRationale: string;
};

type AiResponse = { options?: Array<Partial<ProductOption>>; imageObservations?: string[]; warnings?: string[] };

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return cookie ? decodeSession(cookie) : null;
}

function slugify(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90) || 'producto-soluciones-fabrick';
}

function list(value: unknown, fallback: string[], limit = 14) {
  const source = Array.isArray(value) ? value : fallback;
  return Array.from(new Set(source.map((item) => String(item).replace(/^#/, '').trim().toLowerCase()).filter(Boolean))).slice(0, limit);
}

function score(value: unknown, fallback = 65) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(95, Math.max(20, Math.round(number))) : fallback;
}

function cleanJson<T>(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return JSON.parse(fenced || (start >= 0 && end > start ? text.slice(start, end + 1) : text)) as Partial<T>;
}

function fallbackOption(product: ProductInput, index: number, imageCount: number): ProductOption {
  const original = product.name?.trim() || 'Producto para el hogar';
  const category = product.category?.trim() || 'hogar y construcción';
  const modern = index === 1;
  const name = modern ? `${original} para proyectos modernos` : original;
  const keyword = `${original.toLowerCase()} chile`;
  return {
    name,
    tagline: modern ? 'Diseño funcional para renovar tu espacio' : 'Una solución práctica para completar tu proyecto',
    shortDescription: `${original} pensado para proyectos de ${category.toLowerCase()}, con información clara para comparar y comprar con mayor seguridad.`,
    longDescription: `${original} es una alternativa para personas que buscan completar proyectos de ${category.toLowerCase()} en Chile. La ficha reúne su uso principal, beneficios visibles y datos comerciales para facilitar la comparación. Revisa medidas, compatibilidad, disponibilidad e instalación antes de comprar. Soluciones Fabrick puede orientar la selección cuando el producto forma parte de una remodelación o trabajo mayor.`,
    niche: category,
    targetAudience: `Personas en Chile interesadas en ${category.toLowerCase()}, remodelación y mejoramiento del hogar`,
    primaryKeyword: keyword,
    secondaryKeywords: [original.toLowerCase(), category.toLowerCase(), 'productos para el hogar', 'remodelación chile'],
    longTailKeywords: [`comprar ${original.toLowerCase()} en chile`, `${original.toLowerCase()} para remodelación`, `${original.toLowerCase()} precio y características`],
    commercialKeywords: [`comprar ${original.toLowerCase()}`, `${original.toLowerCase()} precio`, `${original.toLowerCase()} despacho`],
    hashtags: ['solucionesfabrick', slugify(original), 'hogarchile', 'remodelacionchile', 'construccionchile'],
    seoTitle: `${name} | Precio y detalles en Chile`,
    seoDescription: `Conoce ${original.toLowerCase()}, revisa características, imágenes y disponibilidad para tu proyecto. Compra y solicita orientación con Soluciones Fabrick.`,
    slug: slugify(name),
    imageAltTexts: Array.from({ length: Math.max(1, imageCount) }, (_, imageIndex) => `${original}, vista ${imageIndex + 1} del producto para proyectos en Chile`),
    imageCaptions: Array.from({ length: Math.max(1, imageCount) }, (_, imageIndex) => `${original}: detalle visual ${imageIndex + 1}`),
    adPrimaryText: `¿Buscas ${original.toLowerCase()} para completar tu proyecto? Revisa sus características, imágenes y disponibilidad antes de comprar. Soluciones Fabrick te ayuda a elegir con mayor claridad.`,
    adHeadline: modern ? `Renueva tu espacio con ${original}` : `${original} para tu proyecto`,
    adDescription: 'Consulta disponibilidad, despacho y compatibilidad antes de comprar.',
    callToAction: 'Ver producto',
    visualPrompts: [`Fotografía comercial limpia de ${original}, fondo perla, luz natural, vista frontal y detalles visibles`, `Escena de uso realista de ${original} en un proyecto de ${category.toLowerCase()}, estilo editorial profesional`],
    searchPotential: modern ? 72 : 66,
    salesPotential: modern ? 70 : 68,
    keywordRationale: 'La jerarquía combina una palabra principal transaccional, términos de categoría y búsquedas largas relacionadas con precio, características y uso.',
  };
}

function normalize(value: Partial<ProductOption>, fallback: ProductOption, imageCount: number): ProductOption {
  const name = String(value.name || fallback.name).trim().slice(0, 120);
  return {
    name,
    tagline: String(value.tagline || fallback.tagline).trim().slice(0, 160),
    shortDescription: String(value.shortDescription || fallback.shortDescription).trim().slice(0, 360),
    longDescription: String(value.longDescription || fallback.longDescription).trim().slice(0, 1800),
    niche: String(value.niche || fallback.niche).trim().slice(0, 100),
    targetAudience: String(value.targetAudience || fallback.targetAudience).trim().slice(0, 260),
    primaryKeyword: String(value.primaryKeyword || fallback.primaryKeyword).trim().toLowerCase().slice(0, 100),
    secondaryKeywords: list(value.secondaryKeywords, fallback.secondaryKeywords, 12),
    longTailKeywords: list(value.longTailKeywords, fallback.longTailKeywords, 10),
    commercialKeywords: list(value.commercialKeywords, fallback.commercialKeywords, 10),
    hashtags: list(value.hashtags, fallback.hashtags, 14),
    seoTitle: String(value.seoTitle || fallback.seoTitle).trim().slice(0, 68),
    seoDescription: String(value.seoDescription || fallback.seoDescription).trim().slice(0, 165),
    slug: slugify(value.slug || name),
    imageAltTexts: Array.from({ length: Math.max(1, imageCount) }, (_, index) => String(value.imageAltTexts?.[index] || fallback.imageAltTexts[index] || `${name}, vista ${index + 1}`).trim().slice(0, 180)),
    imageCaptions: Array.from({ length: Math.max(1, imageCount) }, (_, index) => String(value.imageCaptions?.[index] || fallback.imageCaptions[index] || `${name}: detalle ${index + 1}`).trim().slice(0, 180)),
    adPrimaryText: String(value.adPrimaryText || fallback.adPrimaryText).trim().slice(0, 800),
    adHeadline: String(value.adHeadline || fallback.adHeadline).trim().slice(0, 80),
    adDescription: String(value.adDescription || fallback.adDescription).trim().slice(0, 180),
    callToAction: String(value.callToAction || fallback.callToAction).trim().slice(0, 40),
    visualPrompts: list(value.visualPrompts, fallback.visualPrompts, 6),
    searchPotential: score(value.searchPotential, fallback.searchPotential),
    salesPotential: score(value.salesPotential, fallback.salesPotential),
    keywordRationale: String(value.keywordRationale || fallback.keywordRationale).trim().slice(0, 480),
  };
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as RequestBody;
  const product = body.product || {};
  if (!product.name?.trim()) return NextResponse.json({ error: 'Selecciona o describe un producto.' }, { status: 400 });

  const imageUrls = Array.from(new Set((body.imageUrls || []).map((url) => String(url).trim()).filter((url) => /^https:\/\//i.test(url)))).slice(0, 8);
  const fallbacks = [fallbackOption(product, 0, imageUrls.length), fallbackOption(product, 1, imageUrls.length)];
  const credentials = await getOpenRouterCredentials();
  if (!credentials) return NextResponse.json({ ok: true, options: fallbacks, imageObservations: [], warnings: ['OpenRouter no está configurado. Se generaron dos propuestas locales editables.'], source: 'fallback' });

  const prompt = `Actúa como estratega de ecommerce, SEO técnico, copywriter de respuesta directa y analista visual para una tienda chilena de hogar y construcción.
Analiza el producto y las imágenes visibles. Devuelve SOLO JSON válido con exactamente dos opciones:
{"options":[{"name":"...","tagline":"...","shortDescription":"...","longDescription":"...","niche":"...","targetAudience":"...","primaryKeyword":"...","secondaryKeywords":["..."],"longTailKeywords":["..."],"commercialKeywords":["..."],"hashtags":["..."],"seoTitle":"...","seoDescription":"...","slug":"...","imageAltTexts":["..."],"imageCaptions":["..."],"adPrimaryText":"...","adHeadline":"...","adDescription":"...","callToAction":"...","visualPrompts":["..."],"searchPotential":70,"salesPotential":70,"keywordRationale":"..."}],"imageObservations":["..."],"warnings":["..."]}
Contexto del producto:
- Nombre actual: ${product.name}
- Descripción actual: ${product.description || 'sin descripción'}
- Frase actual: ${product.tagline || 'sin frase'}
- Categoría/nicho: ${product.category || 'sin categoría'}
- Precio: ${product.price || 'no indicado'}
- Stock: ${product.stock || 'no indicado'}
- Objetivo: ${body.goal || 'mejorar ficha, SEO y promoción'}
- Mercado: ${body.location || 'Chile'}
Reglas:
- Opción 1 debe preservar el nombre y mejorar precisión, confianza y búsqueda transaccional.
- Opción 2 puede reescribir el nombre con enfoque comercial, sin cambiar la identidad real del producto.
- Organiza palabras clave por prioridad: primaria, secundarias, long-tail y comerciales.
- Usa lenguaje natural. No repitas la misma frase para forzar SEO.
- Describe solo características visibles o entregadas. No inventes medidas, material, potencia, certificaciones, garantía, stock, origen ni beneficios técnicos.
- SEO title ideal 50-60 caracteres; meta description 135-160 caracteres.
- Genera un alt y caption distinto por cada una de las ${imageUrls.length || 1} imágenes.
- Los hashtags deben ser específicos del nicho y útiles en redes, sin spam.
- visualPrompts debe proponer de 2 a 4 nuevas fotografías comerciales que podrían producirse después; no afirmes que ya existen.
- searchPotential y salesPotential son estimaciones editoriales de 20 a 95, no datos reales de Google ni conversiones garantizadas.
- El copy publicitario debe persuadir con claridad, prueba verificable y reducción de fricción, sin escasez falsa ni promesas engañosas.`;

  let lastError = '';
  for (const model of MODELS) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${credentials.apiKey}`, 'Content-Type': 'application/json', 'X-Title': credentials.appName, ...(credentials.siteUrl ? { 'HTTP-Referer': credentials.siteUrl } : {}) },
        body: JSON.stringify({ model, temperature: 0.42, max_tokens: 3200, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, ...imageUrls.map((url) => ({ type: 'image_url', image_url: { url } }))] }] }),
        cache: 'no-store',
      });
      const json = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
      if (!response.ok) { lastError = json.error?.message || `HTTP ${response.status}`; continue; }
      const text = json.choices?.[0]?.message?.content || '';
      const parsed = cleanJson<AiResponse>(text);
      const options = [0, 1].map((index) => normalize(parsed.options?.[index] || {}, fallbacks[index], imageUrls.length));
      return NextResponse.json({ ok: true, options, imageObservations: list(parsed.imageObservations, [], 12), warnings: list(parsed.warnings, [], 8), source: 'ai', model });
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Error desconocido';
    }
  }

  return NextResponse.json({ ok: true, options: fallbacks, imageObservations: [], warnings: [`La IA visual no respondió. Se generaron propuestas locales: ${lastError}`], source: 'fallback' });
}

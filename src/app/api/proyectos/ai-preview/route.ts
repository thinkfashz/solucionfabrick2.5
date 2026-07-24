import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { getOpenRouterCredentials } from '@/lib/openrouter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MODELS = [
  process.env.OPENROUTER_VISION_MODEL,
  'qwen/qwen2.5-vl-32b-instruct:free',
  'google/gemini-2.0-flash-001',
  'openai/gpt-4o-mini',
].filter(Boolean) as string[];

const CATEGORY_VALUES = ['cocinas', 'casas', 'planos', 'banos', 'muebles', 'piscinas', 'quinchos', 'terrazas', 'materiales', 'remodelacion', 'ideas'];

type Body = {
  imageDataUrls?: string[];
  fileNames?: string[];
  albumTitle?: string;
  category?: string;
};

type AlbumOption = {
  albumTitle: string;
  albumDescription: string;
  category: string;
  hashtags: string[];
  primaryKeyword: string;
  secondaryKeywords: string[];
  seoTitle: string;
  seoDescription: string;
  imageSearchCaption: string;
  interestScore: number;
  interestLabel: string;
  organizationSummary: string;
  suggestedOrder: number[];
  coverIndex: number;
};

type ImageSuggestion = {
  index: number;
  title: string;
  description: string;
  alt: string;
  hashtags: string[];
  keywords: string[];
  interestScore: number;
  interestLabel: string;
};

type AiResponse = {
  options?: Array<Partial<AlbumOption>>;
  images?: Array<Partial<ImageSuggestion>>;
};

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return decodeSession(cookie);
}

function slug(value: unknown, fallback = 'ideas') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || fallback;
}

function cleanCategory(value: unknown, fallback = 'ideas') {
  const next = slug(value, fallback);
  return CATEGORY_VALUES.includes(next) ? next : fallback;
}

function cleanTags(value: unknown, fallback: string[], limit = 16) {
  const source = Array.isArray(value) ? value : fallback;
  return Array.from(new Set(source.map((item) => slug(String(item).replace(/^#/, ''), '')).filter(Boolean))).slice(0, limit);
}

function cleanKeywords(value: unknown, fallback: string[], limit = 12) {
  const source = Array.isArray(value) ? value : fallback;
  return Array.from(new Set(source.map((item) => String(item).trim().toLowerCase()).filter(Boolean))).slice(0, limit);
}

function cleanScore(value: unknown, fallback = 3) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(5, Math.max(1, Math.round(parsed))) : fallback;
}

function cleanOrder(value: unknown, count: number) {
  const source = Array.isArray(value) ? value : [];
  const order = Array.from(new Set(source.map(Number).filter((item) => Number.isInteger(item) && item >= 1 && item <= count)));
  for (let index = 1; index <= count; index += 1) if (!order.includes(index)) order.push(index);
  return order.slice(0, count);
}

function titleFromName(name: string, index: number) {
  const clean = name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  return (clean || `Referencia ${index + 1}`).replace(/\b\w/g, (character) => character.toUpperCase()).slice(0, 120);
}

function fallbackOptions(body: Body, count: number): AlbumOption[] {
  const category = cleanCategory(body.category);
  const title = String(body.albumTitle || titleFromName(body.fileNames?.[0] || '', 0) || 'Inspiraciones Fabrick').trim();
  const order = Array.from({ length: count }, (_, index) => index + 1);
  return [
    {
      albumTitle: title,
      albumDescription: `Colección visual organizada para comparar distribución, estilo, colores, materiales visibles y terminaciones. Las imágenes se presentan como referencias para definir una solución adaptada a las medidas y condiciones reales del espacio antes de solicitar una propuesta.`,
      category,
      hashtags: ['inspiracion', 'solucionesfabrick', category, 'diseno-interior', 'construccion-chile', 'remodelacion'],
      primaryKeyword: `${category.replace(/-/g, ' ')} modernas`,
      secondaryKeywords: [`ideas de ${category}`, `${category} para casas`, 'diseño interior chile', 'remodelación del hogar', 'inspiración para construir'],
      seoTitle: `${title} | Ideas para el hogar`,
      seoDescription: `Explora ${title.toLowerCase()}, compara estilos y terminaciones, y encuentra una referencia para planificar tu proyecto con Soluciones Fabrick.`,
      imageSearchCaption: `${title}: referencias visuales organizadas para construcción, diseño y remodelación de viviendas en Chile.`,
      interestScore: 3,
      interestLabel: 'Medio',
      organizationSummary: 'Orden desde la imagen más general hacia vistas complementarias y detalles.',
      suggestedOrder: order,
      coverIndex: 1,
    },
    {
      albumTitle: `${title}: ideas y tendencias`,
      albumDescription: `Selección de imágenes relacionadas con enfoque inspiracional y comercial. El álbum reúne vistas completas y detalles visuales para descubrir combinaciones, organización del espacio y acabados que pueden reinterpretarse en una construcción, remodelación o proyecto de equipamiento residencial.`,
      category,
      hashtags: [category, 'ideas-hogar', 'tendencias-diseno', 'inspiracion-chile', 'solucionesfabrick', 'remodelacion-chile'],
      primaryKeyword: `ideas de ${category.replace(/-/g, ' ')}`,
      secondaryKeywords: [`tendencias de ${category}`, `${category} en chile`, 'diseño para viviendas', 'ideas para remodelar', 'referencias de arquitectura'],
      seoTitle: `Ideas de ${category.replace(/-/g, ' ')} | Fabrick`,
      seoDescription: `Descubre ideas, estilos y terminaciones para inspirar tu próxima construcción o remodelación residencial en Chile.`,
      imageSearchCaption: `Ideas y tendencias visuales para construcción, diseño interior y remodelación de viviendas en Chile.`,
      interestScore: 4,
      interestLabel: 'Alto',
      organizationSummary: 'Orden por impacto visual: portada atractiva, vistas completas y detalles diferenciadores.',
      suggestedOrder: order,
      coverIndex: 1,
    },
  ];
}

function fallbackImages(body: Body, count: number): ImageSuggestion[] {
  const category = cleanCategory(body.category);
  return Array.from({ length: count }, (_, index) => ({
    index: index + 1,
    title: titleFromName(body.fileNames?.[index] || '', index),
    description: 'Referencia visual para identificar distribución, estilo, elementos visibles y terminaciones antes de adaptar la idea a un proyecto real.',
    alt: `${titleFromName(body.fileNames?.[index] || '', index)} como referencia de ${category.replace(/-/g, ' ')} en Chile`,
    hashtags: ['inspiracion', category, 'solucionesfabrick', 'diseno', 'remodelacion'],
    keywords: [`ideas de ${category}`, 'diseño interior chile', 'referencia visual'],
    interestScore: 3,
    interestLabel: 'Medio',
  }));
}

function cleanJson<T>(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return JSON.parse(fenced || (start >= 0 && end > start ? text.slice(start, end + 1) : text)) as Partial<T>;
}

function normalizeOption(value: Partial<AlbumOption>, fallback: AlbumOption, count: number): AlbumOption {
  const score = cleanScore(value.interestScore, fallback.interestScore);
  return {
    albumTitle: String(value.albumTitle || fallback.albumTitle).trim().slice(0, 120),
    albumDescription: String(value.albumDescription || fallback.albumDescription).trim().slice(0, 900),
    category: cleanCategory(value.category, fallback.category),
    hashtags: cleanTags(value.hashtags, fallback.hashtags),
    primaryKeyword: String(value.primaryKeyword || fallback.primaryKeyword).trim().toLowerCase().slice(0, 100),
    secondaryKeywords: cleanKeywords(value.secondaryKeywords, fallback.secondaryKeywords),
    seoTitle: String(value.seoTitle || fallback.seoTitle).trim().slice(0, 70),
    seoDescription: String(value.seoDescription || fallback.seoDescription).trim().slice(0, 180),
    imageSearchCaption: String(value.imageSearchCaption || fallback.imageSearchCaption).trim().slice(0, 240),
    interestScore: score,
    interestLabel: String(value.interestLabel || (score >= 5 ? 'Muy alto' : score >= 4 ? 'Alto' : score >= 3 ? 'Medio' : 'Bajo')).trim().slice(0, 40),
    organizationSummary: String(value.organizationSummary || fallback.organizationSummary).trim().slice(0, 500),
    suggestedOrder: cleanOrder(value.suggestedOrder, count),
    coverIndex: Math.min(count, Math.max(1, Number(value.coverIndex || fallback.coverIndex || 1))),
  };
}

function normalizeImage(value: Partial<ImageSuggestion>, fallback: ImageSuggestion, index: number): ImageSuggestion {
  const score = cleanScore(value.interestScore, fallback.interestScore);
  return {
    index,
    title: String(value.title || fallback.title).trim().slice(0, 120),
    description: String(value.description || fallback.description).trim().slice(0, 900),
    alt: String(value.alt || value.title || fallback.alt).trim().slice(0, 180),
    hashtags: cleanTags(value.hashtags, fallback.hashtags, 12),
    keywords: cleanKeywords(value.keywords, fallback.keywords, 8),
    interestScore: score,
    interestLabel: String(value.interestLabel || (score >= 5 ? 'Muy alto' : score >= 4 ? 'Alto' : score >= 3 ? 'Medio' : 'Bajo')).trim().slice(0, 40),
  };
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as Body;
  const urls = (body.imageDataUrls || []).map((value) => String(value).trim()).filter((value) => /^data:image\/(jpeg|png|webp);base64,/i.test(value)).slice(0, 8);
  const count = Math.max(1, Math.min(8, body.fileNames?.length || urls.length || 1));
  const optionFallbacks = fallbackOptions(body, count);
  const imageFallbacks = fallbackImages(body, count);

  const fallbackResponse = (warning: string) => NextResponse.json({
    ok: true,
    albumOptions: optionFallbacks,
    images: imageFallbacks,
    source: 'fallback',
    warning,
  });

  if (!urls.length) return fallbackResponse('No se recibieron imágenes locales válidas. Se generó una propuesta editable.');

  const credentials = await getOpenRouterCredentials();
  if (!credentials) return fallbackResponse('OpenRouter no está configurado. Se generaron propuestas locales editables.');

  const prompt = `Analiza estas ${count} imágenes como UN SOLO ÁLBUM antes de publicarlo en una vitrina chilena de construcción, remodelación y diseño interior.
Devuelve SOLO JSON válido con esta estructura:
{"options":[{"albumTitle":"...","albumDescription":"...","category":"cocinas|casas|planos|banos|muebles|piscinas|quinchos|terrazas|materiales|remodelacion|ideas","hashtags":["..."],"primaryKeyword":"...","secondaryKeywords":["..."],"seoTitle":"...","seoDescription":"...","imageSearchCaption":"...","interestScore":1,"interestLabel":"Bajo|Medio|Alto|Muy alto","organizationSummary":"...","suggestedOrder":[1,2],"coverIndex":1},{"albumTitle":"...","albumDescription":"...","category":"...","hashtags":["..."],"primaryKeyword":"...","secondaryKeywords":["..."],"seoTitle":"...","seoDescription":"...","imageSearchCaption":"...","interestScore":1,"interestLabel":"Bajo|Medio|Alto|Muy alto","organizationSummary":"...","suggestedOrder":[1,2],"coverIndex":1}],"images":[{"index":1,"title":"...","description":"...","alt":"...","hashtags":["..."],"keywords":["..."],"interestScore":1,"interestLabel":"Bajo|Medio|Alto|Muy alto"}]}
Reglas:
- Genera exactamente DOS opciones distintas para el álbum.
- Trata todas las imágenes como un único álbum; nunca crees varios álbumes.
- Elige una portada y un orden narrativo usando índices del 1 al ${count}.
- Devuelve exactamente ${count} objetos en images, uno por archivo, manteniendo su índice.
- Diferencia claramente la popularidad estimada del álbum y la de cada imagen.
- interestScore es una estimación editorial de 1 a 5; no inventes volumen real de Google.
- Títulos naturales y buscables; descripciones útiles sin repetir palabras artificialmente.
- Alt debe ser literal, accesible y describir solo lo visible.
- No afirmes que Soluciones Fabrick ejecutó estas obras.
- No inventes medidas, marcas, materiales ocultos ni certificaciones.
- Título sugerido: ${body.albumTitle || 'sin definir'}.
- Categoría sugerida: ${body.category || 'ideas'}.
- Archivos: ${(body.fileNames || []).map((name, index) => `${index + 1}. ${name}`).join(' | ') || 'sin nombres'}.`;

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
        body: JSON.stringify({
          model,
          temperature: 0.34,
          max_tokens: 2600,
          messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, ...urls.map((url) => ({ type: 'image_url', image_url: { url } }))] }],
        }),
        cache: 'no-store',
      });
      const json = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
      if (!response.ok) {
        lastError = json.error?.message || `HTTP ${response.status}`;
        continue;
      }
      const text = json.choices?.[0]?.message?.content || '';
      if (!text) {
        lastError = 'El modelo no devolvió contenido.';
        continue;
      }
      const parsed = cleanJson<AiResponse>(text);
      const rawOptions = Array.isArray(parsed.options) ? parsed.options.slice(0, 2) : [];
      const rawImages = Array.isArray(parsed.images) ? parsed.images : [];
      const albumOptions = [0, 1].map((index) => normalizeOption(rawOptions[index] || {}, optionFallbacks[index], count));
      const images = imageFallbacks.map((fallback, index) => normalizeImage(rawImages.find((item) => Number(item.index) === index + 1) || rawImages[index] || {}, fallback, index + 1));
      return NextResponse.json({ ok: true, albumOptions, images, source: 'ai', model });
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Error desconocido';
    }
  }

  return fallbackResponse(`La IA visual no respondió. Se generó contenido editable: ${lastError}`);
}

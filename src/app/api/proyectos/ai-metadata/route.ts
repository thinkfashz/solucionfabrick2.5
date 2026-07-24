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

const CATEGORIES = 'cocinas|casas|planos|banos|muebles|piscinas|quinchos|terrazas|materiales|remodelacion|ideas';

type Body = {
  imageUrl?: string;
  imageUrls?: string[];
  albumTitle?: string;
  category?: string;
  locale?: string;
  mode?: 'asset' | 'album';
  fileNames?: string[];
};

type Metadata = {
  title: string;
  description: string;
  alt: string;
  category: string;
  hashtags: string[];
};

export type AlbumSeoOption = {
  albumTitle: string;
  albumDescription: string;
  category: string;
  keywords: string[];
  hashtags: string[];
  slug: string;
  seoTitle: string;
  seoDescription: string;
  imageAltTemplate: string;
  searchInterest: number;
  searchIntent: string;
};

type AlbumResponse = { options: AlbumSeoOption[] };

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return decodeSession(cookie);
}

function slugify(value: unknown, fallback = 'inspiraciones-fabrick') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || fallback;
}

function titleFromFiles(fileNames: string[] | undefined) {
  const first = String(fileNames?.[0] || '').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  return first ? first.replace(/\b\w/g, (character) => character.toUpperCase()).slice(0, 120) : 'Inspiraciones Fabrick';
}

function cleanCategory(value: unknown, fallback = 'ideas') {
  const category = slugify(value, fallback);
  return CATEGORIES.split('|').includes(category) ? category : fallback;
}

function cleanList(value: unknown, fallback: string[], limit = 16) {
  const values = Array.isArray(value) ? value : fallback;
  return Array.from(new Set(values.map((item) => String(item).replace(/^#/, '').trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean))).slice(0, limit);
}

function cleanJson<T>(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const firstObject = text.indexOf('{');
  const lastObject = text.lastIndexOf('}');
  const candidate = fenced || (firstObject >= 0 && lastObject > firstObject ? text.slice(firstObject, lastObject + 1) : text);
  return JSON.parse(candidate) as Partial<T>;
}

function fallbackMetadata(body: Body): Metadata {
  const album = String(body.albumTitle || titleFromFiles(body.fileNames)).trim();
  const category = cleanCategory(body.category);
  return {
    title: album || 'Inspiración para tu proyecto',
    description: 'Referencia visual para comparar distribución, estilo, materiales visibles, terminaciones y adaptación al espacio disponible.',
    alt: `${album || 'Inspiración'} para construcción, remodelación y diseño del hogar en Chile`,
    category,
    hashtags: ['inspiracion', 'solucionesfabrick', category, 'construccion-chile', 'remodelacion'].filter(Boolean),
  };
}

function fallbackAlbumOptions(body: Body): AlbumSeoOption[] {
  const seed = String(body.albumTitle || titleFromFiles(body.fileNames)).trim() || 'Inspiraciones para el hogar';
  const category = cleanCategory(body.category);
  const commonKeywords = [category, 'ideas para el hogar', 'diseño interior chile', 'remodelación chile', 'soluciones fabrick'];
  return [
    {
      albumTitle: seed,
      albumDescription: `Colección visual de ${seed.toLowerCase()} para comparar distribución, estilo, colores, materiales visibles y terminaciones antes de adaptar la idea a un espacio real. Estas referencias ayudan a definir una dirección estética y preparar una cotización informada en Chile.`,
      category,
      keywords: commonKeywords,
      hashtags: ['inspiracion', 'solucionesfabrick', category, 'diseno-interior', 'construccion-chile', 'remodelacion'],
      slug: slugify(seed),
      seoTitle: `${seed} | Ideas y referencias en Chile`,
      seoDescription: `Explora imágenes de ${seed.toLowerCase()}, compara estilos y terminaciones, y solicita una propuesta adaptada a tu espacio con Soluciones Fabrick.`,
      imageAltTemplate: `${seed}: referencia visual de {detalle_visible} para proyectos en Chile`,
      searchInterest: 3,
      searchIntent: 'Inspiración y comparación antes de cotizar',
    },
    {
      albumTitle: `${seed} modernas`,
      albumDescription: `Ideas seleccionadas de ${seed.toLowerCase()} con enfoque práctico y contemporáneo. El álbum reúne referencias visuales para descubrir combinaciones, organización del espacio y acabados visibles que pueden orientar una remodelación, construcción o proyecto de equipamiento.`,
      category,
      keywords: [...commonKeywords, `${category} modernas`, `${category} diseño`],
      hashtags: ['ideas-modernas', 'inspiracion-hogar', 'solucionesfabrick', category, 'arquitectura-chile', 'remodelacion-chile'],
      slug: slugify(`${seed} modernas`),
      seoTitle: `${seed} modernas: ideas para inspirar tu proyecto`,
      seoDescription: `Descubre referencias modernas de ${seed.toLowerCase()} y encuentra una dirección visual para remodelar, construir o equipar tu espacio.`,
      imageAltTemplate: `${seed} modernas con {detalle_visible}, idea para remodelación en Chile`,
      searchInterest: 4,
      searchIntent: 'Búsqueda visual con intención de diseño y remodelación',
    },
  ];
}

function normalizeMetadata(result: Partial<Metadata>, fallback: Metadata): Metadata {
  return {
    title: String(result.title || fallback.title).trim().slice(0, 120),
    description: String(result.description || fallback.description).trim().slice(0, 900),
    alt: String(result.alt || result.title || fallback.alt).trim().slice(0, 180),
    category: cleanCategory(result.category, fallback.category),
    hashtags: cleanList(result.hashtags, fallback.hashtags, 14),
  };
}

function normalizeOption(result: Partial<AlbumSeoOption>, fallback: AlbumSeoOption): AlbumSeoOption {
  const title = String(result.albumTitle || fallback.albumTitle).trim().slice(0, 120);
  const category = cleanCategory(result.category, fallback.category);
  const interest = Math.min(5, Math.max(1, Math.round(Number(result.searchInterest || fallback.searchInterest || 3))));
  const keywords = cleanList(result.keywords, fallback.keywords, 14);
  const hashtags = cleanList(result.hashtags, fallback.hashtags, 16);
  return {
    albumTitle: title,
    albumDescription: String(result.albumDescription || fallback.albumDescription).trim().slice(0, 1100),
    category,
    keywords,
    hashtags,
    slug: slugify(result.slug || title),
    seoTitle: String(result.seoTitle || fallback.seoTitle).trim().slice(0, 68),
    seoDescription: String(result.seoDescription || fallback.seoDescription).trim().slice(0, 165),
    imageAltTemplate: String(result.imageAltTemplate || fallback.imageAltTemplate).trim().slice(0, 190),
    searchInterest: interest,
    searchIntent: String(result.searchIntent || fallback.searchIntent).trim().slice(0, 160),
  };
}

function albumPrompt(body: Body) {
  return `Analiza el GRUPO de imágenes como especialista en arquitectura, construcción, diseño interior, SEO e imágenes para buscadores en Chile.
Devuelve SOLO JSON válido con esta estructura exacta:
{"options":[
 {"albumTitle":"...","albumDescription":"...","category":"${CATEGORIES}","keywords":["..."],"hashtags":["..."],"slug":"...","seoTitle":"...","seoDescription":"...","imageAltTemplate":"...","searchInterest":1,"searchIntent":"..."},
 {"albumTitle":"...","albumDescription":"...","category":"${CATEGORIES}","keywords":["..."],"hashtags":["..."],"slug":"...","seoTitle":"...","seoDescription":"...","imageAltTemplate":"...","searchInterest":1,"searchIntent":"..."}
]}
Reglas:
- Organiza las imágenes como una colección coherente según lo realmente visible.
- Genera DOS opciones claramente diferentes: A descriptiva/específica y B comercial/inspiracional.
- Cada título debe usar una frase que una persona sí buscaría y tener entre 4 y 10 palabras.
- Cada descripción debe tener entre 70 y 120 palabras, ser natural, útil y contener palabras clave sin repetirlas artificialmente.
- Incluye 8 a 14 keywords de intención visual, informativa y comercial relacionadas con Chile.
- Incluye 8 a 16 hashtags sin #, relevantes y sin spam.
- seoTitle máximo 60 caracteres idealmente; seoDescription entre 135 y 160 caracteres.
- imageAltTemplate debe ser literal y accesible, usando {detalle_visible} como variable.
- searchInterest es una ESTIMACIÓN editorial entre 1 y 5, no volumen real: 1 nicho, 3 interés medio, 5 idea ampliamente buscada.
- Indica la intención principal en searchIntent.
- Título sugerido: ${body.albumTitle || 'sin definir'}.
- Categoría sugerida: ${body.category || 'ideas'}.
- Archivos: ${(body.fileNames || []).slice(0, 16).join(', ') || 'sin nombres'}.
- No afirmes que las obras fueron ejecutadas por Soluciones Fabrick.
- No inventes medidas, marcas, materiales ocultos, certificaciones ni cifras de búsquedas.`;
}

function assetPrompt(body: Body) {
  return `Analiza esta imagen como curador SEO de un catálogo chileno de construcción, remodelación y diseño interior.
Devuelve SOLO JSON válido:
{"title":"...","description":"...","alt":"...","category":"${CATEGORIES}","hashtags":["..."]}
Reglas:
- Español natural y comercial, sin afirmar que la obra fue ejecutada por la empresa.
- Título de 4 a 10 palabras con el elemento visual principal.
- Descripción de 45 a 80 palabras con estilo y elementos realmente visibles.
- Alt literal, accesible y útil para búsqueda de imágenes; evita frases como “imagen de”.
- Entre 7 y 12 hashtags relacionados, sin # y sin spam.
- Álbum: ${body.albumTitle || 'sin definir'}.
- Categoría: ${body.category || 'ideas'}.
- No inventes información invisible.`;
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as Body;
  const mode = body.mode === 'album' ? 'album' : 'asset';
  const urls = Array.from(new Set([...(body.imageUrls || []), body.imageUrl || ''].map((value) => String(value).trim()).filter((value) => /^https:\/\//i.test(value)))).slice(0, mode === 'album' ? 8 : 1);
  const albumFallback = fallbackAlbumOptions(body);
  const assetFallback = fallbackMetadata(body);

  const fallbackResponse = (warning: string) => NextResponse.json({
    ok: true,
    ...(mode === 'album' ? { options: albumFallback, albumOptions: albumFallback, albumMetadata: albumFallback[0] } : { metadata: assetFallback }),
    source: 'fallback',
    warning,
  });

  if (!urls.length) return fallbackResponse('Las imágenes todavía no tienen una URL pública válida. Se generaron dos alternativas SEO editables.');

  const credentials = await getOpenRouterCredentials();
  if (!credentials) return fallbackResponse('OpenRouter no está configurado. Se generaron dos alternativas SEO locales y editables.');

  const prompt = mode === 'album' ? albumPrompt(body) : assetPrompt(body);
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
          temperature: mode === 'album' ? 0.42 : 0.2,
          max_tokens: mode === 'album' ? 1800 : 760,
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
      if (mode === 'album') {
        const parsed = cleanJson<AlbumResponse>(text);
        const rawOptions = Array.isArray(parsed.options) ? parsed.options : [];
        const options = [0, 1].map((index) => normalizeOption(rawOptions[index] || {}, albumFallback[index]));
        return NextResponse.json({ ok: true, options, albumOptions: options, albumMetadata: options[0], source: 'ai', model });
      }
      const metadata = normalizeMetadata(cleanJson<Metadata>(text), assetFallback);
      return NextResponse.json({ ok: true, metadata, source: 'ai', model });
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Error desconocido';
    }
  }

  return fallbackResponse(`La IA visual no respondió. Se generaron alternativas editables: ${lastError}`);
}

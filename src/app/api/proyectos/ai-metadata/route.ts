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

type Body = {
  imageUrl?: string;
  imageUrls?: string[];
  albumTitle?: string;
  albumDescription?: string;
  category?: string;
  locale?: string;
  mode?: 'asset' | 'album';
  fileNames?: string[];
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  hashtags?: string[];
};

type Metadata = {
  title: string;
  description: string;
  alt: string;
  category: string;
  hashtags: string[];
  keywords: string[];
};

export type AlbumMetadataOption = {
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

type AlbumResponse = { options?: Array<Partial<AlbumMetadataOption>> };

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return decodeSession(cookie);
}

function titleFromFiles(fileNames: string[] | undefined) {
  const first = String(fileNames?.[0] || '').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  return first ? first.replace(/\b\w/g, (character) => character.toUpperCase()).slice(0, 120) : 'Inspiraciones Fabrick';
}

function humanizeCategory(category: string) {
  return category.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function fallbackMetadata(body: Body): Metadata {
  const album = String(body.albumTitle || titleFromFiles(body.fileNames)).trim();
  const category = String(body.category || 'ideas').trim();
  const primaryKeyword = String(body.primaryKeyword || `${humanizeCategory(category)} para el hogar`).trim().toLowerCase();
  const keywords = cleanKeywords(body.secondaryKeywords, [primaryKeyword, 'ideas para el hogar', 'diseño y remodelación']);
  return {
    title: album || 'Inspiración para tu proyecto',
    description: `Referencia visual relacionada con ${primaryKeyword}, pensada para comparar distribución, estilo, materiales visibles y terminaciones antes de adaptar la idea a un espacio real.`,
    alt: `${primaryKeyword} como referencia visual para un proyecto de vivienda en Chile`,
    category,
    hashtags: cleanTags(body.hashtags, ['inspiracion', 'solucionesfabrick', category, 'construccion', 'remodelacion']),
    keywords,
  };
}

function fallbackAlbumOptions(body: Body, imageCount: number): AlbumMetadataOption[] {
  const category = cleanCategory(body.category, 'ideas');
  const suggested = String(body.albumTitle || titleFromFiles(body.fileNames)).trim() || 'Inspiraciones Fabrick';
  const categoryLabel = humanizeCategory(category);
  const order = Array.from({ length: Math.max(1, imageCount) }, (_, index) => index + 1);
  const common = {
    category,
    suggestedOrder: order,
    coverIndex: 1,
  };

  return [
    {
      ...common,
      albumTitle: suggested,
      albumDescription: `Colección visual de ${categoryLabel.toLowerCase()} organizada para comparar distribución, estilo, colores, materiales visibles y terminaciones. Las imágenes funcionan como referencias para definir una solución adaptada a las medidas y condiciones reales del espacio.`,
      hashtags: cleanTags(undefined, ['inspiracion', 'solucionesfabrick', category, 'diseno', 'construccion', 'remodelacion']),
      primaryKeyword: `${categoryLabel.toLowerCase()} modernas`,
      secondaryKeywords: [`ideas de ${categoryLabel.toLowerCase()}`, `${categoryLabel.toLowerCase()} para casas`, 'diseño interior Chile', 'remodelación del hogar'],
      seoTitle: `${suggested} | Ideas para el hogar`,
      seoDescription: `Explora ${suggested.toLowerCase()}: referencias visuales, distribución y terminaciones para planificar una solución adaptada a tu vivienda.`,
      imageSearchCaption: `${suggested}: referencias visuales de distribución, estilo y terminaciones para proyectos residenciales en Chile.`,
      interestScore: 3,
      interestLabel: 'Medio',
      organizationSummary: 'Orden sugerido desde la vista más general del espacio hacia detalles, materiales y terminaciones.',
    },
    {
      ...common,
      albumTitle: `${categoryLabel}: ideas y tendencias`,
      albumDescription: `Selección de ideas de ${categoryLabel.toLowerCase()} con enfoque inspiracional y comercial. El álbum agrupa soluciones visualmente relacionadas para ayudar a descubrir estilos, combinaciones y detalles que pueden reinterpretarse en proyectos de construcción o remodelación.`,
      hashtags: cleanTags(undefined, [category, 'ideas-hogar', 'tendencias-diseno', 'inspiracion-chile', 'solucionesfabrick', 'remodelacion']),
      primaryKeyword: `ideas de ${categoryLabel.toLowerCase()}`,
      secondaryKeywords: [`tendencias de ${categoryLabel.toLowerCase()}`, `${categoryLabel.toLowerCase()} en Chile`, 'inspiración para remodelar', 'diseño para viviendas'],
      seoTitle: `Ideas de ${categoryLabel} y tendencias | Fabrick`,
      seoDescription: `Descubre ideas de ${categoryLabel.toLowerCase()}, estilos y terminaciones para inspirar tu próxima construcción o remodelación en Chile.`,
      imageSearchCaption: `Ideas de ${categoryLabel.toLowerCase()} y tendencias visuales para construcción, diseño y remodelación de viviendas.`,
      interestScore: 4,
      interestLabel: 'Alto',
      organizationSummary: 'Orden sugerido por impacto visual: portada atractiva, vistas completas y luego detalles diferenciadores.',
    },
  ];
}

function cleanJson<T>(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  const candidate = fenced || (start >= 0 && end > start ? text.slice(start, end + 1) : text);
  return JSON.parse(candidate) as Partial<T>;
}

function cleanCategory(value: unknown, fallback = 'ideas') {
  return String(value || fallback).trim().toLowerCase().replace(/[^a-z0-9áéíóúñ-]+/gi, '-').replace(/^-|-$/g, '').slice(0, 80) || fallback;
}

function cleanTags(value: unknown, fallback: string[]) {
  const tags = Array.isArray(value) ? value : fallback;
  return Array.from(new Set(tags.map((tag) => String(tag).replace(/^#/, '').trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean))).slice(0, 16);
}

function cleanKeywords(value: unknown, fallback: string[]) {
  const keywords = Array.isArray(value) ? value : fallback;
  return Array.from(new Set(keywords.map((keyword) => String(keyword).replace(/^#/, '').trim().toLowerCase().replace(/\s+/g, ' ')).filter(Boolean))).slice(0, 12);
}

function cleanInterestScore(value: unknown, fallback = 3) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(5, Math.max(1, Math.round(parsed))) : fallback;
}

function cleanOrder(value: unknown, imageCount: number) {
  const max = Math.max(1, imageCount);
  const source = Array.isArray(value) ? value : [];
  const unique = Array.from(new Set(source.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item >= 1 && item <= max)));
  for (let index = 1; index <= max; index += 1) if (!unique.includes(index)) unique.push(index);
  return unique.slice(0, max);
}

function normalizeMetadata(result: Partial<Metadata>, fallback: Metadata): Metadata {
  return {
    title: String(result.title || fallback.title).trim().slice(0, 120),
    description: String(result.description || fallback.description).trim().slice(0, 900),
    alt: String(result.alt || result.title || fallback.alt).trim().slice(0, 180),
    category: cleanCategory(result.category, fallback.category),
    hashtags: cleanTags(result.hashtags, fallback.hashtags),
    keywords: cleanKeywords(result.keywords, fallback.keywords),
  };
}

function normalizeAlbumOption(result: Partial<AlbumMetadataOption>, fallback: AlbumMetadataOption, imageCount: number): AlbumMetadataOption {
  const primaryKeyword = String(result.primaryKeyword || fallback.primaryKeyword).trim().toLowerCase().slice(0, 100);
  const score = cleanInterestScore(result.interestScore, fallback.interestScore);
  return {
    albumTitle: String(result.albumTitle || fallback.albumTitle).trim().slice(0, 120),
    albumDescription: String(result.albumDescription || fallback.albumDescription).trim().slice(0, 900),
    category: cleanCategory(result.category, fallback.category),
    hashtags: cleanTags(result.hashtags, fallback.hashtags),
    primaryKeyword,
    secondaryKeywords: cleanKeywords(result.secondaryKeywords, fallback.secondaryKeywords).filter((keyword) => keyword !== primaryKeyword),
    seoTitle: String(result.seoTitle || fallback.seoTitle).trim().slice(0, 70),
    seoDescription: String(result.seoDescription || fallback.seoDescription).trim().slice(0, 180),
    imageSearchCaption: String(result.imageSearchCaption || fallback.imageSearchCaption).trim().slice(0, 240),
    interestScore: score,
    interestLabel: String(result.interestLabel || (score >= 5 ? 'Muy alto' : score >= 4 ? 'Alto' : score >= 3 ? 'Medio' : 'Bajo')).trim().slice(0, 40),
    organizationSummary: String(result.organizationSummary || fallback.organizationSummary).trim().slice(0, 500),
    suggestedOrder: cleanOrder(result.suggestedOrder, imageCount),
    coverIndex: Math.min(Math.max(Number(result.coverIndex || fallback.coverIndex || 1), 1), Math.max(1, imageCount)),
  };
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as Body;
  const mode = body.mode === 'album' ? 'album' : 'asset';
  const urls = Array.from(new Set([
    ...(body.imageUrls || []),
    body.imageUrl || '',
  ].map((value) => String(value).trim()).filter((value) => /^https:\/\//i.test(value))))
    .slice(0, mode === 'album' ? 6 : 1);
  const imageCount = Math.max(1, body.fileNames?.length || body.imageUrls?.length || urls.length || 1);
  const fallbackOptions = fallbackAlbumOptions(body, imageCount);
  const fallback = mode === 'album' ? fallbackOptions : fallbackMetadata(body);

  if (!urls.length) {
    return NextResponse.json({
      ok: true,
      ...(mode === 'album'
        ? { albumOptions: fallbackOptions, albumMetadata: fallbackOptions[0] }
        : { metadata: fallback }),
      source: 'fallback',
      warning: 'Las imágenes todavía no tienen una URL pública válida.',
    });
  }

  const credentials = await getOpenRouterCredentials();
  if (!credentials) {
    return NextResponse.json({
      ok: true,
      ...(mode === 'album'
        ? { albumOptions: fallbackOptions, albumMetadata: fallbackOptions[0] }
        : { metadata: fallback }),
      source: 'fallback',
      warning: 'OpenRouter no está configurado. Se generaron dos propuestas locales editables.',
    });
  }

  const prompt = mode === 'album'
    ? `Analiza este GRUPO de ${imageCount} imágenes como curador visual y estratega SEO para un catálogo chileno de construcción, remodelación y diseño interior.
Devuelve SOLO JSON válido con esta estructura exacta:
{"options":[{"albumTitle":"...","albumDescription":"...","category":"cocinas|casas|planos|banos|muebles|piscinas|quinchos|terrazas|materiales|remodelacion|ideas","hashtags":["..."],"primaryKeyword":"...","secondaryKeywords":["..."],"seoTitle":"...","seoDescription":"...","imageSearchCaption":"...","interestScore":1,"interestLabel":"Bajo|Medio|Alto|Muy alto","organizationSummary":"...","suggestedOrder":[1,2],"coverIndex":1},{"albumTitle":"...","albumDescription":"...","category":"...","hashtags":["..."],"primaryKeyword":"...","secondaryKeywords":["..."],"seoTitle":"...","seoDescription":"...","imageSearchCaption":"...","interestScore":1,"interestLabel":"Bajo|Medio|Alto|Muy alto","organizationSummary":"...","suggestedOrder":[1,2],"coverIndex":1}]}
Reglas:
- Genera EXACTAMENTE 2 opciones distintas y útiles, no variaciones casi idénticas.
- Organiza el grupo según lo que realmente aparece: categoría, portada y orden narrativo de las imágenes numeradas del 1 al ${imageCount}.
- suggestedOrder debe contener todos los índices del 1 al ${imageCount}, sin repetir.
- coverIndex es la imagen visualmente más representativa.
- Título de 3 a 9 palabras, natural y con intención de búsqueda.
- Descripción de 70 a 120 palabras, útil para personas, buscadores y asistentes de IA, sin repetir palabras de forma artificial.
- primaryKeyword de 2 a 5 palabras; secondaryKeywords entre 6 y 10 frases relacionadas.
- Entre 8 y 14 hashtags sin #, específicos y sin relleno.
- seoTitle máximo 60 caracteres; seoDescription entre 125 y 160 caracteres.
- imageSearchCaption describe el conjunto en 18 a 35 palabras y usa la palabra clave principal de forma natural.
- interestScore es solo una ESTIMACIÓN editorial de 1 a 5 basada en atractivo visual, intención comercial y amplitud temática. No simules datos de Google Trends ni volumen real.
- organizationSummary explica en una frase cómo ordenaste el álbum.
- Título sugerido por el administrador: ${body.albumTitle || 'sin definir'}.
- Categoría sugerida: ${body.category || 'ideas'}.
- Archivos del grupo: ${(body.fileNames || []).slice(0, 20).map((name, index) => `${index + 1}. ${name}`).join(' | ') || 'sin nombres'}.
- No afirmes que las obras fueron ejecutadas por la empresa.
- No inventes medidas, marcas, materiales ocultos, certificaciones ni resultados de búsqueda.`
    : `Analiza esta imagen como curador visual y redactor SEO para un catálogo chileno de inspiración para construcción, remodelación y diseño interior.
Devuelve SOLO JSON válido con esta estructura:
{"title":"...","description":"...","alt":"...","category":"cocinas|casas|planos|banos|muebles|piscinas|quinchos|terrazas|materiales|remodelacion|ideas","hashtags":["..."],"keywords":["..."]}
Reglas:
- Español claro, específico y comercial, sin afirmar que la obra fue ejecutada por la empresa.
- Título de 4 a 10 palabras.
- Descripción de 45 a 85 palabras que explique elementos visibles y posible uso como referencia.
- Alt accesible, literal y descriptivo; integra la palabra clave principal solo cuando encaja naturalmente.
- Entre 6 y 12 hashtags y entre 4 y 8 frases clave, sin sobreoptimización.
- Álbum: ${body.albumTitle || 'sin definir'}.
- Descripción del álbum: ${body.albumDescription || 'sin definir'}.
- Palabra clave principal: ${body.primaryKeyword || 'sin definir'}.
- Palabras relacionadas: ${(body.secondaryKeywords || []).join(', ') || 'sin definir'}.
- Categoría: ${body.category || 'ideas'}.
- No inventes materiales ocultos, medidas, marcas ni certificaciones.`;

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
          temperature: mode === 'album' ? 0.38 : 0.22,
          max_tokens: mode === 'album' ? 1800 : 850,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              ...urls.map((url) => ({ type: 'image_url', image_url: { url } })),
            ],
          }],
        }),
        cache: 'no-store',
      });
      const json = await response.json().catch(() => ({})) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };
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
        const rawOptions = Array.isArray(parsed.options) ? parsed.options.slice(0, 2) : [];
        const albumOptions = [0, 1].map((index) => normalizeAlbumOption(rawOptions[index] || {}, fallbackOptions[index], imageCount));
        return NextResponse.json({ ok: true, albumOptions, albumMetadata: albumOptions[0], source: 'ai', model });
      }

      const metadata = normalizeMetadata(cleanJson<Metadata>(text), fallback as Metadata);
      return NextResponse.json({ ok: true, metadata, source: 'ai', model });
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Error desconocido';
    }
  }

  return NextResponse.json({
    ok: true,
    ...(mode === 'album'
      ? { albumOptions: fallbackOptions, albumMetadata: fallbackOptions[0] }
      : { metadata: fallback }),
    source: 'fallback',
    warning: `La IA visual no respondió. Se generó contenido editable: ${lastError}`,
  });
}

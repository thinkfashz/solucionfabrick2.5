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

type AlbumMetadata = {
  albumTitle: string;
  albumDescription: string;
  category: string;
  hashtags: string[];
};

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return decodeSession(cookie);
}

function titleFromFiles(fileNames: string[] | undefined) {
  const first = String(fileNames?.[0] || '').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  return first ? first.replace(/\b\w/g, (character) => character.toUpperCase()).slice(0, 120) : 'Inspiraciones Fabrick';
}

function fallbackMetadata(body: Body): Metadata {
  const album = String(body.albumTitle || titleFromFiles(body.fileNames)).trim();
  const category = String(body.category || 'ideas').trim();
  return {
    title: album || 'Inspiración para tu proyecto',
    description: 'Referencia visual para conversar sobre distribución, materiales, terminaciones y adaptación al espacio disponible.',
    alt: `${album || 'Inspiración'} para construcción, remodelación o equipamiento del hogar`,
    category,
    hashtags: ['inspiracion', 'solucionesfabrick', category, 'construccion', 'remodelacion'].filter(Boolean),
  };
}

function fallbackAlbumMetadata(body: Body): AlbumMetadata {
  const albumTitle = String(body.albumTitle || titleFromFiles(body.fileNames)).trim() || 'Inspiraciones Fabrick';
  const category = String(body.category || 'ideas').trim();
  return {
    albumTitle,
    albumDescription: 'Colección visual agrupada para comparar distribución, estilo, materiales, colores y terminaciones antes de adaptar la idea a un espacio real.',
    category,
    hashtags: ['inspiracion', 'solucionesfabrick', category, 'diseno', 'construccion', 'remodelacion'].filter(Boolean),
  };
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
  return Array.from(new Set(tags.map((tag) => String(tag).replace(/^#/, '').trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean))).slice(0, 14);
}

function normalizeMetadata(result: Partial<Metadata>, fallback: Metadata): Metadata {
  return {
    title: String(result.title || fallback.title).trim().slice(0, 120),
    description: String(result.description || fallback.description).trim().slice(0, 900),
    alt: String(result.alt || result.title || fallback.alt).trim().slice(0, 180),
    category: cleanCategory(result.category, fallback.category),
    hashtags: cleanTags(result.hashtags, fallback.hashtags),
  };
}

function normalizeAlbumMetadata(result: Partial<AlbumMetadata>, fallback: AlbumMetadata): AlbumMetadata {
  return {
    albumTitle: String(result.albumTitle || fallback.albumTitle).trim().slice(0, 120),
    albumDescription: String(result.albumDescription || fallback.albumDescription).trim().slice(0, 900),
    category: cleanCategory(result.category, fallback.category),
    hashtags: cleanTags(result.hashtags, fallback.hashtags),
  };
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as Body;
  const mode = body.mode === 'album' ? 'album' : 'asset';
  const urls = Array.from(new Set([...(body.imageUrls || []), body.imageUrl || ''].map((value) => String(value).trim()).filter((value) => /^https:\/\//i.test(value)))).slice(0, mode === 'album' ? 6 : 1);
  const fallback = mode === 'album' ? fallbackAlbumMetadata(body) : fallbackMetadata(body);

  if (!urls.length) {
    return NextResponse.json({
      ok: true,
      ...(mode === 'album' ? { albumMetadata: fallback } : { metadata: fallback }),
      source: 'fallback',
      warning: 'Las imágenes todavía no tienen una URL pública válida.',
    });
  }

  const credentials = await getOpenRouterCredentials();
  if (!credentials) {
    return NextResponse.json({
      ok: true,
      ...(mode === 'album' ? { albumMetadata: fallback } : { metadata: fallback }),
      source: 'fallback',
      warning: 'OpenRouter no está configurado. Se generó un relleno local editable.',
    });
  }

  const prompt = mode === 'album'
    ? `Analiza este GRUPO de imágenes como curador de un catálogo chileno de inspiración para construcción, remodelación y diseño interior.
Devuelve SOLO JSON válido con esta estructura:
{"albumTitle":"...","albumDescription":"...","category":"cocinas|casas|planos|banos|muebles|piscinas|quinchos|terrazas|materiales|remodelacion|ideas","hashtags":["..."]}
Reglas:
- Trata las imágenes como un solo álbum coherente.
- Título de 3 a 8 palabras.
- Descripción de 45 a 85 palabras que explique qué une al grupo, estilo visible y cómo puede usarse como referencia.
- Entre 7 y 12 hashtags sin #.
- Título sugerido por el administrador: ${body.albumTitle || 'sin definir'}.
- Categoría sugerida: ${body.category || 'ideas'}.
- Archivos del grupo: ${(body.fileNames || []).slice(0, 12).join(', ') || 'sin nombres'}.
- No afirmes que las obras fueron ejecutadas por la empresa.
- No inventes medidas, marcas, materiales ocultos ni certificaciones.`
    : `Analiza esta imagen como curador de un catálogo chileno de inspiración para construcción, remodelación y diseño interior.
Devuelve SOLO JSON válido con esta estructura:
{"title":"...","description":"...","alt":"...","category":"cocinas|casas|planos|banos|muebles|piscinas|quinchos|terrazas|materiales|remodelacion|ideas","hashtags":["..."]}
Reglas:
- Español claro y comercial, sin afirmar que la obra fue ejecutada por la empresa.
- Título de 4 a 10 palabras.
- Descripción de 35 a 70 palabras explicando estilo, elementos visibles y posible uso como referencia.
- Alt accesible y literal.
- Entre 6 y 12 hashtags sin #.
- Álbum indicado por el administrador: ${body.albumTitle || 'sin definir'}.
- Categoría sugerida por el administrador: ${body.category || 'ideas'}.
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
          temperature: 0.22,
          max_tokens: mode === 'album' ? 760 : 650,
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
        const albumMetadata = normalizeAlbumMetadata(cleanJson<AlbumMetadata>(text), fallback as AlbumMetadata);
        return NextResponse.json({ ok: true, albumMetadata, source: 'ai', model });
      }
      const metadata = normalizeMetadata(cleanJson<Metadata>(text), fallback as Metadata);
      return NextResponse.json({ ok: true, metadata, source: 'ai', model });
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Error desconocido';
    }
  }

  return NextResponse.json({
    ok: true,
    ...(mode === 'album' ? { albumMetadata: fallback } : { metadata: fallback }),
    source: 'fallback',
    warning: `La IA visual no respondió. Se generó metadata editable: ${lastError}`,
  });
}

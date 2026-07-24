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
  albumTitle?: string;
  category?: string;
  locale?: string;
};

type Metadata = {
  title: string;
  description: string;
  alt: string;
  category: string;
  hashtags: string[];
};

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return decodeSession(cookie);
}

function fallbackMetadata(body: Body): Metadata {
  const album = String(body.albumTitle || 'Inspiración Fabrick').trim();
  const category = String(body.category || 'ideas').trim();
  return {
    title: album || 'Inspiración para tu proyecto',
    description: 'Referencia visual para conversar sobre distribución, materiales, terminaciones y adaptación al espacio disponible.',
    alt: `${album || 'Inspiración'} para construcción, remodelación o equipamiento del hogar`,
    category,
    hashtags: ['inspiracion', 'solucionesfabrick', category, 'construccion', 'remodelacion'].filter(Boolean),
  };
}

function cleanJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  return JSON.parse(candidate) as Partial<Metadata>;
}

function normalize(result: Partial<Metadata>, fallback: Metadata): Metadata {
  const tags = Array.isArray(result.hashtags) ? result.hashtags : fallback.hashtags;
  return {
    title: String(result.title || fallback.title).trim().slice(0, 120),
    description: String(result.description || fallback.description).trim().slice(0, 900),
    alt: String(result.alt || result.title || fallback.alt).trim().slice(0, 180),
    category: String(result.category || fallback.category).trim().toLowerCase().replace(/[^a-z0-9áéíóúñ-]+/gi, '-').replace(/^-|-$/g, '').slice(0, 80) || 'ideas',
    hashtags: Array.from(new Set(tags.map((tag) => String(tag).replace(/^#/, '').trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean))).slice(0, 14),
  };
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as Body;
  const fallback = fallbackMetadata(body);
  const imageUrl = String(body.imageUrl || '').trim();
  if (!/^https:\/\//i.test(imageUrl)) return NextResponse.json({ ok: true, metadata: fallback, source: 'fallback', warning: 'La imagen todavía no tiene una URL pública válida.' });

  const credentials = await getOpenRouterCredentials();
  if (!credentials) return NextResponse.json({ ok: true, metadata: fallback, source: 'fallback', warning: 'OpenRouter no está configurado. Se generó un relleno local editable.' });

  const prompt = `Analiza esta imagen como curador de un catálogo chileno de inspiración para construcción, remodelación y diseño interior.
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
          temperature: 0.25,
          max_tokens: 650,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
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
      const metadata = normalize(cleanJson(text), fallback);
      return NextResponse.json({ ok: true, metadata, source: 'ai', model });
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Error desconocido';
    }
  }

  return NextResponse.json({ ok: true, metadata: fallback, source: 'fallback', warning: `La IA visual no respondió. Se generó metadata editable: ${lastError}` });
}

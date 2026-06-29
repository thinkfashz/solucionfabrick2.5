import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCloudinaryCredentials } from '@/lib/cloudinaryCredentials';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_FOLDER = process.env.CLOUDINARY_PROJECTS_FOLDER || 'fabrick';
const FALLBACK_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || 'disghf6xc';

const CATEGORY_MAP = [
  { key: 'cocinas', label: 'Cocinas', words: ['cocina', 'kitchen', 'meson', 'mueble-cocina'] },
  { key: 'banos', label: 'Baños', words: ['bano', 'baño', 'bath', 'ducha', 'wc'] },
  { key: 'puertas', label: 'Puertas', words: ['puerta', 'door', 'porton'] },
  { key: 'materiales', label: 'Materiales', words: ['material', 'madera', 'piso', 'ceramica', 'metalcon', 'melamina', 'marmol', 'porcelanato'] },
  { key: 'remodelacion', label: 'Remodelación', words: ['remodel', 'antes', 'despues', 'renova', 'obra'] },
  { key: 'terrazas', label: 'Terrazas', words: ['terraza', 'deck', 'patio', 'quincho'] },
  { key: 'muebles', label: 'Muebles', words: ['mueble', 'closet', 'rack', 'vanitorio', 'repisas'] },
  { key: 'aire', label: 'Aire acondicionado', words: ['aire', 'ac', 'split', 'clima', 'condensador'] },
];

type CloudinaryContext = { custom?: Record<string, string> } | Record<string, string> | string | null | undefined;

type CloudinaryResource = {
  public_id: string;
  secure_url: string;
  format?: string;
  bytes?: number;
  created_at?: string;
  width?: number;
  height?: number;
  tags?: string[];
  context?: CloudinaryContext;
  folder?: string;
};

function cleanFolder(input: string | null) {
  const value = (input || DEFAULT_FOLDER).replace(/[^a-zA-Z0-9_/-]/g, '').slice(0, 120);
  return value || DEFAULT_FOLDER;
}

function cloudinaryTransform(url: string, transform: string) {
  if (!url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/${transform}/`);
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function contextRecord(context: CloudinaryContext): Record<string, string> {
  if (!context || typeof context === 'string') return {};
  if ('custom' in context && context.custom && typeof context.custom === 'object') return context.custom;
  return context as Record<string, string>;
}

function inferCategory(resource: CloudinaryResource) {
  const context = contextRecord(resource.context);
  const haystack = normalize([
    resource.public_id,
    resource.folder || '',
    ...(resource.tags || []),
    ...Object.values(context),
  ].join(' '));
  return CATEGORY_MAP.find((cat) => cat.words.some((word) => haystack.includes(normalize(word))))?.key || 'ideas';
}

function titleFromPublicId(publicId: string) {
  const last = publicId.split('/').pop() || publicId;
  return last.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 80);
}

function fallbackAssets() {
  const cloud = FALLBACK_CLOUD_NAME;
  const base = `https://res.cloudinary.com/${cloud}/image/upload`;
  const ids = [
    'fabrick/general/oiol0ydk8yc48f8p6iza',
    'fabrick/general/oiol0ydk8yc48f8p6iza',
  ];
  return ids.map((id, index) => ({
    id,
    public_id: id,
    title: index === 0 ? 'Inspiración Soluciones Fabrick' : 'Materiales y remodelación',
    category: index === 0 ? 'remodelacion' : 'materiales',
    url: `${base}/f_auto,q_auto,w_1200/${id}.png`,
    thumb: `${base}/f_auto,q_auto,w_680/${id}.png`,
    width: 1200,
    height: 900,
    tags: ['demo'],
    created_at: new Date().toISOString(),
    fallback: true,
  }));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const folder = cleanFolder(url.searchParams.get('folder'));
  const maxResults = Math.min(Math.max(Number(url.searchParams.get('max') || '80'), 12), 100);
  const nextCursor = url.searchParams.get('next_cursor') || '';

  const creds = await getCloudinaryCredentials({ preferDb: true });
  if (!creds.ready) {
    return NextResponse.json({
      assets: fallbackAssets(),
      categories: [{ key: 'ideas', label: 'Ideas' }, ...CATEGORY_MAP.map(({ key, label }) => ({ key, label }))],
      source: 'fallback',
      warning: 'Cloudinary no está configurado. Agrega CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET o configura la integración en admin.',
      missing: creds.missing,
    }, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } });
  }

  try {
    const apiUrl = new URL(`https://api.cloudinary.com/v1_1/${encodeURIComponent(creds.cloudName)}/resources/image/upload`);
    apiUrl.searchParams.set('max_results', String(maxResults));
    apiUrl.searchParams.set('prefix', folder);
    apiUrl.searchParams.set('tags', 'true');
    apiUrl.searchParams.set('context', 'true');
    if (nextCursor) apiUrl.searchParams.set('next_cursor', nextCursor);

    const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString('base64');
    const res = await fetch(apiUrl.toString(), { headers: { Authorization: `Basic ${auth}` }, next: { revalidate: 300 } });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return NextResponse.json({ assets: fallbackAssets(), source: 'fallback', error: `Cloudinary API error ${res.status}: ${body}` }, { status: 200 });
    }

    const json = await res.json() as { resources?: CloudinaryResource[]; next_cursor?: string };
    const assets = (json.resources || [])
      .filter((item) => item.secure_url)
      .map((item) => {
        const category = inferCategory(item);
        const context = contextRecord(item.context);
        const title = context.caption || context.title || context.alt || titleFromPublicId(item.public_id);
        return {
          id: item.public_id,
          public_id: item.public_id,
          title,
          category,
          url: cloudinaryTransform(item.secure_url, 'f_auto,q_auto,w_1400'),
          thumb: cloudinaryTransform(item.secure_url, 'f_auto,q_auto,w_720'),
          width: item.width || 1200,
          height: item.height || 900,
          format: item.format || '',
          tags: item.tags || [],
          created_at: item.created_at || '',
          folder,
        };
      });

    return NextResponse.json({
      assets: assets.length ? assets : fallbackAssets(),
      categories: [{ key: 'ideas', label: 'Ideas' }, ...CATEGORY_MAP.map(({ key, label }) => ({ key, label }))],
      next_cursor: json.next_cursor || null,
      source: assets.length ? 'cloudinary' : 'fallback',
      folder,
    }, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=900' } });
  } catch (err) {
    return NextResponse.json({ assets: fallbackAssets(), source: 'fallback', error: (err as Error).message }, { status: 200 });
  }
}

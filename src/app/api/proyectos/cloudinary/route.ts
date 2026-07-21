import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCloudinaryCredentials } from '@/lib/cloudinaryCredentials';
import { insforge } from '@/lib/insforge';

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

type ProjectMediaMetadata = {
  public_id: string;
  category_slug?: string;
  title?: string;
  story?: string;
  description?: string;
  seo_title?: string;
  seo_description?: string;
  keywords?: unknown;
  social?: unknown;
  is_favorite?: boolean;
  sort_order?: number;
};

type ProjectCategoryMetadata = { key: string; label: string };

function safeStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 24)
    : [];
}

async function getPublicCatalogMetadata(): Promise<{ media: Map<string, ProjectMediaMetadata>; categories: ProjectCategoryMetadata[] }> {
  try {
    const [mediaResult, categoriesResult] = await Promise.all([
      insforge.database.from('project_media').select('public_id, category_slug, title, story, description, seo_title, seo_description, keywords, social, is_favorite, sort_order').eq('is_published', true).limit(350),
      insforge.database.from('project_categories').select('slug, name').order('sort_order', { ascending: true }).limit(100),
    ]);
    const media = mediaResult.error || !Array.isArray(mediaResult.data)
      ? new Map<string, ProjectMediaMetadata>()
      : new Map((mediaResult.data as ProjectMediaMetadata[]).filter((item) => item.public_id).map((item) => [item.public_id, item]));
    const categories = categoriesResult.error || !Array.isArray(categoriesResult.data)
      ? []
      : (categoriesResult.data as Array<{ slug?: string; name?: string }>)
        .filter((item) => item.slug && item.name)
        .map((item) => ({ key: item.slug as string, label: item.name as string }));
    return { media, categories };
  } catch {
    // The catalog metadata is optional. A missing table or a temporary
    // database issue must never blank the Cloudinary gallery.
    return { media: new Map(), categories: [] };
  }
}

function galleryCategories(categories: ProjectCategoryMetadata[]) {
  const base = [{ key: 'ideas', label: 'Ideas' }, ...CATEGORY_MAP.map(({ key, label }) => ({ key, label }))];
  return [...categories, ...base].filter((item, index, all) => all.findIndex((candidate) => candidate.key === item.key) === index);
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
    const catalog = await getPublicCatalogMetadata();
    const assets = (json.resources || [])
      .filter((item) => item.secure_url)
      .map((item) => {
        const metadata = catalog.media.get(item.public_id);
        const category = metadata?.category_slug || inferCategory(item);
        const context = contextRecord(item.context);
        const title = metadata?.title || context.caption || context.title || context.alt || titleFromPublicId(item.public_id);
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
          tags: Array.from(new Set([...(item.tags || []), ...safeStringList(metadata?.keywords)])),
          story: metadata?.story || '',
          description: metadata?.description || '',
          seo_title: metadata?.seo_title || '',
          seo_description: metadata?.seo_description || '',
          social: metadata?.social && typeof metadata.social === 'object' ? metadata.social : {},
          is_favorite: Boolean(metadata?.is_favorite),
          sort_order: typeof metadata?.sort_order === 'number' ? metadata.sort_order : 0,
          created_at: item.created_at || '',
          folder,
        };
      })
      .sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite) || a.sort_order - b.sort_order);

    return NextResponse.json({
      assets: assets.length ? assets : fallbackAssets(),
      categories: galleryCategories(catalog.categories),
      next_cursor: json.next_cursor || null,
      source: assets.length ? 'cloudinary' : 'fallback',
      folder,
    }, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=900' } });
  } catch (err) {
    return NextResponse.json({ assets: fallbackAssets(), source: 'fallback', error: (err as Error).message }, { status: 200 });
  }
}

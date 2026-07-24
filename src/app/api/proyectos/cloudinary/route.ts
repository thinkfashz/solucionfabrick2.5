import { createHash } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getCloudinaryCredentials } from '@/lib/cloudinaryCredentials';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_FOLDER = process.env.CLOUDINARY_PROJECTS_FOLDER || 'fabrick/inspiraciones';
const FALLBACK_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || 'disghf6xc';
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

const CATEGORY_MAP = [
  { key: 'cocinas', label: 'Ideas de cocina', words: ['cocina', 'kitchen', 'meson', 'mueble-cocina'] },
  { key: 'casas', label: 'Ideas de casas', words: ['casa', 'vivienda', 'fachada', 'home'] },
  { key: 'planos', label: 'Planos de casa', words: ['plano', 'planta', 'layout', 'distribucion'] },
  { key: 'banos', label: 'Ideas de baño', words: ['bano', 'baño', 'bath', 'ducha', 'wc'] },
  { key: 'muebles', label: 'Ideas de muebles', words: ['mueble', 'closet', 'rack', 'vanitorio', 'repisas'] },
  { key: 'piscinas', label: 'Piscinas', words: ['piscina', 'pool'] },
  { key: 'quinchos', label: 'Quinchos', words: ['quincho', 'barbecue', 'parrilla'] },
  { key: 'terrazas', label: 'Terrazas y patios', words: ['terraza', 'deck', 'patio'] },
  { key: 'materiales', label: 'Materiales y terminaciones', words: ['material', 'madera', 'piso', 'ceramica', 'metalcon', 'melamina', 'marmol', 'porcelanato'] },
  { key: 'remodelacion', label: 'Remodelación', words: ['remodel', 'antes', 'despues', 'renova', 'obra'] },
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

type MetadataPayload = {
  public_id?: string;
  title?: string;
  description?: string;
  alt?: string;
  category?: string;
  album?: string;
  albumTitle?: string;
  hashtags?: string[];
};

function cleanFolder(input: string | null) {
  const value = (input || DEFAULT_FOLDER).replace(/[^a-zA-Z0-9_/-]/g, '').replace(/\/{2,}/g, '/').slice(0, 160);
  return value || DEFAULT_FOLDER;
}
function cleanSlug(input: string | null | undefined, fallback = 'general') {
  const value = String(input || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  return value || fallback;
}
function cleanText(input: FormDataEntryValue | string | null | undefined, max = 500) {
  return String(input || '').trim().replace(/[|]/g, ' ').slice(0, max);
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
function inferCategory(resource: CloudinaryResource, context = contextRecord(resource.context)) {
  if (context.category) return cleanSlug(context.category, 'ideas');
  const haystack = normalize([resource.public_id, resource.folder || '', ...(resource.tags || []), ...Object.values(context)].join(' '));
  return CATEGORY_MAP.find((cat) => cat.words.some((word) => haystack.includes(normalize(word))))?.key || 'ideas';
}
function titleFromPublicId(publicId: string) {
  const last = publicId.split('/').pop() || publicId;
  return last.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()).slice(0, 100);
}
function albumFromResource(resource: CloudinaryResource, context: Record<string, string>) {
  if (context.album) return cleanSlug(context.album);
  const pieces = resource.public_id.split('/');
  const marker = pieces.indexOf('inspiraciones');
  return cleanSlug(marker >= 0 ? pieces[marker + 1] : pieces.at(-2), 'general');
}
function contextString(payload: MetadataPayload) {
  const entries = {
    title: cleanText(payload.title, 120),
    caption: cleanText(payload.title, 120),
    description: cleanText(payload.description, 900),
    alt: cleanText(payload.alt || payload.title, 180),
    category: cleanSlug(payload.category, 'ideas'),
    album: cleanSlug(payload.album, 'general'),
    album_title: cleanText(payload.albumTitle || payload.album, 120),
  };
  return Object.entries(entries).filter(([, value]) => value).map(([key, value]) => `${key}=${value}`).join('|');
}
function tagString(payload: MetadataPayload) {
  const tags = [...(payload.hashtags || []), cleanSlug(payload.category, ''), cleanSlug(payload.album, '')]
    .map((tag) => cleanSlug(String(tag).replace(/^#/, ''), ''))
    .filter(Boolean);
  return Array.from(new Set(tags)).slice(0, 20).join(',');
}
function signParams(params: Record<string, string | number | boolean>, secret: string) {
  const base = Object.entries(params).filter(([, value]) => value !== '' && value !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${String(value)}`).join('&');
  return createHash('sha1').update(`${base}${secret}`).digest('hex');
}
async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return decodeSession(cookie);
}
function normalizeAsset(resource: CloudinaryResource) {
  const context = contextRecord(resource.context);
  const category = inferCategory(resource, context);
  const album = albumFromResource(resource, context);
  const title = context.caption || context.title || context.alt || titleFromPublicId(resource.public_id);
  return {
    id: resource.public_id,
    public_id: resource.public_id,
    title,
    description: context.description || '',
    alt: context.alt || title,
    category,
    album,
    album_title: context.album_title || album.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    url: cloudinaryTransform(resource.secure_url, 'f_auto,q_auto,w_1600'),
    thumb: cloudinaryTransform(resource.secure_url, 'f_auto,q_auto,w_760'),
    width: resource.width || 1200,
    height: resource.height || 900,
    format: resource.format || '',
    tags: resource.tags || [],
    created_at: resource.created_at || '',
    folder: resource.folder || '',
  };
}
function fallbackAssets() {
  const base = `https://res.cloudinary.com/${FALLBACK_CLOUD_NAME}/image/upload`;
  const id = 'fabrick/general/oiol0ydk8yc48f8p6iza';
  return [{
    id,
    public_id: id,
    title: 'Inspiración para transformar tu espacio',
    description: 'Referencia visual para conversar sobre distribución, materiales y terminaciones.',
    alt: 'Inspiración de diseño y remodelación Soluciones Fabrick',
    category: 'remodelacion',
    album: 'ideas-generales',
    album_title: 'Ideas generales',
    url: `${base}/f_auto,q_auto,w_1400/${id}.png`,
    thumb: `${base}/f_auto,q_auto,w_720/${id}.png`,
    width: 1200,
    height: 900,
    tags: ['inspiracion', 'remodelacion'],
    created_at: new Date().toISOString(),
    fallback: true,
  }];
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const folder = cleanFolder(url.searchParams.get('folder'));
  const maxResults = Math.min(Math.max(Number(url.searchParams.get('max') || '80'), 12), 100);
  const nextCursor = url.searchParams.get('next_cursor') || '';
  const creds = await getCloudinaryCredentials({ preferDb: true });

  if (!creds.ready) {
    const assets = fallbackAssets();
    return NextResponse.json({ assets, albums: buildAlbums(assets), categories: categoryOptions(), source: 'fallback', warning: 'Cloudinary no está configurado. Configura la integración desde admin para gestionar Inspiraciones.', missing: creds.missing });
  }

  try {
    const apiUrl = new URL(`https://api.cloudinary.com/v1_1/${encodeURIComponent(creds.cloudName)}/resources/image/upload`);
    apiUrl.searchParams.set('max_results', String(maxResults));
    apiUrl.searchParams.set('prefix', folder);
    apiUrl.searchParams.set('tags', 'true');
    apiUrl.searchParams.set('context', 'true');
    if (nextCursor) apiUrl.searchParams.set('next_cursor', nextCursor);
    const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString('base64');
    const response = await fetch(apiUrl.toString(), { headers: { Authorization: `Basic ${auth}` }, cache: 'no-store' });
    if (!response.ok) throw new Error(`Cloudinary API error ${response.status}: ${await response.text().catch(() => '')}`);
    const json = await response.json() as { resources?: CloudinaryResource[]; next_cursor?: string };
    const assets = (json.resources || []).filter((item) => item.secure_url).map(normalizeAsset);
    const finalAssets = assets.length ? assets : fallbackAssets();
    return NextResponse.json({ assets: finalAssets, albums: buildAlbums(finalAssets), categories: categoryOptions(), next_cursor: json.next_cursor || null, source: assets.length ? 'cloudinary' : 'fallback', folder });
  } catch (error) {
    const assets = fallbackAssets();
    return NextResponse.json({ assets, albums: buildAlbums(assets), categories: categoryOptions(), source: 'fallback', error: (error as Error).message }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const creds = await getCloudinaryCredentials({ preferDb: true });
  if (!creds.ready) return NextResponse.json({ error: 'Cloudinary no está configurado', missing: creds.missing }, { status: 503 });

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Selecciona una imagen válida.' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Solo se permiten imágenes.' }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: 'La imagen supera el máximo de 12 MB.' }, { status: 413 });

    const album = cleanSlug(cleanText(form.get('album'), 80), 'general');
    const payload: MetadataPayload = {
      title: cleanText(form.get('title'), 120) || file.name.replace(/\.[^.]+$/, ''),
      description: cleanText(form.get('description'), 900),
      alt: cleanText(form.get('alt'), 180),
      category: cleanSlug(cleanText(form.get('category'), 80), 'ideas'),
      album,
      albumTitle: cleanText(form.get('albumTitle'), 120) || album,
      hashtags: cleanText(form.get('hashtags'), 500).split(/[\s,]+/).filter(Boolean),
    };
    const folder = cleanFolder(`${DEFAULT_FOLDER}/${album}`);
    const timestamp = Math.floor(Date.now() / 1000);
    const context = contextString(payload);
    const tags = tagString(payload);
    const params = { folder, timestamp, context, tags };
    const upload = new FormData();
    upload.set('file', file);
    upload.set('api_key', creds.apiKey);
    upload.set('timestamp', String(timestamp));
    upload.set('folder', folder);
    upload.set('context', context);
    upload.set('tags', tags);
    upload.set('signature', signParams(params, creds.apiSecret));

    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(creds.cloudName)}/image/upload`, { method: 'POST', body: upload });
    const json = await response.json().catch(() => ({})) as CloudinaryResource & { error?: { message?: string } };
    if (!response.ok || !json.secure_url) return NextResponse.json({ error: json.error?.message || `Cloudinary upload error ${response.status}` }, { status: 502 });
    return NextResponse.json({ ok: true, asset: normalizeAsset(json), uploadedBy: session.email || session.sub }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const creds = await getCloudinaryCredentials({ preferDb: true });
  if (!creds.ready) return NextResponse.json({ error: 'Cloudinary no está configurado' }, { status: 503 });

  try {
    const payload = await request.json() as MetadataPayload;
    if (!payload.public_id) return NextResponse.json({ error: 'Falta public_id' }, { status: 400 });
    const body = new URLSearchParams();
    body.set('context', contextString(payload));
    body.set('tags', tagString(payload));
    const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString('base64');
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(creds.cloudName)}/resources/image/upload/${encodeURIComponent(payload.public_id)}`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = await response.json().catch(() => ({})) as CloudinaryResource & { error?: { message?: string } };
    if (!response.ok) return NextResponse.json({ error: json.error?.message || `Cloudinary metadata error ${response.status}` }, { status: 502 });
    return NextResponse.json({ ok: true, asset: json.secure_url ? normalizeAsset(json) : null });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const creds = await getCloudinaryCredentials({ preferDb: true });
  if (!creds.ready) return NextResponse.json({ error: 'Cloudinary no está configurado' }, { status: 503 });

  try {
    const publicId = cleanText(new URL(request.url).searchParams.get('public_id'), 300);
    if (!publicId) return NextResponse.json({ error: 'Falta public_id' }, { status: 400 });
    const timestamp = Math.floor(Date.now() / 1000);
    const params = { public_id: publicId, timestamp, invalidate: true };
    const body = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), invalidate: 'true', api_key: creds.apiKey, signature: signParams(params, creds.apiSecret) });
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(creds.cloudName)}/image/destroy`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    const json = await response.json().catch(() => ({})) as { result?: string; error?: { message?: string } };
    if (!response.ok || (json.result !== 'ok' && json.result !== 'not found')) return NextResponse.json({ error: json.error?.message || 'No se pudo eliminar la imagen.' }, { status: 502 });
    return NextResponse.json({ ok: true, result: json.result });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

function categoryOptions() {
  return [{ key: 'ideas', label: 'Todas las ideas' }, ...CATEGORY_MAP.map(({ key, label }) => ({ key, label }))];
}
function buildAlbums(assets: Array<ReturnType<typeof normalizeAsset> | ReturnType<typeof fallbackAssets>[number]>) {
  const map = new Map<string, { key: string; title: string; category: string; description: string; cover: string; count: number }>();
  for (const asset of assets) {
    const current = map.get(asset.album);
    if (current) current.count += 1;
    else map.set(asset.album, { key: asset.album, title: asset.album_title, category: asset.category, description: asset.description || 'Álbum visual de ideas para conversar, adaptar y cotizar.', cover: asset.thumb, count: 1 });
  }
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
}

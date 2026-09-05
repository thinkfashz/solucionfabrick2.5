import { createHash } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getCloudinaryCredentials } from '@/lib/cloudinaryCredentials';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import {
  DEFAULT_INSPIRATIONS_FOLDER,
  cleanFolder,
  cleanNumber,
  cleanSlug,
  cleanText,
  contextString,
  loadInspirationCatalog,
  normalizeInspirationAsset,
  publicInspirationCatalog,
  tagString,
  type CloudinaryResource,
  type InspirationMetadataPayload,
} from '@/lib/inspirationCatalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

function signParams(params: Record<string, string | number | boolean>, secret: string) {
  const base = Object.entries(params)
    .filter(([, value]) => value !== '' && value !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('&');
  return createHash('sha1').update(`${base}${secret}`).digest('hex');
}

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return decodeSession(cookie);
}

function payloadFromForm(form: FormData, fileName: string): InspirationMetadataPayload {
  const album = cleanSlug(cleanText(form.get('album'), 80), 'general');
  return {
    title: cleanText(form.get('title'), 120) || fileName.replace(/\.[^.]+$/, ''),
    description: cleanText(form.get('description'), 900),
    alt: cleanText(form.get('alt'), 180),
    category: cleanSlug(cleanText(form.get('category'), 80), 'ideas'),
    album,
    albumTitle: cleanText(form.get('albumTitle'), 120) || album,
    albumDescription: cleanText(form.get('albumDescription'), 900),
    hashtags: cleanText(form.get('hashtags'), 500).split(/[\s,]+/).filter(Boolean),
    albumHashtags: cleanText(form.get('albumHashtags'), 500).split(/[\s,]+/).filter(Boolean),
    albumKeywords: cleanText(form.get('albumKeywords'), 900).split(/[,\n]+/).map((value) => value.trim()).filter(Boolean),
    primaryKeyword: cleanText(form.get('primaryKeyword'), 100),
    seoTitle: cleanText(form.get('seoTitle'), 70),
    seoDescription: cleanText(form.get('seoDescription'), 180),
    imageSearchCaption: cleanText(form.get('imageSearchCaption'), 240),
    interestScore: cleanNumber(form.get('interestScore'), 0, 5),
    interestLabel: cleanText(form.get('interestLabel'), 40),
    organizationSummary: cleanText(form.get('organizationSummary'), 500),
    sortOrder: cleanNumber(form.get('sortOrder'), 0),
    albumCover: String(form.get('albumCover') || '') === 'true',
  };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const [catalog, session] = await Promise.all([
    loadInspirationCatalog({
    folder: url.searchParams.get('folder') || DEFAULT_INSPIRATIONS_FOLDER,
    maxResults: Number(url.searchParams.get('max') || '100'),
    nextCursor: url.searchParams.get('next_cursor') || undefined,
    }),
    requireAdmin(request),
  ]);
  const visibleCatalog = session ? catalog : publicInspirationCatalog(catalog);

  return NextResponse.json({
    assets: visibleCatalog.assets,
    albums: visibleCatalog.albums,
    categories: visibleCatalog.categories,
    next_cursor: visibleCatalog.nextCursor,
    source: visibleCatalog.source,
    folder: visibleCatalog.folder,
    ...(visibleCatalog.warning ? { warning: visibleCatalog.warning } : {}),
    ...(visibleCatalog.error ? { error: visibleCatalog.error } : {}),
  }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const credentials = await getCloudinaryCredentials({ preferDb: true });
  if (!credentials.ready) {
    return NextResponse.json({ error: 'Cloudinary no está configurado', missing: credentials.missing }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Selecciona una imagen válida.' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Solo se permiten imágenes.' }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: 'La imagen supera el máximo de 12 MB.' }, { status: 413 });

    const payload = payloadFromForm(form, file.name);
    const folder = cleanFolder(`${DEFAULT_INSPIRATIONS_FOLDER}/${cleanSlug(payload.album, 'general')}`);
    const timestamp = Math.floor(Date.now() / 1000);
    const context = contextString(payload);
    const tags = tagString(payload);
    const params = { folder, timestamp, context, tags };

    const upload = new FormData();
    upload.set('file', file);
    upload.set('api_key', credentials.apiKey);
    upload.set('timestamp', String(timestamp));
    upload.set('folder', folder);
    upload.set('context', context);
    upload.set('tags', tags);
    upload.set('signature', signParams(params, credentials.apiSecret));

    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(credentials.cloudName)}/image/upload`, {
      method: 'POST',
      body: upload,
    });
    const json = await response.json().catch(() => ({})) as CloudinaryResource & { error?: { message?: string } };
    if (!response.ok || !json.secure_url) {
      return NextResponse.json({ error: json.error?.message || `Cloudinary upload error ${response.status}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true, asset: normalizeInspirationAsset(json), uploadedBy: session.email || 'admin' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo subir la imagen.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const credentials = await getCloudinaryCredentials({ preferDb: true });
  if (!credentials.ready) return NextResponse.json({ error: 'Cloudinary no está configurado' }, { status: 503 });

  try {
    const payload = await request.json() as InspirationMetadataPayload;
    if (!payload.public_id) return NextResponse.json({ error: 'Falta public_id' }, { status: 400 });

    const body = new URLSearchParams();
    body.set('context', contextString(payload));
    body.set('tags', tagString(payload));
    const authorization = Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64');
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(credentials.cloudName)}/resources/image/upload/${encodeURIComponent(payload.public_id)}`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${authorization}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );
    const json = await response.json().catch(() => ({})) as CloudinaryResource & { error?: { message?: string } };
    if (!response.ok) {
      return NextResponse.json({ error: json.error?.message || `Cloudinary metadata error ${response.status}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true, asset: json.secure_url ? normalizeInspirationAsset(json) : null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo actualizar la metadata.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const credentials = await getCloudinaryCredentials({ preferDb: true });
  if (!credentials.ready) return NextResponse.json({ error: 'Cloudinary no está configurado' }, { status: 503 });

  try {
    const publicId = cleanText(new URL(request.url).searchParams.get('public_id'), 300);
    if (!publicId) return NextResponse.json({ error: 'Falta public_id' }, { status: 400 });
    const timestamp = Math.floor(Date.now() / 1000);
    const params = { public_id: publicId, timestamp, invalidate: true };
    const body = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      invalidate: 'true',
      api_key: credentials.apiKey,
      signature: signParams(params, credentials.apiSecret),
    });
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(credentials.cloudName)}/image/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = await response.json().catch(() => ({})) as { result?: string; error?: { message?: string } };
    if (!response.ok || (json.result !== 'ok' && json.result !== 'not found')) {
      return NextResponse.json({ error: json.error?.message || 'No se pudo eliminar la imagen.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, result: json.result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo eliminar la imagen.' }, { status: 500 });
  }
}

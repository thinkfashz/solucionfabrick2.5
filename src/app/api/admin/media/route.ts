import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { insforge } from '@/lib/insforge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MEDIA_BUCKET = process.env.MEDIA_BUCKET || 'media';
const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml']);
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg']);
const ALLOWED_FOLDERS = new Set(['general', 'blog', 'home', 'banners', 'servicios', 'productos']);

function sanitizeFolder(input: string | null): string {
  const f = (input ?? 'general').toLowerCase().replace(/[^a-z0-9-]/g, '');
  return ALLOWED_FOLDERS.has(f) ? f : 'general';
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const url = new URL(request.url);
    const folder = url.searchParams.get('folder');
    const limitRaw = Number(url.searchParams.get('limit') ?? '100');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 200) : 100;

    const client = getAdminInsforge();
    let q = client.database.from('media_assets').select('*');
    if (folder) q = q.eq('folder', sanitizeFolder(folder));
    const { data, error } = await q.order('created_at', { ascending: false }).limit(limit);
    if (error) {
      return NextResponse.json(
        { error: error.message, code: 'DB_ERROR', hint: 'Crea la tabla media_assets en /admin/setup.' },
        { status: 500 },
      );
    }
    return NextResponse.json({ assets: data ?? [], bucket: MEDIA_BUCKET });
  } catch (err) {
    return adminError(err, 'MEDIA_LIST_FAILED');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const form = await request.formData();
    const file = form.get('file');
    const folder = sanitizeFolder(typeof form.get('folder') === 'string' ? (form.get('folder') as string) : 'general');
    const alt = typeof form.get('alt') === 'string' ? (form.get('alt') as string).trim() : '';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se recibió archivo.', code: 'VALIDATION' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'La imagen supera 8 MB.', code: 'TOO_LARGE' }, { status: 413 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: 'Formato no permitido. Usa JPG, PNG, GIF, WEBP, AVIF o SVG.', code: 'BAD_MIME' },
        { status: 415 },
      );
    }
    const rawExt = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';
    const ext = rawExt && ALLOWED_EXT.has(rawExt) ? rawExt : 'jpg';
    const safeBase = file.name
      .replace(/\.[^.]+$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .slice(0, 40) || 'img';
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}.${ext}`;

    const { error: uploadError } = await insforge.storage.from(MEDIA_BUCKET).upload(path, file);
    if (uploadError) {
      return NextResponse.json(
        { error: `Storage no disponible: ${uploadError.message}`, code: 'STORAGE_ERROR' },
        { status: 502 },
      );
    }
    const publicUrlResult = await insforge.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    const url =
      typeof publicUrlResult === 'string'
        ? publicUrlResult
        : (publicUrlResult as { data?: { publicUrl?: string }; publicUrl?: string })?.data?.publicUrl ??
          (publicUrlResult as { publicUrl?: string })?.publicUrl ??
          '';
    if (!url) {
      return NextResponse.json({ error: 'No se pudo obtener URL pública.', code: 'NO_URL' }, { status: 502 });
    }

    const client = getAdminInsforge();
    const row = {
      bucket: MEDIA_BUCKET,
      path,
      url,
      alt: alt || null,
      folder,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: session.email,
      created_at: new Date().toISOString(),
    };
    const { data: inserted, error: insertErr } = await client.database
      .from('media_assets')
      .insert([row])
      .select();
    if (insertErr) {
      // Asset is uploaded but registry failed — return URL anyway so the
      // caller doesn't lose the upload, but flag it.
      return NextResponse.json(
        { url, path, asset: null, warning: insertErr.message },
        { status: 200 },
      );
    }
    return NextResponse.json({ asset: Array.isArray(inserted) ? inserted[0] : inserted, url, path });
  } catch (err) {
    return adminError(err, 'MEDIA_UPLOAD_FAILED');
  }
}

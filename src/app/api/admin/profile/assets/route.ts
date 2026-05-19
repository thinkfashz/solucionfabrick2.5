import { NextRequest, NextResponse } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { safePublicId, uploadDataUrlToCloudinary } from '@/lib/cloudinaryUpload';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 4 * 1024 * 1024;
const FOLDER = 'media/admin-profile-assets';
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_KIND = new Set(['cover', 'id_card', 'gallery']);

type Metadata = {
  cover_url?: string | null;
  id_card_url?: string | null;
  gallery_images?: string[];
  [key: string]: unknown;
};

function asMetadata(value: unknown): Metadata {
  return value && typeof value === 'object' ? value as Metadata : {};
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const form = await request.formData();
    const file = form.get('file');
    const kind = String(form.get('kind') ?? 'gallery');

    if (!ALLOWED_KIND.has(kind)) {
      return NextResponse.json({ error: 'Tipo de imagen no permitido.', code: 'VALIDATION' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se recibió imagen.', code: 'VALIDATION' }, { status: 400 });
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: 'Formato no permitido. Usa JPG, PNG, WEBP o GIF.', code: 'VALIDATION' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'La imagen no puede superar 4 MB.', code: 'VALIDATION' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;
    const publicId = `${safePublicId(session.email)}-${kind}-${Date.now()}`;
    const uploaded = await uploadDataUrlToCloudinary({ dataUrl, folder: FOLDER, publicId });
    const url = uploaded.ready ? uploaded.url : dataUrl;

    const client = getAdminInsforge();
    const current = await client.database
      .from('admin_profiles')
      .select('metadata')
      .eq('email', session.email)
      .maybeSingle();

    const metadata = asMetadata((current.data as { metadata?: unknown } | null)?.metadata);
    const gallery = Array.isArray(metadata.gallery_images) ? metadata.gallery_images.filter((item): item is string => typeof item === 'string') : [];

    const nextMetadata: Metadata = {
      ...metadata,
      updated_from: 'admin_profile_assets',
      updated_at: new Date().toISOString(),
    };

    if (kind === 'cover') nextMetadata.cover_url = url;
    if (kind === 'id_card') nextMetadata.id_card_url = url;
    if (kind === 'gallery') nextMetadata.gallery_images = [url, ...gallery].slice(0, 12);

    const { error } = await client.database
      .from('admin_profiles')
      .upsert([{ email: session.email, metadata: nextMetadata }], { onConflict: 'email' });

    if (error) {
      return NextResponse.json({ error: 'No se pudo guardar el asset del perfil.', hint: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url, kind, storage: uploaded.ready ? 'cloudinary' : 'database', metadata: nextMetadata });
  } catch (err) {
    return adminError(err, 'PROFILE_ASSET_UPLOAD_FAILED');
  }
}

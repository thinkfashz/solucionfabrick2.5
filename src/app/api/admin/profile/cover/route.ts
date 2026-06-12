import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { safePublicId, uploadDataUrlToCloudinary } from '@/lib/cloudinaryUpload';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 5 * 1024 * 1024;
const COVER_FOLDER = 'media/admin-profile-covers';
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function metadataOf(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const form = await request.formData();
    const file = form.get('cover');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No se recibió imagen de portada.' }, { status: 400 });
    if (!ALLOWED_MIME.has(file.type)) return NextResponse.json({ error: 'Formato no permitido. Usa JPG, PNG, WEBP o GIF.' }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'La portada no puede superar 5 MB.' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const dataUrl = `data:${file.type};base64,${Buffer.from(bytes).toString('base64')}`;
    const publicId = `${safePublicId(session.email)}-cover`;
    const uploaded = await uploadDataUrlToCloudinary({ dataUrl, folder: COVER_FOLDER, publicId });
    const coverUrl = uploaded.ready ? uploaded.url : dataUrl;
    const client = getAdminInsforge();
    const current = await client.database.from('admin_profiles').select('metadata').eq('email', session.email).maybeSingle();
    const metadata = { ...metadataOf((current.data as { metadata?: unknown } | null)?.metadata), cover_url: coverUrl, cover_public_id: uploaded.ready ? uploaded.publicId ?? `${COVER_FOLDER}/${publicId}` : null, cover_storage: uploaded.ready ? 'cloudinary' : 'database_data_url', cover_warning: uploaded.ready ? null : uploaded.error };
    const { error } = await client.database.from('admin_profiles').upsert([{ email: session.email, metadata }], { onConflict: 'email' });
    if (error) return NextResponse.json({ error: 'No se pudo guardar portada.', hint: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, cover: coverUrl });
  } catch (err) {
    return adminError(err, 'PROFILE_COVER_POST_FAILED');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const client = getAdminInsforge();
    const current = await client.database.from('admin_profiles').select('metadata').eq('email', session.email).maybeSingle();
    const metadata = metadataOf((current.data as { metadata?: unknown } | null)?.metadata);
    delete metadata.cover_url;
    delete metadata.cover_public_id;
    delete metadata.cover_storage;
    delete metadata.cover_warning;
    await client.database.from('admin_profiles').update({ metadata }).eq('email', session.email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminError(err, 'PROFILE_COVER_DELETE_FAILED');
  }
}

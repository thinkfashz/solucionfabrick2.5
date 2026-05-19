import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { safePublicId, uploadDataUrlToCloudinary } from '@/lib/cloudinaryUpload';

export const dynamic = 'force-dynamic';

const SETTING_KEY = 'admin_profile_photo';
const MAX_SIZE = 3 * 1024 * 1024;
const AVATAR_FOLDER = 'media/admin-profiles';
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

async function getProfilePhoto(email: string) {
  const client = getAdminInsforge();
  const profile = await client.database
    .from('admin_profiles')
    .select('avatar_url')
    .eq('email', email)
    .maybeSingle();

  if (!profile.error) {
    const avatar = (profile.data as { avatar_url?: string | null } | null)?.avatar_url ?? null;
    if (avatar) return avatar;
  }

  const legacy = await client.database
    .from('admin_settings')
    .select('value')
    .eq('key', SETTING_KEY)
    .maybeSingle();

  if (!legacy.error) return (legacy.data as { value?: string } | null)?.value ?? null;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const photo = await getProfilePhoto(session.email);
    return NextResponse.json({ photo });
  } catch (err) {
    return adminError(err, 'PROFILE_PHOTO_GET_FAILED');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const form = await request.formData();
    const file = form.get('photo');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se recibió imagen.', code: 'VALIDATION' }, { status: 400 });
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: 'Formato no permitido. Usa JPG, PNG, WEBP o GIF.', code: 'VALIDATION' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'La imagen no puede superar 3 MB.', code: 'VALIDATION' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;
    const publicId = `${safePublicId(session.email)}-avatar`;
    const uploaded = await uploadDataUrlToCloudinary({
      dataUrl,
      folder: AVATAR_FOLDER,
      publicId,
    });

    const avatarUrl = uploaded.ready ? uploaded.url : dataUrl;
    const avatarPublicId = uploaded.ready ? uploaded.publicId ?? `${AVATAR_FOLDER}/${publicId}` : null;
    const client = getAdminInsforge();

    const { error } = await client.database
      .from('admin_profiles')
      .upsert([
        {
          email: session.email,
          avatar_url: avatarUrl,
          avatar_public_id: avatarPublicId,
          metadata: {
            avatar_storage: uploaded.ready ? 'cloudinary' : 'database_data_url',
            upload_warning: uploaded.ready ? null : uploaded.error,
          },
        },
      ], { onConflict: 'email' });

    if (error) {
      const legacy = await client.database
        .from('admin_settings')
        .upsert([{ key: SETTING_KEY, value: avatarUrl }], { onConflict: 'key' });

      if (legacy.error) {
        return NextResponse.json(
          { error: 'No se pudo guardar la foto. Ejecuta la migración de admin_profiles o admin_settings.', code: 'DB_ERROR', hint: legacy.error.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ ok: true, photo: avatarUrl, storage: uploaded.ready ? 'cloudinary' : 'database' });
  } catch (err) {
    return adminError(err, 'PROFILE_PHOTO_POST_FAILED');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const client = getAdminInsforge();
    await client.database.from('admin_profiles').update({ avatar_url: null, avatar_public_id: null }).eq('email', session.email);
    await client.database.from('admin_settings').delete().eq('key', SETTING_KEY);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminError(err, 'PROFILE_PHOTO_DELETE_FAILED');
  }
}

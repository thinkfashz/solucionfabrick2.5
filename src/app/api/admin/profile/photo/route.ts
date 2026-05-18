import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';

const SETTING_KEY = 'admin_profile_photo';
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('admin_settings')
      .select('value')
      .eq('key', SETTING_KEY)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ photo: null });
    }

    const photo = (data as { value?: string } | null)?.value ?? null;
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
      return NextResponse.json({ error: 'La imagen no puede superar 2 MB.', code: 'VALIDATION' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    const client = getAdminInsforge();

    // Upsert — create or replace the setting
    const { error } = await client.database
      .from('admin_settings')
      .upsert([{ key: SETTING_KEY, value: dataUrl }], { onConflict: 'key' });

    if (error) {
      // If table doesn't exist yet, return a clear hint
      return NextResponse.json(
        { error: 'No se pudo guardar la foto. Asegúrate de que la tabla admin_settings existe.', code: 'DB_ERROR', hint: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, photo: dataUrl });
  } catch (err) {
    return adminError(err, 'PROFILE_PHOTO_POST_FAILED');
  }
}

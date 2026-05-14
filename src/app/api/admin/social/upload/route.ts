import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, adminUnauthorized, getAdminInsforge } from '@/lib/adminApi';

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB per image

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  try {
    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se recibió archivo.' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen.' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'La imagen supera 8 MB.' }, { status: 413 });
    }

    const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
    const ALLOWED_MIME = new Set([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ]);
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: 'Formato no permitido. Usa JPG, PNG, GIF o WEBP.' }, { status: 415 });
    }
    const rawExt = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';
    const ext = rawExt && ALLOWED_EXT.has(rawExt) ? rawExt : 'jpg';
    const path = `social/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const client = getAdminInsforge();
    const { error: uploadError } = await client.storage
      .from('social-posts')
      .upload(path, file);

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage no disponible: ${uploadError.message}` },
        { status: 502 },
      );
    }

    const publicUrlResult = await client.storage
      .from('social-posts')
      .getPublicUrl(path);

    const publicUrl =
      typeof publicUrlResult === 'string'
        ? publicUrlResult
        : (publicUrlResult as { data?: { publicUrl?: string }; publicUrl?: string })?.data
            ?.publicUrl ??
          (publicUrlResult as { publicUrl?: string })?.publicUrl ??
          '';

    if (!publicUrl) {
      return NextResponse.json({ error: 'No se pudo obtener la URL pública.' }, { status: 502 });
    }

    return NextResponse.json({ url: publicUrl, path });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'Error interno al subir la imagen.' },
      { status: 500 },
    );
  }
}

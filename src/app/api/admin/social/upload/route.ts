import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

/**
 * POST /api/admin/social/upload
 *
 * Uploads a single image to the `social-posts` InsForge Storage bucket and
 * returns the public URL. The client calls this endpoint once per dropped
 * image (up to 10), so the response is intentionally minimal.
 */

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB per image

export async function POST(request: NextRequest) {
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

    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const path = `social/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await insforge.storage
      .from('social-posts')
      .upload(path, file);

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage no disponible: ${uploadError.message}` },
        { status: 502 },
      );
    }

    const publicUrlResult = await insforge.storage
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

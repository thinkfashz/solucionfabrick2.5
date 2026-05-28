import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url') || '';

  if (!target || !isSafeHttpUrl(target)) {
    return NextResponse.json({ error: 'URL de imagen inválida' }, { status: 400 });
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile Safari/605.1.15',
      },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: `No se pudo descargar la imagen: HTTP ${upstream.status}` }, { status: upstream.status });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'La URL no devolvió una imagen válida' }, { status: 415 });
    }

    // Stream directly instead of buffering — avoids the 6 MB response body
    // limit and prevents timeouts on large photos from Insforge/Cloudinary.
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'No se pudo cargar la imagen' }, { status: 500 });
  }
}

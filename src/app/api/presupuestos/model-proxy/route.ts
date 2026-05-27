import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_HOSTS = ['insforge.app', 'cloudinary.com'];
const MAX_BYTES = 90 * 1024 * 1024;

function isAllowedModelUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:') return false;
    return ALLOWED_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function contentTypeFor(url: string, upstreamType: string | null) {
  if (upstreamType && !upstreamType.includes('text/html')) return upstreamType;
  const path = url.split('?')[0].toLowerCase();
  if (path.endsWith('.glb')) return 'model/gltf-binary';
  if (path.endsWith('.gltf')) return 'model/gltf+json';
  if (path.endsWith('.bin')) return 'application/octet-stream';
  return 'application/octet-stream';
}

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get('url') || '';
  if (!target) {
    return NextResponse.json({ error: 'Falta parámetro url.' }, { status: 400 });
  }

  if (!isAllowedModelUrl(target)) {
    return NextResponse.json({ error: 'URL no permitida para el proxy de modelos.' }, { status: 400 });
  }

  try {
    const upstream = await fetch(target, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'model/gltf-binary,model/gltf+json,application/octet-stream,*/*',
      },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: `El archivo remoto respondió HTTP ${upstream.status}.` }, { status: upstream.status });
    }

    const lengthHeader = upstream.headers.get('content-length');
    const size = lengthHeader ? Number(lengthHeader) : 0;
    if (size && size > MAX_BYTES) {
      return NextResponse.json({ error: 'El modelo supera el tamaño máximo permitido por el proxy.' }, { status: 413 });
    }

    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'El modelo supera el tamaño máximo permitido por el proxy.' }, { status: 413 });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentTypeFor(target, upstream.headers.get('content-type')),
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'Access-Control-Allow-Origin': '*',
        'X-Model-Proxy': 'soluciones-fabris',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: `No se pudo descargar el modelo remoto: ${(error as Error).message}` }, { status: 502 });
  }
}

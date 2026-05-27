import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
// Edge runtime supports true streaming — avoids the 4.5 MB serverless body limit
// that would kill large GLB files buffered with arrayBuffer().
export const runtime = 'edge';

const ALLOWED_HOSTS = ['insforge.app', 'cloudinary.com'];
const MAX_DECLARED_BYTES = 150 * 1024 * 1024; // reject only if Content-Length says > 150 MB

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
  // Prefer extension-derived types; ignore generic/binary upstream types
  const isGeneric = !upstreamType || upstreamType.includes('text/html') || upstreamType.includes('octet-stream');
  if (!isGeneric) return upstreamType;
  const path = url.split('?')[0].toLowerCase();
  if (path.endsWith('.glb')) return 'model/gltf-binary';
  if (path.endsWith('.gltf')) return 'model/gltf+json';
  if (path.endsWith('.dae')) return 'model/vnd.collada+xml';
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
      headers: {
        Accept: 'model/gltf-binary,model/gltf+json,application/octet-stream,*/*',
      },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `El archivo remoto respondió HTTP ${upstream.status}.` },
        { status: upstream.status },
      );
    }

    const lengthHeader = upstream.headers.get('content-length');
    if (lengthHeader) {
      const declared = Number(lengthHeader);
      if (declared > MAX_DECLARED_BYTES) {
        return NextResponse.json(
          { error: 'El modelo supera el tamaño máximo permitido por el proxy (150 MB).' },
          { status: 413 },
        );
      }
    }

    const contentType = contentTypeFor(target, upstream.headers.get('content-type'));
    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'Access-Control-Allow-Origin': '*',
      'X-Model-Proxy': 'soluciones-fabris',
    };
    if (lengthHeader) responseHeaders['Content-Length'] = lengthHeader;

    // Pass the ReadableStream directly — no arrayBuffer() buffering.
    // The Edge runtime pipes bytes straight to the client, bypassing size limits.
    return new NextResponse(upstream.body, { status: 200, headers: responseHeaders });
  } catch (error) {
    return NextResponse.json(
      { error: `No se pudo descargar el modelo remoto: ${(error as Error).message}` },
      { status: 502 },
    );
  }
}

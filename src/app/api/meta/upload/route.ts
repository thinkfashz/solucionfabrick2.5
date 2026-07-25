import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { META_GRAPH_URL, normalizeAdAccountId } from '@/lib/meta';
import { getMetaCredentials } from '@/lib/metaCredentials';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_BYTES = 12 * 1024 * 1024;

function cleanName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) || `meta-${Date.now()}.jpg`;
}

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = cookie ? await decodeSession(cookie) : null;
  if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const credentials = await getMetaCredentials();
  const accessToken = credentials?.accessToken;
  const adAccountId = normalizeAdAccountId(credentials?.adAccountId);
  if (!accessToken || !adAccountId) return NextResponse.json({ error: 'Meta no está configurado.' }, { status: 503 });

  try {
    const contentType = request.headers.get('content-type') || '';
    let bytes: ArrayBuffer;
    let mimeType = 'image/jpeg';
    let fileName = `meta-${Date.now()}.jpg`;

    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({})) as { imageUrl?: string; fileName?: string };
      const imageUrl = String(body.imageUrl || '').trim();
      if (!/^https:\/\//i.test(imageUrl)) return NextResponse.json({ error: 'La URL de imagen no es válida.' }, { status: 400 });
      const remote = await fetch(imageUrl, { cache: 'no-store' });
      if (!remote.ok) return NextResponse.json({ error: `No se pudo descargar la imagen (${remote.status}).` }, { status: 502 });
      mimeType = (remote.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
      if (!ALLOWED_TYPES.has(mimeType)) return NextResponse.json({ error: 'El formato remoto no es compatible con Meta.' }, { status: 415 });
      bytes = await remote.arrayBuffer();
      if (bytes.byteLength > MAX_BYTES) return NextResponse.json({ error: 'La imagen supera 12 MB.' }, { status: 413 });
      fileName = cleanName(String(body.fileName || imageUrl.split('/').pop() || `meta-${Date.now()}.jpg`));
    } else {
      const formData = await request.formData();
      const imageFile = formData.get('image');
      if (!(imageFile instanceof File)) return NextResponse.json({ error: 'No se recibió imagen.' }, { status: 400 });
      if (imageFile.size > MAX_BYTES) return NextResponse.json({ error: 'La imagen supera 12 MB.' }, { status: 413 });
      mimeType = imageFile.type || 'image/jpeg';
      if (!ALLOWED_TYPES.has(mimeType)) return NextResponse.json({ error: 'Usa JPG, PNG, WEBP o AVIF.' }, { status: 415 });
      bytes = await imageFile.arrayBuffer();
      fileName = cleanName(imageFile.name || `meta-${Date.now()}.jpg`);
    }

    const storageName = `meta-ads/${Date.now()}-${fileName}`;
    const blob = new Blob([bytes], { type: mimeType });
    const { error: storageError } = await insforge.storage.from('publicidad').upload(storageName, blob);
    if (storageError) console.warn('InsForge storage upload warning:', storageError.message);

    const metaFormData = new FormData();
    metaFormData.append('source', new Blob([bytes], { type: mimeType }), fileName);
    metaFormData.append('access_token', accessToken);

    const metaRes = await fetch(`${META_GRAPH_URL}/act_${adAccountId}/adimages`, { method: 'POST', body: metaFormData });
    const metaJson = await metaRes.json().catch(() => ({}));
    if (!metaRes.ok || metaJson.error) return NextResponse.json({ error: metaJson.error?.message || `Meta API error ${metaRes.status}` }, { status: 502 });

    const images = metaJson.images as Record<string, { hash: string; url: string }> | undefined;
    const imageData = images ? Object.values(images)[0] : null;
    if (!imageData?.hash) return NextResponse.json({ error: 'Meta no retornó un hash de imagen.' }, { status: 502 });

    return NextResponse.json({ hash: imageData.hash, url: imageData.url });
  } catch (error) {
    console.error('Meta upload error:', error);
    return NextResponse.json({ error: 'Error interno al subir la imagen.' }, { status: 500 });
  }
}

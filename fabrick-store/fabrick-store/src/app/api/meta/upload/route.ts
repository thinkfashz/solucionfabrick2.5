import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

const META_API_VERSION = 'v20.0';
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;
const META_UPLOAD_SECRET_HEADER = 'x-meta-upload-secret';

function isAuthorizedRequest(request: NextRequest, expectedSecret: string) {
  const providedSecret = request.headers.get(META_UPLOAD_SECRET_HEADER);

  if (!providedSecret) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedSecret, 'utf8');
  const providedBuffer = Buffer.from(providedSecret, 'utf8');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function POST(request: NextRequest) {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;
  const uploadSecret = process.env.META_UPLOAD_SHARED_SECRET;

  if (!accessToken || !adAccountId) {
    return NextResponse.json(
      { error: 'Variables de entorno META_ACCESS_TOKEN o META_AD_ACCOUNT_ID no configuradas.' },
      { status: 503 }
    );
  }

  if (!uploadSecret) {
    return NextResponse.json(
      { error: 'Variable de entorno META_UPLOAD_SHARED_SECRET no configurada.' },
      { status: 503 }
    );
  }

  if (!isAuthorizedRequest(request, uploadSecret)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: 'No se recibió imagen.' }, { status: 400 });
    }

    // Upload to InsForge Storage
    const fileName = `meta-ads/${Date.now()}-${imageFile.name}`;
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Wrap buffer in a Blob for InsForge storage SDK
    const blob = new Blob([buffer], { type: imageFile.type });
    const { error: storageError } = await insforge.storage
      .from('publicidad')
      .upload(fileName, blob);

    if (storageError) {
      // Non-fatal: continue uploading to Meta even if InsForge storage fails
      console.warn('InsForge storage upload warning:', storageError.message);
    }

    // Upload to Meta Ad Images endpoint
    const metaFormData = new FormData();
    metaFormData.append(
      'source',
      new Blob([buffer], { type: imageFile.type }),
      imageFile.name
    );
    metaFormData.append('access_token', accessToken);

    const metaRes = await fetch(
      `${META_GRAPH_URL}/act_${adAccountId}/adimages`,
      { method: 'POST', body: metaFormData }
    );
    const metaJson = await metaRes.json();

    if (!metaRes.ok || metaJson.error) {
      const msg = metaJson.error?.message ?? `Meta API error ${metaRes.status}`;
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    // Meta returns { images: { <filename>: { hash, url, ... } } }
    const images = metaJson.images as unknown;

    if (!images || typeof images !== 'object' || Array.isArray(images)) {
      return NextResponse.json(
        { error: 'Meta no retornó datos de imagen válidos.' },
        { status: 502 }
      );
    }

    const imageEntries = Object.values(images as Record<string, { hash?: string; url?: string }>);
    const imageData = imageEntries[0];

    if (!imageData?.hash) {
      return NextResponse.json({ error: 'Meta no retornó un hash de imagen.' }, { status: 502 });
    }

    return NextResponse.json({ hash: imageData.hash, url: imageData.url });
  } catch (err: unknown) {
    console.error('Meta upload error:', err);
    return NextResponse.json(
      { error: 'Error interno al subir la imagen.' },
      { status: 500 }
    );
  }
}

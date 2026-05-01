import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { publishCmsEvent } from '@/lib/cmsBus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml']);

/** Read Cloudinary credentials from the integrations table. */
async function getCloudinaryCredentials(): Promise<{
  cloud_name: string;
  api_key: string;
  api_secret: string;
} | null> {
  try {
    const client = getAdminInsforge();
    const { data } = await client.database
      .from('integrations')
      .select('credentials')
      .eq('provider', 'cloudinary')
      .limit(1);
    if (!Array.isArray(data) || data.length === 0) return null;
    const creds = (data[0] as { credentials?: Record<string, string> }).credentials ?? {};
    const { cloud_name, api_key, api_secret } = creds;
    if (!cloud_name || !api_key || !api_secret) return null;
    return { cloud_name, api_key, api_secret };
  } catch {
    return null;
  }
}

/** Generate a Cloudinary API signature for signed uploads. */
async function generateSignature(
  params: Record<string, string>,
  apiSecret: string,
): Promise<string> {
  // Sort keys and build the string to sign
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const toSign = sorted + apiSecret;

  // Use Web Crypto API (available in Node.js runtime)
  const encoder = new TextEncoder();
  const data = encoder.encode(toSign);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** List images from Cloudinary using the Admin API. */
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const creds = await getCloudinaryCredentials();
    if (!creds) {
      return NextResponse.json(
        { error: 'Cloudinary no configurado. Ve a Configuración > Integraciones para añadir tus credenciales.', code: 'NOT_CONFIGURED' },
        { status: 503 },
      );
    }

    const url = new URL(request.url);
    const folder = url.searchParams.get('folder') ?? '';
    const maxResults = Math.min(Number(url.searchParams.get('max_results') ?? '50'), 100);
    const nextCursor = url.searchParams.get('next_cursor') ?? '';

    // Build Cloudinary Admin API URL
    const apiUrl = new URL(`https://api.cloudinary.com/v1_1/${encodeURIComponent(creds.cloud_name)}/resources/image`);
    apiUrl.searchParams.set('max_results', String(maxResults));
    if (folder) apiUrl.searchParams.set('prefix', folder);
    if (nextCursor) apiUrl.searchParams.set('next_cursor', nextCursor);

    const basicAuth = btoa(`${creds.api_key}:${creds.api_secret}`);
    const res = await fetch(apiUrl.toString(), {
      headers: { Authorization: `Basic ${basicAuth}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Cloudinary API error: ${res.status} ${body}`, code: 'CLOUDINARY_ERROR' },
        { status: 502 },
      );
    }

    const json = await res.json() as {
      resources?: Array<{ public_id: string; secure_url: string; format: string; bytes: number; created_at: string; width: number; height: number }>;
      next_cursor?: string;
    };

    const assets = (json.resources ?? []).map((r) => ({
      id: r.public_id,
      public_id: r.public_id,
      url: r.secure_url,
      format: r.format,
      size_bytes: r.bytes,
      created_at: r.created_at,
      width: r.width,
      height: r.height,
      source: 'cloudinary' as const,
    }));

    return NextResponse.json({ assets, next_cursor: json.next_cursor ?? null, source: 'cloudinary' });
  } catch (err) {
    return adminError(err, 'CLOUDINARY_LIST_FAILED');
  }
}

/** Upload an image to Cloudinary via signed upload API. */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const creds = await getCloudinaryCredentials();
    if (!creds) {
      return NextResponse.json(
        { error: 'Cloudinary no configurado. Ve a Configuración > Integraciones para añadir tus credenciales.', code: 'NOT_CONFIGURED' },
        { status: 503 },
      );
    }

    const form = await request.formData();
    const file = form.get('file');
    const folder = String(form.get('folder') ?? 'fabrick').replace(/[^a-zA-Z0-9_/-]/g, '').slice(0, 80) || 'fabrick';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se recibió archivo.', code: 'VALIDATION' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'La imagen supera 10 MB.', code: 'TOO_LARGE' }, { status: 413 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: 'Formato no permitido. Usa JPG, PNG, GIF, WEBP, AVIF o SVG.', code: 'BAD_MIME' },
        { status: 415 },
      );
    }

    // Build signed upload parameters
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signParams: Record<string, string> = { folder, timestamp };
    const signature = await generateSignature(signParams, creds.api_secret);

    // Post to Cloudinary Upload API
    const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(creds.cloud_name)}/image/upload`;
    const uploadForm = new FormData();
    uploadForm.append('file', file);
    uploadForm.append('folder', folder);
    uploadForm.append('timestamp', timestamp);
    uploadForm.append('api_key', creds.api_key);
    uploadForm.append('signature', signature);

    const uploadRes = await fetch(uploadUrl, { method: 'POST', body: uploadForm });
    if (!uploadRes.ok) {
      const body = await uploadRes.text().catch(() => '');
      return NextResponse.json(
        { error: `Cloudinary upload error: ${uploadRes.status} ${body}`, code: 'CLOUDINARY_UPLOAD_ERROR' },
        { status: 502 },
      );
    }

    const uploaded = await uploadRes.json() as {
      public_id: string;
      secure_url: string;
      format: string;
      bytes: number;
      created_at: string;
      width: number;
      height: number;
    };

    publishCmsEvent({ topic: 'media', action: 'upload' });

    return NextResponse.json({
      asset: {
        id: uploaded.public_id,
        public_id: uploaded.public_id,
        url: uploaded.secure_url,
        format: uploaded.format,
        size_bytes: uploaded.bytes,
        created_at: uploaded.created_at,
        width: uploaded.width,
        height: uploaded.height,
        source: 'cloudinary' as const,
      },
      url: uploaded.secure_url,
      source: 'cloudinary',
    });
  } catch (err) {
    return adminError(err, 'CLOUDINARY_UPLOAD_FAILED');
  }
}

/** Delete an image from Cloudinary. */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const creds = await getCloudinaryCredentials();
    if (!creds) {
      return NextResponse.json({ error: 'Cloudinary no configurado.', code: 'NOT_CONFIGURED' }, { status: 503 });
    }

    const url = new URL(request.url);
    const publicId = url.searchParams.get('public_id') ?? '';
    if (!publicId) {
      return NextResponse.json({ error: 'Falta public_id.', code: 'VALIDATION' }, { status: 400 });
    }

    const timestamp = String(Math.floor(Date.now() / 1000));
    const signParams: Record<string, string> = { public_id: publicId, timestamp };
    const signature = await generateSignature(signParams, creds.api_secret);

    const deleteUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(creds.cloud_name)}/image/destroy`;
    const deleteForm = new FormData();
    deleteForm.append('public_id', publicId);
    deleteForm.append('timestamp', timestamp);
    deleteForm.append('api_key', creds.api_key);
    deleteForm.append('signature', signature);

    const delRes = await fetch(deleteUrl, { method: 'POST', body: deleteForm });
    if (!delRes.ok) {
      const body = await delRes.text().catch(() => '');
      return NextResponse.json(
        { error: `Cloudinary delete error: ${delRes.status} ${body}`, code: 'CLOUDINARY_DELETE_ERROR' },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminError(err, 'CLOUDINARY_DELETE_FAILED');
  }
}

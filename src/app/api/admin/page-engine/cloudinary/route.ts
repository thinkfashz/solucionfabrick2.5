import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';
import { decryptCredentials } from '@/lib/integrationsCrypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return null;
  return decodeSession(cookie.value);
}

function sign(params: Record<string, string | number>, secret: string) {
  const sorted = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join('&');
  return crypto.createHash('sha1').update(sorted + secret).digest('hex');
}

function envValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return '';
}

async function cloudinaryCredentials() {
  const env = {
    cloudName: envValue('CLOUDINARY_CLOUD_NAME', 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME'),
    apiKey: envValue('CLOUDINARY_API_KEY'),
    apiSecret: envValue('CLOUDINARY_API_SECRET'),
    source: 'env' as const,
  };
  if (env.cloudName && env.apiKey && env.apiSecret) return env;

  try {
    const { data } = await insforgeAdmin.database
      .from('integrations')
      .select('credentials')
      .eq('provider', 'cloudinary')
      .limit(1)
      .maybeSingle();
    const creds = decryptCredentials((data as { credentials?: Record<string, unknown> } | null)?.credentials);
    const db = {
      cloudName: String(creds.cloud_name || creds.cloudName || '').trim(),
      apiKey: String(creds.api_key || creds.apiKey || '').trim(),
      apiSecret: String(creds.api_secret || creds.apiSecret || '').trim(),
      source: 'database' as const,
    };
    return {
      cloudName: env.cloudName || db.cloudName,
      apiKey: env.apiKey || db.apiKey,
      apiSecret: env.apiSecret || db.apiSecret,
      source: env.cloudName || env.apiKey || env.apiSecret ? 'mixed' as const : db.source,
    };
  } catch {
    return env;
  }
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const creds = await cloudinaryCredentials();
  return NextResponse.json({ ok: Boolean(creds.cloudName && creds.apiKey && creds.apiSecret), configured: Boolean(creds.cloudName && creds.apiKey && creds.apiSecret), source: creds.source, cloud_name: creds.cloudName ? `•••${creds.cloudName.slice(-4)}` : '' });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });

  const { cloudName, apiKey, apiSecret, source } = await cloudinaryCredentials();
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary no está configurado. Agrega credenciales en Vercel o en Admin → Integraciones → Cloudinary.', source }, { status: 500 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const folder = String(form?.get('folder') || 'soluciones-fabrick/page-engine');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Debes enviar un archivo en el campo file.' }, { status: 400 });

  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder, timestamp };
  const signature = sign(params, apiSecret);
  const upload = new FormData();
  upload.set('file', file);
  upload.set('api_key', apiKey);
  upload.set('timestamp', String(timestamp));
  upload.set('folder', folder);
  upload.set('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body: upload, cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ error: 'No se pudo subir a Cloudinary.', detail: json, source }, { status: 502 });
  return NextResponse.json({ ok: true, source, url: json.secure_url, public_id: json.public_id, resource_type: json.resource_type, width: json.width, height: json.height });
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { getCloudinaryCredentials } from '@/lib/cloudinaryCredentials';
import { recordCredentialAudit } from '@/lib/adminCredentialAudit';

export const dynamic = 'force-dynamic';

function basicAuth(key: string, secret: string) {
  return Buffer.from(`${key}:${secret}`).toString('base64');
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'test' });
  if (!auth.ok) return auth.response;

  let preferDb = true;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.preferDb === 'boolean') preferDb = body.preferDb;
  } catch {}

  const creds = await getCloudinaryCredentials({ preferDb });
  await recordCredentialAudit({ provider: 'cloudinary', action: 'test', actor: auth.session.email, request, details: { source: creds.source, ready: creds.ready } });

  if (!creds.ready) {
    return NextResponse.json({
      ok: false,
      error: `Faltan campos de Cloudinary: ${creds.missing.join(', ')}`,
      source: creds.source,
      encryptedAtRest: creds.encryptedAtRest,
    }, { status: 400 });
  }

  const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(creds.cloudName)}/usage`, {
    headers: { Authorization: `Basic ${basicAuth(creds.apiKey, creds.apiSecret)}` },
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const upstream = json?.error?.message ?? json?.message ?? `Cloudinary rechazó la prueba HTTP ${res.status}`;
    return NextResponse.json({ ok: false, error: upstream, source: creds.source }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    source: creds.source,
    encryptedAtRest: creds.encryptedAtRest,
    cloudName: creds.cloudName,
    plan: json?.plan ?? null,
    credits: json?.credits ?? null,
  });
}

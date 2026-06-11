import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { getMetaCredentials } from '@/lib/metaCredentials';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function mask(value?: string) {
  if (!value) return null;
  const raw = value.replace(/^act_/, '');
  if (raw.length <= 6) return '••••';
  return `${value.startsWith('act_') ? 'act_' : ''}${raw.slice(0, 3)}••••${raw.slice(-3)}`;
}

async function pingMeta(token?: string) {
  if (!token) return { ok: false, message: 'Sin token' };
  try {
    const url = new URL('https://graph.facebook.com/v20.0/me');
    url.searchParams.set('fields', 'id,name');
    url.searchParams.set('access_token', token);
    const res = await fetch(url.toString(), { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: json?.error?.message || 'Token rechazado por Meta' };
    return { ok: true, message: json?.name ? `Conectado como ${json.name}` : 'Token válido' };
  } catch {
    return { ok: false, message: 'No se pudo consultar Meta ahora' };
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const creds = await getMetaCredentials();
    const ping = await pingMeta(creds?.accessToken);
    const connected = Boolean(creds?.accessToken && creds?.adAccountId && ping.ok);
    return NextResponse.json({
      ok: true,
      provider: 'meta',
      connected,
      accessToken: { present: Boolean(creds?.accessToken), source: creds?.sources.accessToken ?? null, healthy: ping.ok, message: ping.message },
      adAccount: { present: Boolean(creds?.adAccountId), source: creds?.sources.adAccountId ?? null, masked: mask(creds?.adAccountId) },
      facebookPage: { present: Boolean(creds?.facebookPageId), source: creds?.sources.facebookPageId ?? null, masked: mask(creds?.facebookPageId) },
      instagramBusiness: { present: Boolean(creds?.instagramBusinessId), source: creds?.sources.instagramBusinessId ?? null, masked: mask(creds?.instagramBusinessId) },
      directLinks: {
        publicidad: '/admin/publicidad',
        coach: '/admin/publicidad/coach',
        integraciones: '/admin/configuracion',
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return adminError(err, 'ADMIN_ADS_STATUS_FAILED', 500, request);
  }
}

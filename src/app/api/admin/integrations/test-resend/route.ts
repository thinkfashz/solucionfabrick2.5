import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { getResendCredentials } from '@/lib/resendCredentials';
import { recordCredentialAudit } from '@/lib/adminCredentialAudit';

export const dynamic = 'force-dynamic';

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return { error: NextResponse.json({ error: 'No autenticado.' }, { status: 401 }) };
  const payload = await decodeSession(cookie);
  if (!payload) return { error: NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 }) };
  if (payload.rol === 'viewer') return { error: NextResponse.json({ error: 'Modo demo: acción no permitida.' }, { status: 403 }) };
  return { payload };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  let to = auth.payload?.email ?? '';
  let preferDb = true;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.to === 'string' && body.to.includes('@')) to = body.to.trim();
    if (typeof body.preferDb === 'boolean') preferDb = body.preferDb;
  } catch {}

  const creds = await getResendCredentials({ preferDb });
  await recordCredentialAudit({ provider: 'resend', action: 'test', actor: auth.payload?.email, request, details: { source: creds.source, ready: creds.ready } });

  if (!creds.ready) {
    return NextResponse.json({
      ok: false,
      error: `Faltan campos de Resend: ${creds.missing.join(', ')}`,
      source: creds.source,
      encryptedAtRest: creds.encryptedAtRest,
    }, { status: 400 });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: creds.from,
      to,
      subject: 'Soluciones Fabrick · prueba de Resend',
      html: '<p>Prueba exitosa de credenciales Resend guardadas en Integraciones.</p>',
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: json?.message ?? `Resend rechazó la prueba HTTP ${res.status}`, source: creds.source }, { status: 502 });
  }

  await recordCredentialAudit({ provider: 'resend', action: 'send', actor: auth.payload?.email, request, details: { source: creds.source, to } });
  return NextResponse.json({ ok: true, source: creds.source, encryptedAtRest: creds.encryptedAtRest, id: json?.id ?? null });
}

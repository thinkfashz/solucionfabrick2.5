import { NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { ADMIN_COOKIE_NAME, encodeSession, getClientIp } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const DEMO_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export async function POST(request: Request) {
  let token: string;
  try {
    const body = await request.json();
    token = (body.token ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  if (!token) return NextResponse.json({ error: 'Token requerido.' }, { status: 400 });

  const clientIp = getClientIp(request);
  const userAgent = request.headers.get('user-agent') ?? 'unknown';

  const { data: rows, error } = await insforgeAdmin.database
    .from('demo_tokens')
    .select('id, token, expira_at, accesos, locked_ip, locked_at')
    .eq('token', token)
    .gt('expira_at', new Date().toISOString())
    .limit(1);

  if (error) {
    if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
      return NextResponse.json({ error: 'Sistema de demo no configurado.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Error al validar token.' }, { status: 500 });
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'Link de demo inválido o expirado.' }, { status: 400 });
  }

  const row = rows[0] as {
    id: string;
    token: string;
    expira_at: string;
    accesos: number;
    locked_ip: string | null;
    locked_at: string | null;
  };

  // IP lock enforcement: once a device claims the link, only that IP can use it
  if (row.locked_ip && row.locked_ip !== clientIp) {
    return NextResponse.json(
      { error: 'Este link de demo ya está en uso desde otro dispositivo.' },
      { status: 403 },
    );
  }

  // Session expires at the earlier of: now + 24h  OR  token's own expiry
  const tokenExpMs = new Date(row.expira_at).getTime();
  const sessionExpMs = Math.min(Date.now() + DEMO_SESSION_TTL_MS, tokenExpMs);

  const sessionToken = await encodeSession({
    email: 'demo@preview',
    rol: 'viewer',
    exp: sessionExpMs,
  });

  // Lock IP on first access + track access count (best effort)
  const updatePayload: Record<string, unknown> = {
    accesos: (row.accesos ?? 0) + 1,
    ultimo_acceso: new Date().toISOString(),
    ultimo_ip: clientIp,
    ultimo_user_agent: userAgent,
  };
  if (!row.locked_ip) {
    updatePayload.locked_ip = clientIp;
    updatePayload.locked_at = new Date().toISOString();
  }
  await insforgeAdmin.database
    .from('demo_tokens')
    .update(updatePayload)
    .eq('id', row.id);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Math.floor((sessionExpMs - Date.now()) / 1000),
    path: '/',
  });

  return response;
}

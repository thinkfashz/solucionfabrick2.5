import { NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { ADMIN_COOKIE_NAME, encodeSession } from '@/lib/adminAuth';

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

  const { data: rows, error } = await insforgeAdmin.database
    .from('demo_tokens')
    .select('id, token, expira_at, accesos')
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

  const row = rows[0] as { id: string; token: string; expira_at: string; accesos: number };

  // Session expires at the earlier of: now + 24h  OR  token's own expiry
  const tokenExpMs = new Date(row.expira_at).getTime();
  const sessionExpMs = Math.min(Date.now() + DEMO_SESSION_TTL_MS, tokenExpMs);

  const sessionToken = await encodeSession({
    email: 'demo@preview',
    rol: 'viewer',
    exp: sessionExpMs,
  });

  // Track access count (best effort)
  await insforgeAdmin.database
    .from('demo_tokens')
    .update({ accesos: (row.accesos ?? 0) + 1, ultimo_acceso: new Date().toISOString() })
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

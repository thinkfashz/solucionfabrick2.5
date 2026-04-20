import { NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';
import {
  isRateLimited,
  recordFailedAttempt,
  clearFailedAttempts,
  blockedSecondsRemaining,
  encodeSession,
  getClientIp,
  ADMIN_COOKIE_NAME,
  SESSION_TTL_MS,
} from '@/lib/adminAuth';

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (isRateLimited(ip)) {
    const remaining = blockedSecondsRemaining(ip);
    return NextResponse.json(
      { error: `Demasiados intentos fallidos. Intenta nuevamente en ${remaining} segundos.` },
      { status: 429 }
    );
  }

  let email: string;
  let password: string;
  try {
    const body = await request.json();
    email = (body.email ?? '').trim().toLowerCase();
    password = body.password ?? '';
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña son requeridos.' }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';

  const insforge = createClient({ baseUrl, anonKey });

  const { data: authData, error: authError } = await insforge.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData) {
    recordFailedAttempt(ip);
    return NextResponse.json(
      { error: 'Credenciales incorrectas.' },
      { status: 401 }
    );
  }

  const { data: adminRows, error: dbError } = await insforge.database
    .from('admin_users')
    .select('email')
    .eq('email', email)
    .limit(1);

  if (dbError || !adminRows || adminRows.length === 0) {
    recordFailedAttempt(ip);
    return NextResponse.json(
      { error: 'Acceso denegado. Este usuario no tiene permisos de administrador.' },
      { status: 403 }
    );
  }

  clearFailedAttempts(ip);

  const exp = Date.now() + SESSION_TTL_MS;
  const sessionValue = await encodeSession({ email, exp });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });

  return response;
}

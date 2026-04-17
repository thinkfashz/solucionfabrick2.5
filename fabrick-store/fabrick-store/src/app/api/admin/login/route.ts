import { NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';
import {
  isRateLimited,
  recordFailedAttempt,
  clearFailedAttempts,
  blockedSecondsRemaining,
  encodeSession,
  ADMIN_COOKIE_NAME,
  SESSION_TTL_MS,
} from '@/lib/adminAuth';

/** Resolve client IP from common proxy headers or socket. */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // ── Rate limiting ────────────────────────────────────────────
  if (isRateLimited(ip)) {
    const remaining = blockedSecondsRemaining(ip);
    return NextResponse.json(
      { error: `Demasiados intentos fallidos. Intenta nuevamente en ${remaining} segundos.` },
      { status: 429 }
    );
  }

  // ── Parse body ───────────────────────────────────────────────
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

  // ── InsForge authentication ──────────────────────────────────
  const insforge = createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
  });

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

  // ── admin_users table check ──────────────────────────────────
  const { data: adminRows, error: dbError } = await insforge.database
    .from('admin_users')
    .select('email')
    .eq('email', email)
    .limit(1);

  if (dbError || !adminRows || adminRows.length === 0) {
    // User authenticated with InsForge but is not an admin
    recordFailedAttempt(ip);
    return NextResponse.json(
      { error: 'Acceso denegado. Este usuario no tiene permisos de administrador.' },
      { status: 403 }
    );
  }

  // ── Success: issue session cookie ────────────────────────────
  clearFailedAttempts(ip);

  const exp = Date.now() + SESSION_TTL_MS;
  const sessionValue = encodeSession({ email, exp });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin',
    maxAge: SESSION_TTL_MS / 1000,
  });

  return response;
}

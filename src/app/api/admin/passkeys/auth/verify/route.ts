import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/browser';
import { insforgeAdmin } from '@/lib/insforge';
import {
  getClientIp,
  isRateLimited,
  recordFailedAttempt,
  clearFailedAttempts,
  blockedSecondsRemaining,
  ADMIN_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from '@/lib/adminAuth';
import {
  getRpId,
  getOrigin,
  CHALLENGE_COOKIE_NAME,
  CLEAR_CHALLENGE_OPTIONS,
  verifyChallengeCookie,
  getPasskeyById,
  updatePasskeyCounter,
  createPasskeySession,
} from '@/lib/adminPasskeys';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

type AdminRow = { rol?: string; aprobado?: boolean };

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  if (await isRateLimited(ip)) {
    const remaining = await blockedSecondsRemaining(ip);
    return NextResponse.json({ error: `Demasiados intentos. Intenta en ${remaining} segundos.` }, { status: 429 });
  }

  const fail = async (message: string, status = 401) => {
    await recordFailedAttempt(ip);
    return NextResponse.json({ error: message }, { status });
  };

  try {
    const challengeCookie = request.cookies.get(CHALLENGE_COOKIE_NAME)?.value;
    if (!challengeCookie) return fail('Sesión expirada. Intenta nuevamente.', 400);

    const challenge = await verifyChallengeCookie(challengeCookie);
    if (!challenge || challenge.type !== 'authenticate') return fail('Challenge inválido o expirado.', 400);

    const body = (await request.json()) as AuthenticationResponseJSON;
    const stored = await getPasskeyById(body.id);
    if (!stored) return fail('Passkey no reconocida.');

    if (challenge.email && challenge.email.toLowerCase() !== stored.user_email.toLowerCase()) {
      return fail('La passkey no corresponde al usuario solicitado.', 403);
    }

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge.ch,
      expectedOrigin: getOrigin(request),
      expectedRPID: [getRpId(request)],
      credential: {
        id: stored.id,
        publicKey: new Uint8Array(Buffer.from(stored.public_key, 'base64url')),
        counter: stored.counter,
        transports: (stored.transports ?? []) as Parameters<typeof verifyAuthenticationResponse>[0]['credential']['transports'],
      },
      requireUserVerification: true,
    });

    if (!verification.verified) return fail('Autenticación biométrica fallida.');

    await updatePasskeyCounter(stored.id, verification.authenticationInfo.newCounter);

    const tenantId = stored.tenant_id ?? DEFAULT_TENANT_ID;
    const { data: rows, error } = await insforgeAdmin.database
      .from('admin_users')
      .select('rol, aprobado')
      .eq('email', stored.user_email)
      .eq('tenant_id', tenantId)
      .limit(1);

    if (error) return fail('No se pudo validar el usuario administrador.', 500);
    const admin = rows?.[0] as AdminRow | undefined;
    if (!admin) return fail('Usuario no autorizado.', 403);
    if (admin.aprobado === false) return fail('Tu cuenta está pendiente de aprobación.', 403);

    const rol = (admin.rol ?? 'admin') as 'superadmin' | 'admin' | 'viewer';
    const sessionValue = await createPasskeySession(stored.user_email, rol, tenantId);
    await clearFailedAttempts(ip);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, sessionValue, SESSION_COOKIE_OPTIONS);
    response.cookies.set('tenant_status', 'active', SESSION_COOKIE_OPTIONS);
    response.cookies.set(CHALLENGE_COOKIE_NAME, '', CLEAR_CHALLENGE_OPTIONS);
    return response;
  } catch (err) {
    console.error('[passkeys/auth/verify]', err);
    await recordFailedAttempt(ip);
    return NextResponse.json({ error: 'Error interno al verificar la passkey.' }, { status: 500 });
  }
}

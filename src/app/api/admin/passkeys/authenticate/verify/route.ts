import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/browser';
import { insforgeAdmin } from '@/lib/insforge';
import {
  ADMIN_COOKIE_NAME,
  CHALLENGE_COOKIE_NAME,
  CLEAR_CHALLENGE_OPTIONS,
  SESSION_COOKIE_OPTIONS,
  createPasskeySession,
  getOrigin,
  getPasskeyById,
  getRpId,
  updatePasskeyCounter,
  verifyChallengeCookie,
} from '@/lib/adminPasskeys';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const challengeCookie = request.cookies.get(CHALLENGE_COOKIE_NAME)?.value;
    if (!challengeCookie) {
      return NextResponse.json({ error: 'Reto biométrico expirado. Intenta nuevamente.' }, { status: 400 });
    }

    const challenge = await verifyChallengeCookie(challengeCookie);
    if (!challenge || challenge.type !== 'authenticate') {
      return NextResponse.json({ error: 'Reto biométrico inválido o expirado.' }, { status: 400 });
    }

    const body = (await request.json()) as AuthenticationResponseJSON;
    const stored = await getPasskeyById(body.id);
    if (!stored) {
      return NextResponse.json({ error: 'Dispositivo no registrado.' }, { status: 401 });
    }

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge.ch,
      expectedOrigin: getOrigin(request),
      expectedRPID: getRpId(request),
      credential: {
        id: stored.id,
        publicKey: Buffer.from(stored.public_key, 'base64url'),
        counter: stored.counter,
        transports: (stored.transports ?? undefined) as AuthenticatorTransport[],
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return NextResponse.json({ error: 'Verificación biométrica fallida.' }, { status: 401 });
    }

    const { data: adminRows, error: adminError } = await insforgeAdmin.database
      .from('admin_users')
      .select('email, rol, aprobado, tenant_id')
      .eq('email', stored.user_email)
      .eq('tenant_id', stored.tenant_id)
      .limit(1);

    if (adminError || !adminRows || adminRows.length === 0) {
      return NextResponse.json({ error: 'Usuario administrador no encontrado.' }, { status: 403 });
    }

    const admin = adminRows[0] as { email: string; rol?: string; aprobado?: boolean; tenant_id?: string };
    if (admin.aprobado === false) {
      return NextResponse.json({ error: 'Tu cuenta está pendiente de aprobación.' }, { status: 403 });
    }

    const rol = (admin.rol ?? 'admin') as 'superadmin' | 'admin' | 'viewer';
    const tenantId = admin.tenant_id ?? stored.tenant_id;
    const sessionValue = await createPasskeySession(admin.email, rol, tenantId);

    await updatePasskeyCounter(stored.id, verification.authenticationInfo.newCounter);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, sessionValue, SESSION_COOKIE_OPTIONS);
    response.cookies.set(CHALLENGE_COOKIE_NAME, '', CLEAR_CHALLENGE_OPTIONS);
    return response;
  } catch (err) {
    console.error('[passkeys/authenticate/verify]', err);
    return NextResponse.json(
      { error: 'No se pudo verificar la huella o Face ID.' },
      { status: 500 },
    );
  }
}

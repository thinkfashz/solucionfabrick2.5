/**
 * POST /api/admin/passkeys/register/options
 *
 * Generates WebAuthn registration options for an already-authenticated admin.
 * Sets a short-lived `pk_challenge` cookie (HMAC-signed, 2 min TTL) so the
 * verify endpoint can check it without any server-side storage.
 *
 * Auth: requires valid admin_session cookie.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { getAdminTenantId } from '@/lib/adminApi';
import { requireAdminPermission } from '@/lib/adminPermissions';
import {
  getRpId,
  getOrigin,
  RP_NAME,
  CHALLENGE_COOKIE_NAME,
  CHALLENGE_COOKIE_OPTIONS,
  signChallengeCookie,
  getPasskeysForUser,
} from '@/lib/adminPasskeys';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminPermission(request, { resource: 'passkeys', action: 'create' });
    if (!auth.ok) return auth.response;
    const tenantId = await getAdminTenantId(request);
    const { email } = auth.session;

    const rpID = getRpId(request);
    getOrigin(request); // validate origin is resolvable

    const existing = await getPasskeysForUser(email, tenantId);
    const excludeCredentials = existing.map((c) => ({
      id: c.id,
      transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
    }));

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userName: email,
      userDisplayName: email,
      userID: Buffer.from(email, 'utf-8'),
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'required',
      },
      excludeCredentials,
      timeout: 60000,
    });

    const cookie = await signChallengeCookie({
      ch: options.challenge,
      type: 'register',
      email,
      exp: Date.now() + 2 * 60 * 1000,
    });

    const response = NextResponse.json(options);
    response.cookies.set(CHALLENGE_COOKIE_NAME, cookie, CHALLENGE_COOKIE_OPTIONS);
    return response;
  } catch (err) {
    console.error('[passkeys/register/options]', err);
    return NextResponse.json(
      { error: 'No se pudo generar las opciones de registro.' },
      { status: 500 },
    );
  }
}

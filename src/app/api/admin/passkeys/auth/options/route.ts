/**
 * POST /api/admin/passkeys/auth/options
 *
 * Generates WebAuthn authentication options. Called BEFORE the user is
 * authenticated (this is the passkey-login flow, not post-login).
 *
 * Body: { email?: string }
 *  - With email: returns allowCredentials for that user's registered passkeys.
 *  - Without email: returns empty allowCredentials (discoverable-credential flow).
 *
 * Sets a `pk_challenge` cookie (2-min TTL, HMAC-signed).
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import {
  getRpId,
  getOrigin,
  CHALLENGE_COOKIE_NAME,
  CHALLENGE_COOKIE_OPTIONS,
  signChallengeCookie,
  getPasskeysForUser,
} from '@/lib/adminPasskeys';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { email?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    const rpID = getRpId(request);
    getOrigin(request); // validate resolvable

    let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] = [];

    if (email) {
      // Look up registered passkeys for this email.
      // We use the default tenant for now; multi-tenant support can be added
      // by deriving tenantId from the subdomain header here.
      const tenantId = request.headers.get('x-tenant-id') ?? DEFAULT_TENANT_ID;
      const passkeys = await getPasskeysForUser(email, tenantId);
      if (passkeys.length === 0) {
        return NextResponse.json(
          { error: 'No hay passkeys registradas para este usuario.' },
          { status: 404 },
        );
      }
      allowCredentials = passkeys.map((p) => ({
        id: p.id,
        transports: (p.transports ?? []) as AuthenticatorTransportFuture[],
      }));
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'required',
      timeout: 60000,
    });

    const cookie = await signChallengeCookie({
      ch: options.challenge,
      type: 'authenticate',
      email: email || undefined,
      exp: Date.now() + 2 * 60 * 1000,
    });

    const response = NextResponse.json(options);
    response.cookies.set(CHALLENGE_COOKIE_NAME, cookie, CHALLENGE_COOKIE_OPTIONS);
    return response;
  } catch (err) {
    console.error('[passkeys/auth/options]', err);
    return NextResponse.json({ error: 'No se pudo iniciar la autenticación.' }, { status: 500 });
  }
}

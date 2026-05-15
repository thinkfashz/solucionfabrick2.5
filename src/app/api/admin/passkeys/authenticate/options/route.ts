import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import {
  CHALLENGE_COOKIE_NAME,
  CHALLENGE_COOKIE_OPTIONS,
  RP_NAME,
  getRpId,
  signChallengeCookie,
} from '@/lib/adminPasskeys';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const rpID = getRpId(request);
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'required',
      timeout: 60000,
    });

    const cookie = await signChallengeCookie({
      ch: options.challenge,
      type: 'authenticate',
      exp: Date.now() + 2 * 60 * 1000,
    });

    const response = NextResponse.json({ ...options, rpName: RP_NAME });
    response.cookies.set(CHALLENGE_COOKIE_NAME, cookie, CHALLENGE_COOKIE_OPTIONS);
    return response;
  } catch (err) {
    console.error('[passkeys/authenticate/options]', err);
    return NextResponse.json(
      { error: 'No se pudo generar el reto biométrico.' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/passkeys/register/verify
 *
 * Verifies the WebAuthn attestation (registration) response from the browser,
 * then stores the new credential in admin_passkeys.
 *
 * Auth: requires valid admin_session + pk_challenge cookies.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/browser';
import { getAdminTenantId } from '@/lib/adminApi';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { recordAdminAudit, recordAdminFailure } from '@/lib/adminAudit';
import {
  getRpId,
  getOrigin,
  CHALLENGE_COOKIE_NAME,
  CLEAR_CHALLENGE_OPTIONS,
  verifyChallengeCookie,
  savePasskey,
} from '@/lib/adminPasskeys';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'passkeys', action: 'create' });
  if (!auth.ok) return auth.response;
  const session = auth.session;

  try {
    const challengeCookie = request.cookies.get(CHALLENGE_COOKIE_NAME)?.value;
    if (!challengeCookie) {
      await recordAdminFailure({ session, request, action: 'create', resource: 'passkeys', metadata: { reason: 'missing_challenge_cookie' } });
      return NextResponse.json({ error: 'Sesión de registro expirada. Intenta nuevamente.' }, { status: 400 });
    }
    const challenge = await verifyChallengeCookie(challengeCookie);
    if (!challenge || challenge.type !== 'register' || challenge.email !== session.email) {
      await recordAdminFailure({ session, request, action: 'create', resource: 'passkeys', metadata: { reason: 'invalid_challenge' } });
      return NextResponse.json({ error: 'Challenge inválido o expirado.' }, { status: 400 });
    }

    const tenantId = await getAdminTenantId(request);
    const body = (await request.json()) as RegistrationResponseJSON;

    const rpID = getRpId(request);
    const origin = getOrigin(request);

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challenge.ch,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      await recordAdminFailure({ session, request, action: 'create', resource: 'passkeys', metadata: { reason: 'webauthn_not_verified', rpID, origin } });
      return NextResponse.json({ error: 'Verificación de passkey fallida.' }, { status: 400 });
    }

    const { credential, aaguid, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const autoName = generateDeviceName(aaguid);

    await savePasskey({
      id: credential.id,
      user_email: session.email,
      tenant_id: tenantId,
      public_key: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      device_type: credentialDeviceType,
      backed_up: credentialBackedUp,
      transports: (credential.transports ?? null) as string[] | null,
      aaguid: aaguid ?? null,
      name: autoName ?? null,
      created_at: new Date().toISOString(),
    });

    await recordAdminAudit({
      session,
      request,
      action: 'create',
      resource: 'passkeys',
      resourceId: credential.id,
      metadata: {
        name: autoName,
        tenantId,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: credential.transports ?? [],
        aaguid: aaguid ?? null,
      },
    });

    const response = NextResponse.json({
      ok: true,
      passkey: {
        id: credential.id,
        name: autoName,
        created_at: new Date().toISOString(),
      },
    });
    response.cookies.set(CHALLENGE_COOKIE_NAME, '', CLEAR_CHALLENGE_OPTIONS);
    return response;
  } catch (err) {
    console.error('[passkeys/register/verify]', err);
    await recordAdminFailure({ session, request, action: 'create', resource: 'passkeys', metadata: { reason: 'unexpected_error', error: err instanceof Error ? err.message : String(err) } });
    return NextResponse.json({ error: 'Error al guardar la passkey.' }, { status: 500 });
  }
}

function generateDeviceName(aaguid: string | undefined): string {
  const known: Record<string, string> = {
    'adce0002-35bc-c60a-648b-0b25f1f05503': 'Chrome en Windows',
    'de503f97-9dfa-4975-af6d-f81b8c15e0a9': 'Chrome en Android',
    'b84e4048-15dc-4dd0-8640-f4f60813c8af': 'Edge en Windows',
    '08987058-cadc-4b81-b6e1-30de50dcbe96': 'Windows Hello',
    'f8a011f3-8c0a-4d15-8006-17111f9edc7d': 'Security Key by Yubico',
    'ee882879-721c-4913-9775-3dfcce97072a': 'YubiKey 5 Series',
    'd8522d9f-575b-4866-88a9-ba99fa02f35b': 'Safari en Mac/iOS',
    'bada5566-a7aa-401f-bd96-45619a55120d': 'iCloud Keychain',
  };
  if (aaguid && known[aaguid]) return known[aaguid];
  return 'Passkey';
}

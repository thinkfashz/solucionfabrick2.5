import { NextResponse, type NextRequest } from 'next/server';
import { getInsforgeUserFromRequest } from '@/lib/insforgeAuth';
import { getCustomerAccountBundle, saveCustomerAccount } from '@/lib/customerData';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;
const MAX_BODY_BYTES = 32 * 1024;

function mapError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || 'Error de cuenta');
  if (message === 'CONSENT_REQUIRED') return NextResponse.json({ error: 'Debes aceptar los Términos y la Política de Privacidad para guardar datos en tu cuenta.', code: 'CONSENT_REQUIRED' }, { status: 428, headers: NO_STORE });
  if (message.startsWith('CUSTOMER_SCHEMA_NOT_READY:')) return NextResponse.json({ error: 'La base privada de clientes todavía no está preparada.', code: 'SCHEMA_NOT_READY' }, { status: 503, headers: NO_STORE });
  if (message === 'CUSTOMER_EMAIL_REQUIRED') return NextResponse.json({ error: 'Tu sesión no contiene un correo válido.', code: 'EMAIL_REQUIRED' }, { status: 422, headers: NO_STORE });
  return NextResponse.json({ error: 'No se pudieron guardar tus datos privados.' }, { status: 500, headers: NO_STORE });
}

export async function GET(request: NextRequest) {
  const user = await getInsforgeUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401, headers: NO_STORE });
  try {
    const bundle = await getCustomerAccountBundle(user.id, user.email);
    return NextResponse.json(bundle, { headers: NO_STORE });
  } catch (error) {
    return mapError(error);
  }
}

export async function PUT(request: NextRequest) {
  const user = await getInsforgeUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401, headers: NO_STORE });
  try {
    const declaredLength = Number(request.headers.get('content-length') || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413, headers: NO_STORE });
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413, headers: NO_STORE });
    const body = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    const profile = body.profile && typeof body.profile === 'object' ? body.profile as Record<string, unknown> : {};
    const address = body.address && typeof body.address === 'object' ? body.address as Record<string, unknown> : {};
    const consent = body.consent && typeof body.consent === 'object' ? body.consent as Record<string, unknown> : {};

    const bundle = await saveCustomerAccount(user.id, user.email, {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      avatarUrl: profile.avatarUrl,
      address: address.address,
      commune: address.commune,
      region: address.region,
      postalCode: address.postalCode,
      deliveryNotes: address.deliveryNotes,
      acceptTerms: consent.acceptTerms === true,
      marketingEmail: consent.marketingEmail === true,
      marketingWhatsapp: consent.marketingWhatsapp === true,
      source: typeof consent.source === 'string' ? consent.source : 'account',
    });
    return NextResponse.json({ ok: true, ...bundle }, { headers: NO_STORE });
  } catch (error) {
    return mapError(error);
  }
}

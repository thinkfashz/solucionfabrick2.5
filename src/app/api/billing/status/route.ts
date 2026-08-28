import { NextResponse } from 'next/server';
import { getBillingDriverResolved } from '@/lib/billing/provider';
import { resolveBillingCredentials } from '@/lib/billing/credentials';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const [driver, credentials] = await Promise.all([
    getBillingDriverResolved(),
    resolveBillingCredentials(),
  ]);
  const configured = driver.code !== 'mock';
  return NextResponse.json({
    ok: true,
    provider: driver.code,
    provider_name: driver.name,
    configured,
    simulated: !configured,
    source: credentials.source,
    encrypted_at_rest: credentials.encryptedAtRest,
    missing: credentials.missing,
    fields: {
      api_key_set: Boolean(credentials.apiKey),
      rut_emisor_set: Boolean(credentials.rutEmisor),
      razon_social_set: Boolean(credentials.razonSocial),
      giro_set: Boolean(credentials.giro),
      direccion_set: Boolean(credentials.direccion),
      comuna_set: Boolean(credentials.comuna),
    },
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

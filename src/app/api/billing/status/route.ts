import { NextResponse } from 'next/server';
import { getBillingDriver } from '@/lib/billing/provider';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/billing/status
 *
 * Surfaces which billing provider is active so the admin and checkout can
 * show "modo simulado" badges when running on the mock driver. Mirrors the
 * `/api/payments/mp-status` pattern: cheap, no third-party calls, used by
 * client components to feature-flag UI.
 */
export async function GET() {
  const driver = getBillingDriver();
  const provider = driver.code;
  return NextResponse.json(
    {
      ok: true,
      provider,
      provider_name: driver.name,
      configured: provider !== 'mock',
      simulated: provider === 'mock',
      env: {
        BILLING_PROVIDER: process.env.BILLING_PROVIDER ?? null,
        rut_emisor_set: Boolean(process.env.BILLING_RUT_EMISOR),
        api_key_set: Boolean(process.env.BILLING_API_KEY),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

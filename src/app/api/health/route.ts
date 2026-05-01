import { NextResponse } from 'next/server';

/**
 * Public uptime/health endpoint for external monitoring (Better Uptime,
 * UptimeRobot, Checkly, etc.). Intentionally lightweight — does NOT call
 * downstream services synchronously to keep latency low even when InsForge
 * or Mercado Pago are slow.
 *
 * - 200 OK + `{ok:true}` when the Next.js process is healthy.
 *
 * For deeper checks (DB reachability, MP probe), see `/api/admin/health`
 * and `/api/payments/mp-status`. Those should NOT be the target of a
 * 1-minute uptime monitor: they hit third parties and burn rate limits.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const insforgeConfigured = Boolean(
      process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_URL,
    );
    const mpConfigured = Boolean(
      process.env.MP_ACCESS_TOKEN ||
        process.env.MERCADO_PAGO_ACCESS_TOKEN ||
        process.env.MERCADOPAGO_ACCESS_TOKEN,
    );
    const pushConfigured = Boolean(
      (process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) &&
        process.env.VAPID_PRIVATE_KEY,
    );

    return NextResponse.json(
      {
        ok: true,
        timestamp: new Date().toISOString(),
        service: 'fabrick-store',
        version: process.env.npm_package_version ?? '0.0.0',
        uptime_seconds: Math.round(process.uptime()),
        checks: {
          insforge_configured: insforgeConfigured,
          mercadopago_configured: mpConfigured,
          push_configured: pushConfigured,
        },
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      },
    );
  } catch (err) {
    console.error('[health] unexpected error:', err);
    return NextResponse.json(
      {
        ok: false,
        timestamp: new Date().toISOString(),
        service: 'fabrick-store',
        checks: {},
      },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      },
    );
  }
}

export async function HEAD() {
  return new Response(null, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

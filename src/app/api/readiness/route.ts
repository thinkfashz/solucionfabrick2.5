import { NextResponse } from 'next/server';
import { getMissingAdminEnvVars, insforgeAdmin } from '@/lib/insforge';
import { probeMercadoPago } from '@/lib/mercadopago';
import { getMercadoPagoCredentials } from '@/lib/mercadoPagoCredentials';
import { getBillingDriverResolved } from '@/lib/billing/provider';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function probeTable(table: string) {
  const started = Date.now();
  try {
    const { error } = await insforgeAdmin.database.from(table).select('id').limit(1);
    return { ok: !error, latencyMs: Date.now() - started, error: error ? 'query_failed' : null };
  } catch {
    return { ok: false, latencyMs: Date.now() - started, error: 'unavailable' };
  }
}

function configured(...keys: string[]) {
  return keys.some((key) => Boolean(process.env[key]?.trim()));
}

export async function GET() {
  const timestamp = new Date().toISOString();
  const missingAdmin = getMissingAdminEnvVars();

  const [products, orders, reservations, mp, mpCredentials, billing] = await Promise.all([
    probeTable('products'),
    probeTable('orders'),
    probeTable('inventory_reservations'),
    probeMercadoPago().catch(() => ({ status: 'unreachable' as const, reachable: false, mode: 'unknown' as const, latencyMs: null, message: 'probe_failed', hasAccessToken: false, publicKey: '', tokenPrefix: '' })),
    getMercadoPagoCredentials().catch(() => ({ sources: {} as Record<'accessToken' | 'publicKey' | 'webhookSecret', 'env' | 'db' | undefined> })),
    getBillingDriverResolved().catch(() => null),
  ]);

  const mpWebhookReady = Boolean('webhookSecret' in mpCredentials && mpCredentials.webhookSecret);
  const trackingReady = configured('ORDER_TRACKING_SECRET', 'NEXTAUTH_SECRET', 'PAYMENTS_WEBHOOK_SECRET');
  const cloudinaryReady = configured('CLOUDINARY_CLOUD_NAME', 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
  const genericWebhookReady = configured('PAYMENTS_WEBHOOK_SECRET');
  const billingReal = Boolean(billing && billing.code !== 'mock');

  const critical = {
    admin_config: missingAdmin.length === 0,
    database: products.ok && orders.ok,
    reservations: reservations.ok,
    mercado_pago: mp.status === 'ok',
    mercado_pago_webhook: mpWebhookReady,
    order_tracking_signing: trackingReady,
  };
  const ready = Object.values(critical).every(Boolean);

  return NextResponse.json({
    ok: ready,
    status: ready ? 'ready' : 'not_ready',
    timestamp,
    checks: {
      critical,
      database: { products, orders, inventory_reservations: reservations },
      mercado_pago: {
        status: mp.status,
        reachable: mp.reachable,
        mode: mp.mode,
        latencyMs: mp.latencyMs,
        webhookConfigured: mpWebhookReady,
      },
      dte: {
        status: billingReal ? 'configured' : 'blocked_external',
        provider: billing?.code || 'unavailable',
        customerDocumentWhenBlocked: 'comprobante de compra',
      },
      cloudinary: { configured: cloudinaryReady },
      legacy_webhook: { configured: genericWebhookReady, failClosedInProduction: true },
    },
    missing: {
      admin: missingAdmin,
      dte: billingReal ? [] : ['Credenciales reales del proveedor DTE (Haulmer/SII)'],
      mercadoPagoWebhook: mpWebhookReady ? [] : ['MERCADO_PAGO_WEBHOOK_SECRET / credencial webhook en Integraciones'],
      tracking: trackingReady ? [] : ['ORDER_TRACKING_SECRET (o NEXTAUTH_SECRET/PAYMENTS_WEBHOOK_SECRET)'],
    },
  }, {
    status: ready ? 200 : 503,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

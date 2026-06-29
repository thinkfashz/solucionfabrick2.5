import { NextResponse } from 'next/server';

export { POST } from '@/app/api/payments/webhook/route';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json({
    ok: true,
    provider: 'mercado_pago',
    route: '/api/webhooks/mercadopago',
    method: 'POST',
    status: 'active',
    message: 'Webhook Mercado Pago activo. Usa esta URL en Mercado Pago Developers para eventos de pagos.',
  });
}

import { NextResponse } from 'next/server';
import { parseOrderTrackingToken } from '@/lib/orderTracking';
import { reconcileMercadoPagoPayment } from '@/lib/orders/paymentReconciliation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function paymentIdFromUrl(url: URL) {
  return url.searchParams.get('payment_id') || url.searchParams.get('collection_id') || url.searchParams.get('id') || '';
}

async function parseBody(request: Request) {
  if (request.method === 'GET') return {} as Record<string, unknown>;
  try { return await request.json() as Record<string, unknown>; } catch { return {}; }
}

async function handle(request: Request) {
  const url = new URL(request.url);
  const body = await parseBody(request);
  const token = String(body.token || url.searchParams.get('token') || '');
  const parsed = parseOrderTrackingToken(token);
  if (!parsed) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });

  const paymentId = String(body.payment_id || body.collection_id || paymentIdFromUrl(url) || '');
  if (!paymentId) return NextResponse.json({ error: 'Falta payment_id o collection_id para verificar Mercado Pago.' }, { status: 400 });

  const result = await reconcileMercadoPagoPayment(paymentId, parsed.orderId, 'tracking-return');
  return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

export async function GET(request: Request) {
  try { return await handle(request); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo confirmar el pago.' }, { status: 500 }); }
}

export async function POST(request: Request) {
  try { return await handle(request); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo confirmar el pago.' }, { status: 500 }); }
}

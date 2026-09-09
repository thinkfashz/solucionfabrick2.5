import { NextRequest, NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { deriveCheckoutCustomerState } from '@/lib/orders/checkoutStatus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('orderId')?.trim() || '';
  if (!orderId || orderId.length > 100) return NextResponse.json({ error: 'orderId inválido.' }, { status: 400 });

  const { data, error } = await insforgeAdmin.database
    .from('orders')
    .select('id,status,payment_status,payment_id,total,tax,shipping_fee,updated_at,created_at,stock_reservation_expires_at,customer_email,items')
    .eq('id', orderId)
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const order = Array.isArray(data) ? data[0] : null;
  if (!order) return NextResponse.json({ error: 'Orden no encontrada.' }, { status: 404 });

  const derived = deriveCheckoutCustomerState({
    status: order.status,
    paymentStatus: order.payment_status,
    createdAt: order.created_at,
    reservationExpiresAt: order.stock_reservation_expires_at,
  });

  return NextResponse.json({
    ok: true,
    orderId,
    status: derived.status,
    paymentStatus: derived.paymentStatus,
    paymentId: order.payment_id || null,
    total: Number(order.total || 0),
    iva: Number(order.tax || 0),
    despacho: Number(order.shipping_fee || 0),
    updatedAt: order.updated_at || order.created_at,
    reservationExpiresAt: new Date(derived.expiresAt).toISOString(),
    terminal: derived.terminal,
    stale: derived.stale,
    reviewRequired: derived.reviewRequired,
    state: derived.state,
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

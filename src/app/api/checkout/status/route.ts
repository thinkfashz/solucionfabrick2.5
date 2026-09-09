import { NextRequest, NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const APPROVED = new Set(['pagada', 'en_preparacion', 'preparacion', 'preparación', 'enviado', 'entregado', 'confirmada', 'confirmado']);
const FAILED = new Set(['fallida', 'cancelada', 'cancelled']);
const REFUNDED = new Set(['reembolsada', 'refunded']);
const REVIEW = new Set(['payment_review_required', 'revision_pago', 'revisión_pago']);
const RESERVATION_TTL_FALLBACK_MS = 15 * 60 * 1000;

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

  const status = String(order.status || 'pendiente_pago').toLowerCase();
  const paymentStatus = String(order.payment_status || 'pending').toLowerCase();
  const reviewRequired = REVIEW.has(status);

  // Revenue P0 invariant: Mercado Pago saying "approved" is not enough to tell
  // the customer the order is confirmed. The order only becomes approved after
  // reconciliation validates amount/currency/merchant AND commits stock, which
  // moves it to one of the approved fulfillment states above.
  const approved = !reviewRequired && APPROVED.has(status);
  const failed = !reviewRequired && (paymentStatus === 'rejected' || paymentStatus === 'cancelled' || FAILED.has(status));
  const refunded = !reviewRequired && (paymentStatus === 'refunded' || REFUNDED.has(status));
  const terminal = approved || failed || refunded || reviewRequired;

  const createdAt = new Date(String(order.created_at || Date.now())).getTime();
  const explicitExpiry = order.stock_reservation_expires_at ? new Date(String(order.stock_reservation_expires_at)).getTime() : Number.NaN;
  const expiresAt = Number.isFinite(explicitExpiry) ? explicitExpiry : createdAt + RESERVATION_TTL_FALLBACK_MS;
  const stale = !terminal && Date.now() > expiresAt;

  return NextResponse.json({
    ok: true,
    orderId,
    status,
    paymentStatus,
    paymentId: order.payment_id || null,
    total: Number(order.total || 0),
    iva: Number(order.tax || 0),
    despacho: Number(order.shipping_fee || 0),
    updatedAt: order.updated_at || order.created_at,
    reservationExpiresAt: new Date(expiresAt).toISOString(),
    terminal,
    stale,
    reviewRequired,
    state: reviewRequired ? 'review' : approved ? 'approved' : refunded ? 'refunded' : failed ? 'failed' : stale ? 'abandoned' : 'pending',
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

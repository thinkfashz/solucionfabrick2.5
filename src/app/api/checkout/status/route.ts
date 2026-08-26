import { NextRequest, NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TERMINAL = new Set(['pagada', 'fallida', 'reembolsada', 'cancelada', 'cancelled']);

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('orderId')?.trim() || '';
  if (!orderId || orderId.length > 100) return NextResponse.json({ error: 'orderId inválido.' }, { status: 400 });

  const { data, error } = await insforgeAdmin.database
    .from('orders')
    .select('id,status,payment_status,payment_id,total,tax,shipping_fee,updated_at,created_at,customer_email,items')
    .eq('id', orderId)
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const order = Array.isArray(data) ? data[0] : null;
  if (!order) return NextResponse.json({ error: 'Orden no encontrada.' }, { status: 404 });

  const status = String(order.status || 'pendiente_pago');
  const paymentStatus = String(order.payment_status || 'pending');
  const createdAt = new Date(String(order.created_at || Date.now())).getTime();
  const elapsedMs = Math.max(0, Date.now() - createdAt);
  const stale = !TERMINAL.has(status) && elapsedMs > 8 * 60 * 1000;

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
    terminal: TERMINAL.has(status),
    stale,
    state: status === 'pagada' ? 'approved' : status === 'fallida' || status === 'cancelada' || status === 'cancelled' ? 'failed' : status === 'reembolsada' ? 'refunded' : stale ? 'abandoned' : 'pending',
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { parseOrderTrackingToken } from '@/lib/orderTracking';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function publicStatus(status?: string | null) {
  const value = String(status || 'pendiente').toLowerCase();
  if (['pagada', 'confirmado', 'confirmada'].includes(value)) return 'Pago confirmado';
  if (['preparacion', 'preparación', 'preparando'].includes(value)) return 'En preparación';
  if (['despachada', 'en_ruta', 'envio', 'envío'].includes(value)) return 'En camino';
  if (['entregada', 'delivered', 'entrega_confirmada'].includes(value)) return 'Entregado';
  if (['fallida', 'cancelado', 'cancelada', 'rechazada'].includes(value)) return 'Pago no aprobado';
  if (value.includes('transferencia')) return 'Pendiente de validación';
  return 'Pendiente de pago';
}

function isClosed(status?: string | null) {
  return ['entregada', 'delivered', 'entrega_confirmada'].includes(String(status || '').toLowerCase());
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  const parsed = parseOrderTrackingToken(token);
  if (!parsed) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });

  const { data, error } = await insforge.database.from('orders').select('*').eq('id', parsed.orderId).limit(1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });

  const closed = isClosed(row.status);
  return NextResponse.json({
    id: row.id,
    status: row.status,
    publicStatus: publicStatus(row.status),
    closed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customer_name,
    region: row.region,
    shippingAddress: closed ? null : row.shipping_address,
    items: row.items,
    summary: {
      subtotal: row.subtotal,
      iva: row.tax,
      despacho: row.shipping_fee,
      total: row.total,
      moneda: row.currency || 'CLP',
    },
    deliveryEstimate: '7 a 21 días hábiles',
    message: closed ? 'El seguimiento público fue cerrado porque la entrega ya fue confirmada. El registro de compra queda guardado en administración.' : 'Seguimiento activo.',
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

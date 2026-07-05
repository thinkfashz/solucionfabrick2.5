import { NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { parseOrderTrackingToken } from '@/lib/orderTracking';
import { normalizeDispatchCode, resolveDispatchCode } from '@/lib/orders/dispatchCode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type LoadResult = { row?: Record<string, unknown>; error?: string; status: number };

function publicStatus(status?: string | null) {
  const value = String(status || 'pendiente').toLowerCase();
  if (['pagada', 'confirmado', 'confirmada'].includes(value)) return 'Pago confirmado';
  if (['en_preparacion', 'preparacion', 'preparación', 'preparando'].includes(value)) return 'En preparación';
  if (['enviado', 'despachada', 'en_ruta', 'envio', 'envío'].includes(value)) return 'En camino';
  if (['entregado', 'entregada', 'delivered', 'entrega_confirmada'].includes(value)) return 'Entregado';
  if (['fallida', 'cancelado', 'cancelada', 'rechazada'].includes(value)) return 'Pedido cancelado';
  if (value.includes('transferencia')) return 'Pendiente de validación';
  return 'Pendiente de pago';
}

function isClosed(status?: string | null) {
  return ['entregado', 'entregada', 'delivered', 'entrega_confirmada'].includes(String(status || '').toLowerCase());
}

function statusMessage(status?: string | null, dispatchCode?: string) {
  const value = String(status || '').toLowerCase();
  const code = dispatchCode ? ` Código de despacho: ${dispatchCode}.` : '';
  if (['en_preparacion', 'preparacion', 'preparación', 'preparando'].includes(value)) return `Pago confirmado. Tu pedido ya está en preparación.${code}`;
  if (['enviado', 'despachada', 'en_ruta', 'envio', 'envío'].includes(value)) return `Tu pedido está en camino.${code}`;
  if (['entregado', 'entregada', 'delivered', 'entrega_confirmada'].includes(value)) return `Tu pedido fue entregado correctamente.${code}`;
  if (['fallida', 'cancelado', 'cancelada', 'rechazada'].includes(value)) return 'El pedido fue cancelado o el pago no fue aprobado.';
  if (['pagada', 'confirmado', 'confirmada'].includes(value)) return `Pago confirmado. El pedido será preparado pronto.${code}`;
  return 'Seguimiento activo. Cuando se confirme el pago verás aquí el avance del despacho.';
}

function hasMissingColumn(error?: { message?: string } | null) {
  return /column .* does not exist|schema cache|Could not find|PGRST204/i.test(error?.message || '');
}

async function loadByToken(token: string): Promise<LoadResult> {
  const parsed = parseOrderTrackingToken(token);
  if (!parsed) return { error: 'Token inválido.', status: 401 };
  const { data, error } = await insforgeAdmin.database.from('orders').select('*').eq('id', parsed.orderId).limit(1);
  if (error) return { error: error.message, status: 500 };
  const row = Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : undefined;
  return { row, status: 200 };
}

async function loadByDispatchCode(code: string): Promise<LoadResult> {
  const clean = normalizeDispatchCode(code);
  if (!clean) return { error: 'Código de despacho inválido.', status: 422 };
  const { data, error } = await insforgeAdmin.database.from('orders').select('*').eq('dispatch_code', clean).limit(1);
  if (error && hasMissingColumn(error)) return { error: 'La columna dispatch_code aún no existe. Ejecuta Setup Tables en el admin.', status: 500 };
  if (error) return { error: error.message, status: 500 };
  const row = Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : undefined;
  return { row, status: 200 };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const code = url.searchParams.get('code') || url.searchParams.get('dispatch_code') || '';

  const loaded = token ? await loadByToken(token) : await loadByDispatchCode(code);
  if (loaded.error) return NextResponse.json({ error: loaded.error }, { status: loaded.status });

  const row = loaded.row;
  if (!row) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });
  if (row.deleted_at) return NextResponse.json({ error: 'Pedido eliminado o no disponible.' }, { status: 404 });

  const dispatchCode = resolveDispatchCode(row, String(row.id || ''));
  const closed = isClosed(String(row.status || ''));
  return NextResponse.json({
    id: row.id,
    dispatchCode,
    status: row.status,
    publicStatus: publicStatus(String(row.status || '')),
    closed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    region: row.region,
    shippingAddress: closed ? null : row.shipping_address,
    trackingNumber: row.tracking_number || '',
    carrier: row.carrier || '',
    shippingNote: row.shipping_notes || '',
    items: row.items,
    summary: {
      subtotal: row.subtotal,
      iva: row.tax,
      despacho: row.shipping_fee,
      total: row.total,
      moneda: row.currency || 'CLP',
    },
    deliveryEstimate: '7 a 21 días hábiles',
    message: statusMessage(String(row.status || ''), dispatchCode),
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

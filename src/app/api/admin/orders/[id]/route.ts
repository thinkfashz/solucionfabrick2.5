import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';
import { deliveryStatusFromOrderStatus, normalizeOrderRecord, normalizeOrderStatus, type OrderStatus } from '@/lib/commerce';
import { resolveDispatchCode } from '@/lib/orders/dispatchCode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };
type DbRow = Record<string, unknown>;

const DEFAULT_CARRIER = 'Chilexpress';

function cleanText(value: unknown, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return trimmed || fallback;
}

function hasMissingColumn(error?: { message?: string } | null) {
  return /column .* does not exist|schema cache|Could not find|PGRST204|relation .* does not exist/i.test(error?.message || '');
}

function statusNeedsDispatchCode(status: OrderStatus) {
  return status === 'confirmado' || status === 'en_preparacion' || status === 'enviado' || status === 'entregado';
}

function generateTrackingNumber(orderId: string) {
  const base = orderId.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(-10) || Date.now().toString(36).toUpperCase();
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `FBK-ENV-${ymd}-${base}`;
}

async function getParams(ctx: RouteContext) {
  return await Promise.resolve(ctx.params);
}

async function requireAdmin(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return null;
  return decodeSession(sessionCookie.value);
}

function mapDeliveryStatus(status: string) {
  const orderStatus = normalizeOrderStatus(status);
  if (orderStatus === 'enviado') return 'en_camino';
  if (orderStatus === 'cancelado') return 'fallido';
  return deliveryStatusFromOrderStatus(orderStatus);
}

function buildEvents(order: DbRow, trackingNumber: string, carrier: string, status: string) {
  const createdAt = cleanText(order.created_at, new Date().toISOString());
  const updatedAt = cleanText(order.updated_at, createdAt);
  const orderStatus = normalizeOrderStatus(status);
  const events = [
    { status: 'pedido_creado', label: 'Pedido creado', description: 'La orden fue registrada en Soluciones Fabrick.', at: createdAt },
    { status: 'seguimiento_creado', label: 'Seguimiento generado', description: `Código automático: ${trackingNumber}.`, at: cleanText(order.tracking_created_at, createdAt) },
  ];
  if (['confirmado', 'en_preparacion', 'enviado', 'entregado'].includes(orderStatus)) {
    events.push({ status: 'confirmado', label: 'Pago confirmado', description: 'El pedido quedó listo para preparación.', at: updatedAt });
  }
  if (['en_preparacion', 'enviado', 'entregado'].includes(orderStatus)) {
    events.push({ status: 'preparando', label: 'Preparando producto', description: 'Producto, proveedor y datos de entrega en revisión.', at: updatedAt });
  }
  if (['enviado', 'entregado'].includes(orderStatus)) {
    events.push({ status: 'en_camino', label: 'En camino', description: `${carrier || DEFAULT_CARRIER} está gestionando el envío ${trackingNumber}.`, at: updatedAt });
  }
  if (orderStatus === 'entregado') events.push({ status: 'entregado', label: 'Entregado', description: 'El pedido fue marcado como entregado.', at: updatedAt });
  if (orderStatus === 'cancelado') events.push({ status: 'cancelado', label: 'Cancelado', description: 'El seguimiento fue detenido por cancelación.', at: updatedAt });
  return events;
}

async function loadOrder(orderId: string) {
  const decodedId = decodeURIComponent(orderId);
  const { data, error } = await insforgeAdmin.database.from('orders').select('*').eq('id', decodedId).limit(1);
  if (error) throw new Error(error.message || 'Pedido no encontrado');
  if (Array.isArray(data) && data[0]) return data[0] as DbRow;

  try {
    const byTracking = await insforgeAdmin.database.from('order_shipments').select('order_id').eq('tracking_number', decodedId).limit(1);
    const resolvedId = Array.isArray(byTracking.data) ? cleanText((byTracking.data[0] as DbRow | undefined)?.order_id) : '';
    if (resolvedId) {
      const byResolvedId = await insforgeAdmin.database.from('orders').select('*').eq('id', resolvedId).limit(1);
      if (Array.isArray(byResolvedId.data) && byResolvedId.data[0]) return byResolvedId.data[0] as DbRow;
    }
  } catch {}
  return undefined;
}

async function updateOrder(orderId: string, payload: Record<string, unknown>) {
  const { error } = await insforgeAdmin.database.from('orders').update(payload).eq('id', orderId);
  if (!error) return { ok: true, stripped: false, error: null };
  if (!hasMissingColumn(error)) return { ok: false, stripped: false, error };

  const fallback: Record<string, unknown> = { status: payload.status, updated_at: payload.updated_at };
  if (payload.shipping_fee !== undefined) fallback.shipping_fee = payload.shipping_fee;
  const retry = await insforgeAdmin.database.from('orders').update(fallback).eq('id', orderId);
  return { ok: !retry.error, stripped: true, error: retry.error };
}

async function upsertDelivery(orderId: string, payload: Record<string, unknown>) {
  try {
    const { data: existing } = await insforgeAdmin.database.from('deliveries').select('id').eq('order_id', orderId).limit(1);
    if (Array.isArray(existing) && existing.length > 0) await insforgeAdmin.database.from('deliveries').update(payload).eq('order_id', orderId);
    else await insforgeAdmin.database.from('deliveries').insert([{ ...payload, created_at: new Date().toISOString() }]);
    return { ok: true };
  } catch (error) {
    return { ok: false, warning: error instanceof Error ? error.message : 'No se pudo guardar entrega.' };
  }
}

async function upsertShipment(order: DbRow, trackingNumber: string, carrier: string, status: string, notes?: string) {
  const orderId = cleanText(order.id);
  const now = new Date().toISOString();
  const shipmentStatus = mapDeliveryStatus(status);
  const events = buildEvents({ ...order, status, updated_at: now, tracking_created_at: order.tracking_created_at || now }, trackingNumber, carrier, status);
  const payload = {
    order_id: orderId,
    tracking_number: trackingNumber,
    carrier,
    status: shipmentStatus,
    origin: 'Bodega Soluciones Fabrick',
    destination: cleanText(order.shipping_address),
    estimated_delivery_at: cleanText(order.estimated_delivery_at),
    events,
    details: { notes: cleanText(notes), orderTotal: order.total ?? 0, region: order.region ?? '' },
    updated_at: now,
  };
  try {
    const { data: existing } = await insforgeAdmin.database.from('order_shipments').select('id').eq('order_id', orderId).limit(1);
    if (Array.isArray(existing) && existing[0]) await insforgeAdmin.database.from('order_shipments').update(payload).eq('order_id', orderId);
    else await insforgeAdmin.database.from('order_shipments').insert([{ ...payload, created_at: now }]);
    return { ok: true, payload };
  } catch (error) {
    return { ok: false, payload, warning: error instanceof Error ? error.message : 'No se pudo guardar seguimiento.' };
  }
}

async function getShipmentForOrder(order: DbRow) {
  const orderId = cleanText(order.id);
  const trackingNumber = cleanText(order.tracking_number, generateTrackingNumber(orderId));
  const carrier = cleanText(order.carrier, DEFAULT_CARRIER);
  try {
    const { data } = await insforgeAdmin.database.from('order_shipments').select('*').eq('order_id', orderId).limit(1);
    if (Array.isArray(data) && data[0]) return data[0] as DbRow;
  } catch {}
  return {
    order_id: orderId,
    tracking_number: trackingNumber,
    carrier,
    status: cleanText(order.delivery_status, mapDeliveryStatus(cleanText(order.status, 'pendiente'))),
    origin: 'Bodega Soluciones Fabrick',
    destination: cleanText(order.shipping_address),
    estimated_delivery_at: cleanText(order.estimated_delivery_at),
    events: buildEvents(order, trackingNumber, carrier, cleanText(order.status, 'pendiente')),
    details: order.shipment_details ?? {},
  };
}

async function fetchProductSources(order: DbRow) {
  const normalized = normalizeOrderRecord(order);
  const productIds = Array.from(new Set(normalized.items.map((item) => item.productId).filter((id) => id && id !== 'sin-id')));
  if (productIds.length === 0) return {};
  try {
    const { data } = await insforgeAdmin.database.from('products').select('id, source, source_url').in('id', productIds);
    const map: Record<string, { source: string | null; sourceUrl: string | null }> = {};
    if (Array.isArray(data)) {
      for (const row of data as Array<{ id?: string; source?: string | null; source_url?: string | null }>) {
        if (row.id) map[row.id] = { source: row.source ?? null, sourceUrl: row.source_url ?? null };
      }
    }
    return map;
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const { id } = await getParams(context);
  const order = await loadOrder(id);
  if (!order) return NextResponse.json({ error: 'Pedido no encontrado', requestedId: id }, { status: 404 });
  return NextResponse.json({ order, shipment: await getShipmentForOrder(order), productSources: await fetchProductSources(order) });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const { id } = await getParams(context);
  const order = await loadOrder(id);
  if (!order) return NextResponse.json({ error: 'Pedido no encontrado', requestedId: id }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const newStatus = normalizeOrderStatus(body.status);
  const orderId = cleanText(order.id);
  const now = new Date().toISOString();
  const dispatchCode = statusNeedsDispatchCode(newStatus) ? resolveDispatchCode(order, orderId) : cleanText(order.dispatch_code ?? order.codigo_despacho);
  const finalTrackingNumber = cleanText(body.tracking_number, cleanText(order.tracking_number, generateTrackingNumber(orderId)));
  const finalCarrier = cleanText(body.carrier, cleanText(order.carrier, DEFAULT_CARRIER));
  const finalDeliveryStatus = mapDeliveryStatus(newStatus);

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    tracking_number: finalTrackingNumber,
    carrier: finalCarrier,
    delivery_status: finalDeliveryStatus,
    tracking_created_at: order.tracking_created_at || now,
    updated_at: now,
  };
  if (body.shipping_fee !== undefined) updatePayload.shipping_fee = Number(body.shipping_fee);
  if (body.notes !== undefined) {
    updatePayload.shipping_notes = String(body.notes || '').trim();
    updatePayload.shipment_details = { notes: String(body.notes || '').trim(), updatedBy: 'admin' };
  }
  if (dispatchCode) updatePayload.dispatch_code = dispatchCode;

  const updated = await updateOrder(orderId, updatePayload);
  if (!updated.ok) return NextResponse.json({ error: updated.error?.message || 'No se pudo actualizar pedido' }, { status: 500 });

  const delivery = await upsertDelivery(orderId, {
    order_id: orderId,
    customer_name: order.customer_name,
    address: order.shipping_address ?? '',
    status: finalDeliveryStatus,
    carrier: finalCarrier,
    dispatch_code: dispatchCode || undefined,
    tracking_number: finalTrackingNumber,
    notes: String(body.notes || '').trim(),
    updated_at: now,
  });
  const shipment = await upsertShipment({ ...order, ...updatePayload, id: orderId }, finalTrackingNumber, finalCarrier, newStatus, body.notes);
  const customerPhone = String(order.customer_phone || '').replace(/\D/g, '');
  const waMessage = `Pedido ${orderId}: estado ${newStatus}. Seguimiento ${finalTrackingNumber}. Transportista ${finalCarrier}.`;

  return NextResponse.json({
    ok: true,
    newStatus,
    dispatchCode,
    trackingNumber: finalTrackingNumber,
    carrier: finalCarrier,
    deliveryStatus: finalDeliveryStatus,
    strippedMissingColumns: updated.stripped,
    delivery,
    shipment,
    whatsapp: customerPhone ? { link: `https://wa.me/${customerPhone.startsWith('56') ? '' : '56'}${customerPhone}?text=${encodeURIComponent(waMessage)}`, message: waMessage, phone: customerPhone } : null,
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const { id: orderId } = await getParams(context);
  const now = new Date().toISOString();
  const { error } = await insforgeAdmin.database.from('orders').update({ status: 'cancelado', delivery_status: 'fallido', deleted_at: now, updated_at: now }).eq('id', orderId);
  if (error && !hasMissingColumn(error)) return NextResponse.json({ error: error.message }, { status: 500 });
  try { await insforgeAdmin.database.from('deliveries').update({ status: 'fallido', updated_at: now }).eq('order_id', orderId); } catch {}
  try { await insforgeAdmin.database.from('order_shipments').update({ status: 'fallido', updated_at: now }).eq('order_id', orderId); } catch {}
  return NextResponse.json({ ok: true, deleted: true, orderId });
}

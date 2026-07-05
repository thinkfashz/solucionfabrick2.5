import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';
import { deliveryStatusFromOrderStatus, normalizeOrderStatus, type OrderStatus } from '@/lib/commerce';
import { createOrderTrackingToken } from '@/lib/orderTracking';
import { getAppBaseUrl } from '@/lib/mercadopago';
import { sendOrderStatusUpdateEmail } from '@/lib/email/orderStatusEmail';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Mensajes de WhatsApp por estado
const WA_MESSAGES: Record<OrderStatus, (name: string, orderId: string, extra?: string) => string> = {
  pendiente:       (n, id) => `Hola ${n} 👋 Recibimos tu pedido *#${id.slice(-6).toUpperCase()}* y está en revisión. Te avisaremos cuando lo confirmemos. ¡Gracias por tu compra en Soluciones Fabrick! 🏗️`,
  confirmado:      (n, id) => `Hola ${n} ✅ Tu pedido *#${id.slice(-6).toUpperCase()}* fue *confirmado* y está siendo preparado. Pronto te enviamos más novedades. – Soluciones Fabrick`,
  en_preparacion:  (n, id) => `Hola ${n} 📦 Tu pedido *#${id.slice(-6).toUpperCase()}* está en *preparación*. Nuestro equipo está alistando tu pedido con cuidado. – Soluciones Fabrick`,
  enviado:         (n, id, tracking) => `Hola ${n} 🚚 Tu pedido *#${id.slice(-6).toUpperCase()}* ya fue *enviado*!${tracking ? `\n\n🔍 Número de seguimiento: *${tracking}*` : ''}\n\nRecíbelo en los próximos días. ¡Gracias por confiar en Soluciones Fabrick! 🏗️`,
  entregado:       (n, id) => `Hola ${n} 🎉 Tu pedido *#${id.slice(-6).toUpperCase()}* fue *entregado* exitosamente.\n\nEsperamos que estés feliz con tu compra. Si tienes alguna consulta, estamos aquí. – Soluciones Fabrick`,
  cancelado:       (n, id) => `Hola ${n} ❌ Tu pedido *#${id.slice(-6).toUpperCase()}* fue *cancelado*. Si tienes dudas o quieres hacer otro pedido, escríbenos. – Soluciones Fabrick`,
};

function hasMissingColumn(error?: { message?: string } | null) {
  return /column .* does not exist|schema cache|Could not find|PGRST204/i.test(error?.message || '');
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

async function markStatusEmailSent(orderId: string, status: OrderStatus) {
  try {
    await insforgeAdmin.database.from('orders').update({
      status_email_sent_at: new Date().toISOString(),
      status_email_last_status: status,
    }).eq('id', orderId);
  } catch {
    // Columns may not exist until setup tables runs. The email was still sent.
  }
}

async function upsertDelivery(orderId: string, payload: Record<string, unknown>) {
  try {
    const { data: existing } = await insforgeAdmin.database.from('deliveries').select('id').eq('order_id', orderId).limit(1);
    if (Array.isArray(existing) && existing.length > 0) {
      await insforgeAdmin.database.from('deliveries').update(payload).eq('order_id', orderId);
    } else {
      await insforgeAdmin.database.from('deliveries').insert([{ ...payload, created_at: new Date().toISOString() }]);
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, warning: error instanceof Error ? error.message : 'No se pudo guardar entrega.' };
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const session = await decodeSession(sessionCookie.value);
  if (!session) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  const { id: orderId } = await params;
  const body = await request.json().catch(() => ({}));
  const {
    status,
    tracking_number,
    carrier,
    shipping_fee,
    notes,
    notify_email,
  } = body as {
    status?: string;
    tracking_number?: string;
    carrier?: string;
    shipping_fee?: number;
    notes?: string;
    notify_email?: boolean;
  };

  if (!status) return NextResponse.json({ error: 'Falta status' }, { status: 400 });
  const newStatus = normalizeOrderStatus(status);

  // Fetch order to get customer info. Older orders were created before tenant_id existed in orders.
  const { data: orderData, error: fetchErr } = await insforgeAdmin.database
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .limit(1);

  if (fetchErr || !orderData?.length) {
    return NextResponse.json({ error: fetchErr?.message || 'Pedido no encontrado' }, { status: 404 });
  }
  const order = orderData[0] as Record<string, unknown>;
  const now = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    updated_at: now,
  };
  if (tracking_number !== undefined) updatePayload.tracking_number = String(tracking_number || '').trim();
  if (carrier !== undefined) updatePayload.carrier = String(carrier || '').trim();
  if (shipping_fee !== undefined) updatePayload.shipping_fee = shipping_fee;
  if (notes !== undefined) updatePayload.shipping_notes = String(notes || '').trim();

  const updated = await updateOrder(orderId, updatePayload);
  if (!updated.ok) {
    return NextResponse.json({ error: updated.error?.message || 'No se pudo actualizar pedido' }, { status: 500 });
  }

  const deliveryPayload = {
    order_id: orderId,
    customer_name: order.customer_name,
    address: order.shipping_address ?? '',
    status: deliveryStatusFromOrderStatus(newStatus),
    carrier: carrier || order.carrier || '',
    ...(notes?.trim() ? { notes: notes.trim() } : {}),
    ...(tracking_number ? { tracking_number } : {}),
    updated_at: now,
  };
  const delivery = await upsertDelivery(orderId, deliveryPayload);

  let email: Awaited<ReturnType<typeof sendOrderStatusUpdateEmail>> | null = null;
  if (notify_email) {
    const trackingUrl = `${getAppBaseUrl()}/pedido/${createOrderTrackingToken(orderId)}`;
    email = await sendOrderStatusUpdateEmail({
      order: { ...order, ...updatePayload, id: orderId },
      status: newStatus,
      trackingNumber: String(tracking_number || order.tracking_number || '').trim(),
      carrier: String(carrier || order.carrier || '').trim(),
      trackingUrl,
      note: notes,
    });

    if (email.ok) await markStatusEmailSent(orderId, newStatus);
  }

  // Build WhatsApp notification link
  const customerName  = String(order.customer_name || 'Cliente').split(' ')[0];
  const customerPhone = String(order.customer_phone || '').replace(/\D/g, '');
  const msgFn = WA_MESSAGES[newStatus];
  const waMessage = msgFn ? msgFn(customerName, orderId, tracking_number) : '';
  const waLink = customerPhone
    ? `https://wa.me/${customerPhone.startsWith('56') ? '' : '56'}${customerPhone}?text=${encodeURIComponent(waMessage)}`
    : null;

  return NextResponse.json({
    ok: true,
    newStatus,
    strippedMissingColumns: updated.stripped,
    delivery,
    email,
    whatsapp: waLink ? { link: waLink, message: waMessage, phone: customerPhone } : null,
  });
}

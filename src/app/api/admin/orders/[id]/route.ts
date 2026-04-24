import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';
import { deliveryStatusFromOrderStatus, normalizeOrderStatus, type OrderStatus } from '@/lib/commerce';

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
  } = body as {
    status?: string;
    tracking_number?: string;
    carrier?: string;
    shipping_fee?: number;
    notes?: string;
  };

  if (!status) return NextResponse.json({ error: 'Falta status' }, { status: 400 });
  const newStatus = normalizeOrderStatus(status);

  // Fetch order to get customer info
  const { data: orderData, error: fetchErr } = await insforgeAdmin.database
    .from('orders')
    .select('id, customer_name, customer_email, customer_phone, shipping_address, status, total, items')
    .eq('id', orderId);

  if (fetchErr || !orderData?.length) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }
  const order = orderData[0] as Record<string, unknown>;

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (tracking_number !== undefined) updatePayload.tracking_number = tracking_number;
  if (carrier !== undefined) updatePayload.carrier = carrier;
  if (shipping_fee !== undefined) updatePayload.shipping_fee = shipping_fee;

  const { error: updateErr } = await insforgeAdmin.database
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Upsert delivery record
  const deliveryPayload = {
    order_id: orderId,
    customer_name: order.customer_name,
    address: order.shipping_address ?? '',
    status: deliveryStatusFromOrderStatus(newStatus),
    ...(notes?.trim() ? { notes: notes.trim() } : {}),
    ...(tracking_number ? { tracking_number } : {}),
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await insforgeAdmin.database
    .from('deliveries')
    .select('id')
    .eq('order_id', orderId);

  if (Array.isArray(existing) && existing.length > 0) {
    await insforgeAdmin.database.from('deliveries').update(deliveryPayload).eq('order_id', orderId);
  } else {
    await insforgeAdmin.database.from('deliveries').insert([{ ...deliveryPayload, created_at: new Date().toISOString() }]);
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
    whatsapp: waLink ? { link: waLink, message: waMessage, phone: customerPhone } : null,
  });
}

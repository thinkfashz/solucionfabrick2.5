import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { calculateCheckoutSummary, estimateInternalShipping, validateCheckoutPayload, type CheckoutPayload } from '@/lib/checkout';
import { createMercadoPagoPreference, getAppBaseUrl } from '@/lib/mercadopago';
import { createOrderTrackingToken } from '@/lib/orderTracking';
import { dispatchHookAsync } from '@/lib/extensionsBus';
import { getShippingConfig } from '@/lib/shippingServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body: CheckoutPayload = await request.json();
    const { items, region, cliente, shippingAddress } = body;

    const validationErrors = validateCheckoutPayload(body);
    if (validationErrors.length > 0) return NextResponse.json({ error: 'Datos inválidos para checkout.', validationErrors }, { status: 422 });

    const shippingConfig = await getShippingConfig();
    const resumen = calculateCheckoutSummary(items, region, shippingConfig);
    const internalShippingEstimate = estimateInternalShipping(items, region, shippingAddress || '');
    const id = body.clientOrderKey?.trim() || `FBK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const createdAt = new Date().toISOString();
    const trackingToken = createOrderTrackingToken(id);
    const trackingUrl = `${getAppBaseUrl()}/pedido/${trackingToken}`;

    const orden = {
      id,
      cliente,
      items,
      resumen,
      shippingAddress: shippingAddress ?? '',
      region,
      estado: 'pendiente_pago',
      paymentMethod: 'mercadopago',
      deliveryEstimate: '7 a 21 días hábiles',
      internalShippingEstimate,
      trackingToken,
      trackingUrl,
      creadoEn: createdAt,
    };

    let persisted = false;
    let persistenceWarning: string | null = null;

    const { error: insertError } = await insforge.database.from('orders').insert([{ id: orden.id, customer_name: cliente.nombre, customer_email: cliente.email, customer_phone: cliente.telefono ?? null, region, shipping_address: shippingAddress ?? null, items, subtotal: resumen.subtotal, tax: resumen.iva, shipping_fee: resumen.despacho, total: resumen.total, currency: resumen.moneda, status: orden.estado, created_at: orden.creadoEn, updated_at: orden.creadoEn }]);

    if (insertError) {
      const duplicateLike = /duplicate|unique|already/i.test(insertError.message || '');
      if (!duplicateLike) persistenceWarning = `No se pudo persistir en DB (orders): ${insertError.message}`;
    } else {
      persisted = true;
      dispatchHookAsync('order.created', { id: orden.id, customer: { name: cliente.nombre, email: cliente.email, phone: cliente.telefono ?? null }, region, items, summary: resumen, status: orden.estado });
    }

    const preference = await createMercadoPagoPreference({ orderId: orden.id, payload: { ...body, paymentMethod: 'mercadopago' }, summary: resumen });
    const payment = { provider: 'mercado_pago', preferenceId: preference.id, checkoutUrl: preference.init_point || preference.sandbox_init_point || null };

    return NextResponse.json({ data: orden, persistence: persisted ? 'db' : 'memory_or_existing', warning: persistenceWarning, payment, shippingMode: shippingConfig.mode, notification: { ok: true, deferred: true, reason: 'El correo y la boleta se enviarán solo cuando Mercado Pago confirme pago aprobado o rechazado por webhook.' } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno al procesar el checkout.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

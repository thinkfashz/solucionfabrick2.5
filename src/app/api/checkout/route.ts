import { NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { calculateCheckoutSummary, estimateInternalShipping, validateCheckoutPayload, type CheckoutPayload } from '@/lib/checkout';
import { createMercadoPagoPreference, getAppBaseUrl } from '@/lib/mercadopago';
import { createOrderTrackingToken } from '@/lib/orderTracking';
import { dispatchHookAsync } from '@/lib/extensionsBus';
import { getShippingConfig } from '@/lib/shippingServer';
import { CheckoutHydrationError, hydrateCheckoutItemsWithShipping } from '@/lib/checkoutServer';
import { getClientIp } from '@/lib/adminAuth';
import { checkPersistentRateLimit } from '@/lib/adminRateLimitStore';
import { campaignBusyHeaders, getCampaignMode, publicCheckoutEnabled } from '@/lib/campaignMode';
import { syncOrderToSalesPipelineAsync } from '@/lib/orders/salesPipeline';
import { createOrderWithReservations, releaseOrderReservation, reservationHttpError } from '@/lib/commerceReservations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 32 * 1024;
const RATE_LIMIT_MAX = 12;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_CARRIER = 'Chilexpress';
const RESERVATION_TTL_MINUTES = 15;

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function sanitizeOrderId(value: unknown) {
  const cleaned = cleanText(value, 90).replace(/[^a-zA-Z0-9._@-]/g, '').slice(0, 90);
  return cleaned || `FBK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function createShipmentTrackingNumber(orderId: string) {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const base = orderId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-10) || Math.random().toString(36).slice(2, 10).toUpperCase();
  return `FBK-ENV-${ymd}-${base}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function buildInitialShipmentEvents(orderId: string, createdAt: string, trackingNumber: string) {
  return [
    { status: 'pedido_creado', label: 'Pedido creado', description: `Orden ${orderId} registrada en Soluciones Fabrick.`, at: createdAt },
    { status: 'seguimiento_creado', label: 'Seguimiento generado', description: `Código automático asignado: ${trackingNumber}.`, at: createdAt },
  ];
}

async function readCheckoutBody(request: Request): Promise<CheckoutPayload | null> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return null;
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) return null;
  return JSON.parse(text) as CheckoutPayload;
}

async function loadExistingOrder(id: string) {
  const { data, error } = await insforgeAdmin.database.from('orders').select('*').eq('id', id).limit(1);
  if (error) throw new Error(error.message || 'No se pudo recuperar la orden persistida.');
  return Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : undefined;
}

async function ensureShipment(order: Record<string, unknown>, trackingNumber: string, createdAt: string) {
  const orderId = String(order.id || '');
  if (!orderId) return;
  const carrier = String(order.carrier || DEFAULT_CARRIER);
  const destination = String(order.shipping_address || '');
  const estimatedDeliveryAt = String(order.estimated_delivery_at || addDays(new Date(createdAt), 7));
  const events = buildInitialShipmentEvents(orderId, createdAt, trackingNumber);
  try {
    const { data } = await insforgeAdmin.database.from('order_shipments').select('id').eq('order_id', orderId).limit(1);
    if (Array.isArray(data) && data.length > 0) return;
    await insforgeAdmin.database.from('order_shipments').insert([{
      order_id: orderId, tracking_number: trackingNumber, carrier, status: 'pendiente',
      origin: 'Bodega Soluciones Fabrick', destination, estimated_delivery_at: estimatedDeliveryAt, events,
      details: { orderTotal: order.total ?? 0, region: order.region ?? '', source: 'checkout' },
      created_at: createdAt, updated_at: createdAt,
    }]);
  } catch (error) { console.warn('[checkout] could not create order shipment:', error); }
}

async function markPaymentSessionFailure(orderId: string, message: string) {
  try {
    await insforgeAdmin.database.from('orders').update({
      status: 'payment_session_failed',
      payment_review_reason: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    }).eq('id', orderId);
  } catch (error) {
    console.warn('[checkout] could not mark payment session failure:', error);
  }
}

export async function POST(request: Request) {
  try {
    if (!publicCheckoutEnabled()) {
      return NextResponse.json({ error: 'Checkout pausado temporalmente por modo campaña. Puedes guardar el producto o contactarnos por WhatsApp.', campaignMode: getCampaignMode() }, { status: 503, headers: campaignBusyHeaders() });
    }

    const ip = getClientIp(request);
    const rl = await checkPersistentRateLimit({ namespace: 'public:checkout-mp', identity: ip, max: RATE_LIMIT_MAX, windowMs: RATE_LIMIT_WINDOW_MS });
    if (!rl.ok) return NextResponse.json({ error: 'Demasiados intentos de checkout. Intenta nuevamente en unos minutos.', retry_after: rl.retryAfterSec }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } });

    const body = await readCheckoutBody(request);
    if (!body) return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });

    const { items, region, cliente, shippingAddress } = body;
    const safeClient = {
      nombre: cleanText(cliente?.nombre, 120),
      email: cleanText(cliente?.email, 180).toLowerCase(),
      telefono: cleanText(cliente?.telefono, 60) || undefined,
    };
    const documentType = body.billing?.documentType === 'factura' ? 'factura' : 'boleta';
    const safeBilling = {
      documentType,
      rut: cleanText(body.billing?.rut, 20).replace(/\./g, ''),
      razonSocial: cleanText(body.billing?.razonSocial, 180),
      giro: cleanText(body.billing?.giro, 180),
      direccion: cleanText(body.billing?.direccion, 220),
      comuna: cleanText(body.billing?.comuna, 120),
    } as const;
    const safeBody: CheckoutPayload = {
      ...body,
      cliente: safeClient,
      region: cleanText(region, 40),
      shippingAddress: cleanText(shippingAddress, 500),
      paymentMethod: 'mercadopago',
      clientOrderKey: sanitizeOrderId(body.clientOrderKey),
      billing: safeBilling,
    };

    const validationErrors = validateCheckoutPayload(safeBody);
    if (validationErrors.length > 0) return NextResponse.json({ error: 'Datos inválidos para checkout.', validationErrors }, { status: 422 });

    const shippingConfig = await getShippingConfig();
    let hydratedItems;
    try { hydratedItems = await hydrateCheckoutItemsWithShipping(items); }
    catch (error) {
      if (error instanceof CheckoutHydrationError) return NextResponse.json({ error: error.message }, { status: error.status });
      throw error;
    }

    const resumen = calculateCheckoutSummary(hydratedItems, safeBody.region, shippingConfig);
    const internalShippingEstimate = estimateInternalShipping(hydratedItems, safeBody.region, safeBody.shippingAddress || '');
    const id = safeBody.clientOrderKey || sanitizeOrderId(null);
    const createdAt = new Date().toISOString();
    const trackingToken = createOrderTrackingToken(id);
    const trackingUrl = `${getAppBaseUrl()}/pedido/${trackingToken}`;
    const shipmentTrackingNumber = createShipmentTrackingNumber(id);
    const estimatedDeliveryAt = addDays(new Date(createdAt), 7);

    const orderRow: Record<string, unknown> = {
      id,
      customer_name: safeClient.nombre,
      customer_email: safeClient.email,
      customer_phone: safeClient.telefono ?? null,
      region: safeBody.region,
      shipping_address: safeBody.shippingAddress ?? null,
      items: hydratedItems,
      subtotal: resumen.subtotal,
      tax: resumen.iva,
      shipping_fee: resumen.despacho,
      total: resumen.total,
      currency: resumen.moneda,
      status: 'pendiente_pago',
      tracking_number: shipmentTrackingNumber,
      carrier: DEFAULT_CARRIER,
      delivery_status: 'pendiente',
      tracking_created_at: createdAt,
      estimated_delivery_at: estimatedDeliveryAt,
      shipment_details: {
        trackingToken,
        trackingUrl,
        internalShippingEstimate,
        source: 'checkout',
        billing: safeBilling,
      },
      created_at: createdAt,
      updated_at: createdAt,
    };

    let reservation;
    try {
      reservation = await createOrderWithReservations(orderRow, hydratedItems, RESERVATION_TTL_MINUTES);
    } catch (error) {
      const mapped = reservationHttpError(error);
      return NextResponse.json({ error: mapped.error, code: mapped.code }, { status: mapped.status });
    }

    const persistedOrder = await loadExistingOrder(id);
    if (!persistedOrder) {
      await releaseOrderReservation(id, 'order_persistence_verification_failed').catch(() => undefined);
      return NextResponse.json({ error: 'La transacción no pudo verificar la orden persistida. No se abrió Mercado Pago.', code: 'ORDER_PERSISTENCE_FAILED' }, { status: 500 });
    }

    const persistence: 'db' | 'existing' = reservation.existing ? 'existing' : 'db';

    if (!reservation.existing) {
      dispatchHookAsync('order.created', { id, customer: { name: safeClient.nombre, email: safeClient.email, phone: safeClient.telefono ?? null }, region: safeBody.region, items: hydratedItems, summary: resumen, status: orderRow.status, trackingNumber: shipmentTrackingNumber, billing: safeBilling });
      syncOrderToSalesPipelineAsync(orderRow, { stage: 'Checkout iniciado', probability: 45, attended: false, nextAction: 'Confirmar pago y preparar despacho' });
    }

    await ensureShipment(persistedOrder, String(persistedOrder.tracking_number || shipmentTrackingNumber), String(persistedOrder.created_at || createdAt));

    let preference;
    try {
      preference = await createMercadoPagoPreference({ orderId: id, payload: { ...safeBody, items: hydratedItems, paymentMethod: 'mercadopago' }, summary: resumen });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Mercado Pago no pudo iniciar la sesión.';
      await releaseOrderReservation(id, 'payment_session_failed').catch(() => undefined);
      await markPaymentSessionFailure(id, message);
      return NextResponse.json({ error: `${message} La reserva de inventario fue liberada y no se generó un cobro.`, code: 'PAYMENT_SESSION_FAILED' }, { status: 502 });
    }

    const payment = { provider: 'mercado_pago', preferenceId: preference.id, checkoutUrl: preference.init_point || preference.sandbox_init_point || null };
    if (!payment.checkoutUrl) {
      await releaseOrderReservation(id, 'payment_url_missing').catch(() => undefined);
      await markPaymentSessionFailure(id, 'Mercado Pago no devolvió una URL de checkout.');
      return NextResponse.json({ error: 'Mercado Pago no devolvió una URL de pago. La reserva fue liberada.', code: 'PAYMENT_URL_MISSING' }, { status: 502 });
    }

    const orden = {
      id, cliente: safeClient, items: hydratedItems, resumen, billing: safeBilling,
      shippingAddress: safeBody.shippingAddress ?? '', region: safeBody.region, estado: 'pendiente_pago', paymentMethod: 'mercadopago',
      deliveryEstimate: '7 a 21 días hábiles', internalShippingEstimate, trackingToken, trackingUrl,
      trackingNumber: String(persistedOrder.tracking_number || shipmentTrackingNumber), carrier: String(persistedOrder.carrier || DEFAULT_CARRIER), creadoEn: createdAt,
      reservationExpiresAt: reservation.expires_at,
    };

    return NextResponse.json({ data: orden, persistence, payment, shippingMode: shippingConfig.mode, notification: { ok: true, deferred: true, reason: 'Orden y stock reservados. Al aprobarse el pago se validan monto, moneda y pedido antes de descontar inventario una sola vez.' } }, { status: persistence === 'db' ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno al procesar el checkout.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

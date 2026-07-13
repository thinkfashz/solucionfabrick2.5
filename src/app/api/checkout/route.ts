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

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 32 * 1024;
const RATE_LIMIT_MAX = 12;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_CARRIER = 'Chilexpress';

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
    {
      status: 'pedido_creado',
      label: 'Pedido creado',
      description: `Orden ${orderId} registrada en Soluciones Fabrick.`,
      at: createdAt,
    },
    {
      status: 'seguimiento_creado',
      label: 'Seguimiento generado',
      description: `Código automático asignado: ${trackingNumber}.`,
      at: createdAt,
    },
  ];
}

async function readCheckoutBody(request: Request): Promise<CheckoutPayload | null> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return null;
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) return null;
  return JSON.parse(text) as CheckoutPayload;
}

function isDuplicateError(error: { message?: string } | null | undefined) {
  return /duplicate|unique|already/i.test(error?.message || '');
}

async function loadExistingOrder(id: string) {
  try {
    const { data } = await insforgeAdmin.database
      .from('orders')
      .select('*')
      .eq('id', id)
      .limit(1);
    return Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : undefined;
  } catch {
    return undefined;
  }
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
    await insforgeAdmin.database.from('order_shipments').insert([
      {
        order_id: orderId,
        tracking_number: trackingNumber,
        carrier,
        status: 'pendiente',
        origin: 'Bodega Soluciones Fabrick',
        destination,
        estimated_delivery_at: estimatedDeliveryAt,
        events,
        details: {
          orderTotal: order.total ?? 0,
          region: order.region ?? '',
          source: 'checkout',
        },
        created_at: createdAt,
        updated_at: createdAt,
      },
    ]);
  } catch (error) {
    console.warn('[checkout] could not create order shipment:', error);
  }
}

function coreOrderRow(order: Record<string, unknown>) {
  const {
    tracking_number: _trackingNumber,
    carrier: _carrier,
    delivery_status: _deliveryStatus,
    tracking_created_at: _trackingCreatedAt,
    estimated_delivery_at: _estimatedDeliveryAt,
    shipment_details: _shipmentDetails,
    ...core
  } = order;
  return core;
}

export async function POST(request: Request) {
  try {
    if (!publicCheckoutEnabled()) {
      return NextResponse.json(
        {
          error: 'Checkout pausado temporalmente por modo campaña. Puedes guardar el producto o contactarnos por WhatsApp.',
          campaignMode: getCampaignMode(),
        },
        { status: 503, headers: campaignBusyHeaders() },
      );
    }

    const ip = getClientIp(request);
    const rl = await checkPersistentRateLimit({
      namespace: 'public:checkout-mp',
      identity: ip,
      max: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Demasiados intentos de checkout. Intenta nuevamente en unos minutos.', retry_after: rl.retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      );
    }

    const body = await readCheckoutBody(request);
    if (!body) return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });

    const { items, region, cliente, shippingAddress } = body;
    const safeClient = {
      nombre: cleanText(cliente?.nombre, 120),
      email: cleanText(cliente?.email, 180).toLowerCase(),
      telefono: cleanText(cliente?.telefono, 60) || undefined,
    };
    const safeBody: CheckoutPayload = {
      ...body,
      cliente: safeClient,
      region: cleanText(region, 40),
      shippingAddress: cleanText(shippingAddress, 500),
      paymentMethod: 'mercadopago',
      clientOrderKey: sanitizeOrderId(body.clientOrderKey),
    };

    const validationErrors = validateCheckoutPayload(safeBody);
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: 'Datos inválidos para checkout.', validationErrors }, { status: 422 });
    }

    const shippingConfig = await getShippingConfig();
    let hydratedItems;
    try {
      hydratedItems = await hydrateCheckoutItemsWithShipping(items);
    } catch (error) {
      if (error instanceof CheckoutHydrationError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
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

    const orderRow = {
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
      },
      created_at: createdAt,
      updated_at: createdAt,
    };

    let { error: insertError } = await insforgeAdmin.database.from('orders').insert([orderRow]);
    if (insertError && /schema cache|column .* does not exist|could not find/i.test(insertError.message || '')) {
      ({ error: insertError } = await insforgeAdmin.database.from('orders').insert([coreOrderRow(orderRow)]));
    }
    let persistence: 'db' | 'existing' = 'db';
    let persistedOrder: Record<string, unknown> = orderRow;

    if (insertError) {
      if (!isDuplicateError(insertError)) {
        return NextResponse.json({
          error: `No se pudo registrar la orden antes del pago: ${insertError.message}. No se abrió Mercado Pago para evitar pagos sin pedido.`,
          code: 'ORDER_PERSISTENCE_FAILED',
        }, { status: 500 });
      }

      const existing = await loadExistingOrder(id);
      if (!existing) return NextResponse.json({ error: 'La orden ya existe, pero no se pudo recuperar.' }, { status: 409 });
      const existingTotal = Number(existing.total ?? 0);
      if (Number.isFinite(existingTotal) && existingTotal > 0 && existingTotal !== resumen.total) {
        return NextResponse.json({ error: 'La llave de orden ya fue usada con otro total.' }, { status: 409 });
      }
      persistence = 'existing';
      persistedOrder = existing;
    } else {
      dispatchHookAsync('order.created', { id, customer: { name: safeClient.nombre, email: safeClient.email, phone: safeClient.telefono ?? null }, region: safeBody.region, items: hydratedItems, summary: resumen, status: orderRow.status, trackingNumber: shipmentTrackingNumber });
      syncOrderToSalesPipelineAsync(orderRow, {
        stage: 'Checkout iniciado',
        probability: 45,
        attended: false,
        nextAction: 'Confirmar pago y preparar despacho',
      });
    }

    await ensureShipment(persistedOrder, String(persistedOrder.tracking_number || shipmentTrackingNumber), String(persistedOrder.created_at || createdAt));

    const preference = await createMercadoPagoPreference({ orderId: id, payload: { ...safeBody, items: hydratedItems, paymentMethod: 'mercadopago' }, summary: resumen });
    const payment = { provider: 'mercado_pago', preferenceId: preference.id, checkoutUrl: preference.init_point || preference.sandbox_init_point || null };

    const orden = {
      id,
      cliente: safeClient,
      items: hydratedItems,
      resumen,
      shippingAddress: safeBody.shippingAddress ?? '',
      region: safeBody.region,
      estado: 'pendiente_pago',
      paymentMethod: 'mercadopago',
      deliveryEstimate: '7 a 21 días hábiles',
      internalShippingEstimate,
      trackingToken,
      trackingUrl,
      trackingNumber: String(persistedOrder.tracking_number || shipmentTrackingNumber),
      carrier: String(persistedOrder.carrier || DEFAULT_CARRIER),
      creadoEn: createdAt,
    };

    return NextResponse.json({ data: orden, persistence, payment, shippingMode: shippingConfig.mode, notification: { ok: true, deferred: true, reason: 'Orden registrada. El correo, boleta, CRM y dashboard se actualizan al aprobarse el pago.' } }, { status: persistence === 'db' ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno al procesar el checkout.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

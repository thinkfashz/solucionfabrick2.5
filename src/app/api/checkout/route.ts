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

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 32 * 1024;
const RATE_LIMIT_MAX = 12;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function sanitizeOrderId(value: unknown) {
  const cleaned = cleanText(value, 90).replace(/[^a-zA-Z0-9._@-]/g, '').slice(0, 90);
  return cleaned || `FBK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
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
      .select('id, customer_name, customer_email, customer_phone, region, shipping_address, items, subtotal, tax, shipping_fee, total, currency, status, created_at')
      .eq('id', id)
      .limit(1);
    return Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : undefined;
  } catch {
    return undefined;
  }
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
      creadoEn: createdAt,
    };
    let persisted = false;
    let persistenceWarning: string | null = null;
    let duplicateOrder = false;

    const { error: insertError } = await insforgeAdmin.database.from('orders').insert([{
      id: orden.id,
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
      status: orden.estado,
      created_at: orden.creadoEn,
      updated_at: orden.creadoEn,
    }]);

    if (insertError) {
      duplicateOrder = isDuplicateError(insertError);
      if (!duplicateOrder) persistenceWarning = `No se pudo persistir en DB (orders): ${insertError.message}`;
    } else {
      persisted = true;
      dispatchHookAsync('order.created', { id: orden.id, customer: { name: safeClient.nombre, email: safeClient.email, phone: safeClient.telefono ?? null }, region: safeBody.region, items: hydratedItems, summary: resumen, status: orden.estado });
    }

    if (duplicateOrder) {
      const existing = await loadExistingOrder(orden.id);
      if (!existing) return NextResponse.json({ error: 'La orden ya existe, pero no se pudo recuperar.' }, { status: 409 });
      const existingTotal = Number(existing.total ?? 0);
      if (Number.isFinite(existingTotal) && existingTotal > 0 && existingTotal !== resumen.total) {
        return NextResponse.json({ error: 'La llave de orden ya fue usada con otro total.' }, { status: 409 });
      }
    }

    const preference = await createMercadoPagoPreference({ orderId: orden.id, payload: { ...safeBody, items: hydratedItems, paymentMethod: 'mercadopago' }, summary: resumen });
    const payment = { provider: 'mercado_pago', preferenceId: preference.id, checkoutUrl: preference.init_point || preference.sandbox_init_point || null };

    return NextResponse.json({ data: orden, persistence: persisted ? 'db' : duplicateOrder ? 'existing' : 'memory', warning: persistenceWarning, payment, shippingMode: shippingConfig.mode, notification: { ok: true, deferred: true, reason: 'El correo y la boleta se enviarán solo cuando Mercado Pago confirme pago aprobado o rechazado por webhook.' } }, { status: persisted ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno al procesar el checkout.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

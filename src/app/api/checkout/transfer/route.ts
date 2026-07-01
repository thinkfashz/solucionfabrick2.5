import { NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { calculateCheckoutSummary, estimateInternalShipping, validateCheckoutPayload, type CheckoutPayload } from '@/lib/checkout';
import { getAppBaseUrl } from '@/lib/mercadopago';
import { createOrderTrackingToken } from '@/lib/orderTracking';
import { getShippingConfig } from '@/lib/shippingServer';
import { CheckoutHydrationError, hydrateCheckoutItemsWithShipping } from '@/lib/checkoutServer';
import { getClientIp } from '@/lib/adminAuth';
import { checkPersistentRateLimit } from '@/lib/adminRateLimitStore';
import { campaignBusyHeaders, getCampaignMode, publicCheckoutEnabled } from '@/lib/campaignMode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DELIVERY_WINDOW = '7 a 21 días hábiles';
const MAX_BODY_BYTES = 32 * 1024;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

type ExtendedCheckoutPayload = CheckoutPayload & { shippingHouseNumber?: string; paymentMethod?: string };

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function sanitizeOrderId(value: unknown) {
  const cleaned = cleanText(value, 90).replace(/[^a-zA-Z0-9._@-]/g, '').slice(0, 90);
  return cleaned || `FBK-T-${Date.now()}-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
}

function fullAddress(address?: string, number?: string) { return [address, number ? `N° ${number}` : ''].filter(Boolean).join(' · '); }

async function readCheckoutBody(request: Request): Promise<ExtendedCheckoutPayload | null> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return null;
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) return null;
  return JSON.parse(text) as ExtendedCheckoutPayload;
}

function isDuplicateError(error: { message?: string } | null | undefined) {
  return /duplicate|unique|already/i.test(error?.message || '');
}

export async function POST(request: Request) {
  try {
    if (!publicCheckoutEnabled()) {
      return NextResponse.json(
        {
          error: 'Checkout por transferencia pausado temporalmente por modo campaña. Contáctanos por WhatsApp para coordinar compra.',
          campaignMode: getCampaignMode(),
        },
        { status: 503, headers: campaignBusyHeaders() },
      );
    }

    const ip = getClientIp(request);
    const rl = await checkPersistentRateLimit({
      namespace: 'public:checkout-transfer',
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

    const { items, region, cliente, shippingAddress, shippingHouseNumber } = body;
    const safeClient = {
      nombre: cleanText(cliente?.nombre, 120),
      email: cleanText(cliente?.email, 180).toLowerCase(),
      telefono: cleanText(cliente?.telefono, 60) || undefined,
    };
    const safeAddress = fullAddress(cleanText(shippingAddress, 500), cleanText(shippingHouseNumber, 30));
    const safeBody: ExtendedCheckoutPayload = {
      ...body,
      cliente: safeClient,
      region: cleanText(region, 40),
      shippingAddress: safeAddress,
      shippingHouseNumber: undefined,
      paymentMethod: 'transfer',
      clientOrderKey: sanitizeOrderId(body.clientOrderKey),
    };

    const validationErrors = validateCheckoutPayload(safeBody);
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: 'Datos inválidos.', validationErrors }, { status: 422 });
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
    const id = safeBody.clientOrderKey || sanitizeOrderId(null);
    const now = new Date().toISOString();
    const shippingEstimate = estimateInternalShipping(hydratedItems, safeBody.region, safeAddress);
    const trackingToken = createOrderTrackingToken(id);
    const trackingUrl = `${getAppBaseUrl()}/pedido/${trackingToken}`;

    const { error: insertError } = await insforgeAdmin.database.from('orders').insert([{
      id,
      customer_name: safeClient.nombre,
      customer_email: safeClient.email,
      customer_phone: safeClient.telefono ?? null,
      region: safeBody.region,
      shipping_address: safeAddress || null,
      items: hydratedItems,
      subtotal: resumen.subtotal,
      tax: resumen.iva,
      shipping_fee: resumen.despacho,
      total: resumen.total,
      currency: resumen.moneda,
      status: 'pendiente_transferencia',
      payment_status: 'pending_transfer',
      created_at: now,
      updated_at: now,
    }]);

    if (insertError) {
      if (isDuplicateError(insertError)) {
        return NextResponse.json({ error: 'Esta orden ya fue registrada. Revisa el estado del pedido o intenta con un carrito nuevo.' }, { status: 409 });
      }
      return NextResponse.json({ error: `No se pudo registrar la orden: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({ data: { id, resumen, estado: 'pendiente_transferencia', creadoEn: now, cliente: safeClient, shippingAddress: safeAddress, deliveryEstimate: DELIVERY_WINDOW, trackingToken, trackingUrl }, payment: { method: 'transfer' }, shippingMode: shippingConfig.mode, notification: { ok: true, deferred: true, reason: 'Orden creada sin correo de confirmación. La boleta/correo final se envía solo cuando el pago sea validado.' }, admin: { shippingEstimate } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { insforgeAdmin } from '@/lib/insforge';
import { getMercadoPagoPayment, mapMercadoPagoStatus, verifyMercadoPagoSignature, type MercadoPagoPaymentResponse } from '@/lib/mercadopago';
import { loadOrderById, reconcileMercadoPagoPaymentRecord } from '@/lib/orders/paymentReconciliation';
import { releaseOrderReservation } from '@/lib/commerceReservations';

const MAX_WEBHOOK_BODY_BYTES = 64 * 1024;

type GenericPaymentWebhookBody = {
  eventType: string;
  orderId: string;
  paymentId?: string;
  status: 'succeeded' | 'failed' | 'refunded' | 'pending';
  amount?: number;
  currency?: string;
};

type MercadoPagoWebhookBody = {
  action?: string;
  type?: string;
  topic?: string;
  id?: string | number;
  data?: {
    id?: string | number;
    external_reference?: string;
    status?: string;
    payments?: Array<{ id?: string | number; status?: string }>;
  };
};

async function readLimitedBody(request: Request): Promise<string | null> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BODY_BYTES) return null;
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_WEBHOOK_BODY_BYTES) return null;
  return rawBody;
}

function safeCompareHex(expected: string, received: string) {
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(received.trim(), 'hex');
    return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function verifyLegacySignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYMENTS_WEBHOOK_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== 'production' && !signature;
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeCompareHex(expected, signature);
}

function isDuplicateError(error?: { message?: string; code?: string } | null) {
  return error?.code === '23505' || /duplicate|unique/i.test(error?.message || '');
}

async function claimWebhookLog(idempotencyKey: string, payload: unknown, orderId: string, paymentId: string | null, status: string, eventType: string) {
  const { error } = await insforgeAdmin.database.from('payment_webhooks').insert([{
    idempotency_key: idempotencyKey,
    event_type: eventType,
    order_id: orderId,
    payment_id: paymentId,
    payment_status: status,
    payload,
    created_at: new Date().toISOString(),
  }]);
  if (!error) return { duplicated: false };
  if (isDuplicateError(error)) return { duplicated: true };
  throw new Error(`No se pudo registrar idempotencia del webhook: ${error.message}`);
}

async function releaseWebhookClaim(idempotencyKey: string) {
  try {
    await insforgeAdmin.database.from('payment_webhooks').delete().eq('idempotency_key', idempotencyKey);
  } catch (error) {
    console.warn('[payments] could not release webhook claim', idempotencyKey, error);
  }
}

function safeJsonParse(rawBody: string): MercadoPagoWebhookBody | null {
  try { return rawBody ? JSON.parse(rawBody) as MercadoPagoWebhookBody : null; } catch { return null; }
}

function isMercadoPagoSimulation(body: MercadoPagoWebhookBody | null) {
  const action = body?.action || '';
  const eventType = body?.type || body?.topic || '';
  return action.startsWith('order.') || eventType === 'order' || eventType === 'merchant_order';
}

async function handleMercadoPagoWebhook(request: Request) {
  const url = new URL(request.url);
  const rawBody = await readLimitedBody(request);
  if (rawBody === null) return NextResponse.json({ error: 'Webhook demasiado grande.' }, { status: 413 });
  const body = safeJsonParse(rawBody);
  const topic = url.searchParams.get('topic') || url.searchParams.get('type') || body?.type || body?.topic || '';
  const dataId = url.searchParams.get('data.id') || url.searchParams.get('id') || (body?.data?.id != null ? String(body.data.id) : '') || (body?.id != null ? String(body.id) : '');
  const signatureHeader = request.headers.get('x-signature');
  const requestIdHeader = request.headers.get('x-request-id');

  if (isMercadoPagoSimulation(body) && topic !== 'payment') {
    return NextResponse.json({ ok: true, provider: 'mercado_pago', simulated: true, ignored: true, action: body?.action || topic, message: 'Evento de simulación/order ignorado; solamente payment puede mutar una orden.' }, { status: 200 });
  }

  if (!(await verifyMercadoPagoSignature({ signatureHeader, requestIdHeader, dataId }))) {
    return NextResponse.json({ error: 'Firma de Mercado Pago inválida o secreto no configurado.' }, { status: 401 });
  }

  if (topic && topic !== 'payment') return NextResponse.json({ ok: true, ignored: true, topic }, { status: 200 });
  if (!dataId) return NextResponse.json({ ok: true, ignored: true, message: 'Webhook recibido sin data.id de pago.' }, { status: 200 });

  const payment = await getMercadoPagoPayment(dataId);
  const orderId = payment.external_reference;
  if (!orderId) return NextResponse.json({ error: 'El pago no contiene external_reference.' }, { status: 400 });

  const paymentId = String(payment.id);
  const paymentStatus = payment.status || 'pending';
  const idempotencyKey = `mp:${paymentId}:${paymentStatus}`;
  const claim = await claimWebhookLog(idempotencyKey, payment, orderId, paymentId, paymentStatus, 'mercadopago.payment');
  if (claim.duplicated) return NextResponse.json({ ok: true, duplicated: true }, { status: 200 });

  try {
    const reconciled = await reconcileMercadoPagoPaymentRecord(payment, orderId, 'webhook');
    const stockCommitDuplicate = 'stockCommitDuplicate' in reconciled ? Boolean(reconciled.stockCommitDuplicate) : false;
    const warning = 'warning' in reconciled ? reconciled.warning : null;
    return NextResponse.json({
      ok: reconciled.ok,
      provider: 'mercado_pago',
      paymentId,
      orderId,
      paymentStatus,
      orderStatus: reconciled.orderStatus,
      alreadyPaid: reconciled.alreadyPaid,
      validation: reconciled.validation,
      stockCommitted: reconciled.stockCommitted,
      stockCommitDuplicate,
      reviewRequired: reconciled.reviewRequired,
      warning,
      notification: reconciled.orderStatus === 'en_preparacion' ? 'Pago validado y reserva comprometida. Pedido en preparación.' : reconciled.reviewRequired ? 'Pago retenido para revisión; no se confirmó la venta.' : 'Evento procesado sin confirmar una venta.',
    }, { status: 200 });
  } catch (error) {
    await releaseWebhookClaim(idempotencyKey);
    throw error;
  }
}

async function updateLegacyOrder(orderId: string, paymentId: string | null, status: string) {
  const mapped = status === 'failed' ? 'fallida' : status === 'refunded' ? 'reembolsada' : mapMercadoPagoStatus(status);
  const { error } = await insforgeAdmin.database.from('orders').update({
    status: mapped === 'pendiente' ? 'pendiente_pago' : mapped,
    payment_id: paymentId,
    payment_status: status,
    updated_at: new Date().toISOString(),
  }).eq('id', orderId);
  if (error) throw new Error(error.message || 'No se pudo actualizar la orden legacy.');
  return mapped === 'pendiente' ? 'pendiente_pago' : mapped;
}

async function handleLegacyWebhook(request: Request) {
  const rawBody = await readLimitedBody(request);
  if (rawBody === null) return NextResponse.json({ error: 'Webhook demasiado grande.' }, { status: 413 });
  const signature = request.headers.get('x-insforge-signature');
  const idempotencyKeyHeader = request.headers.get('x-idempotency-key') ?? null;

  if (!verifyLegacySignature(rawBody, signature)) return NextResponse.json({ error: 'Firma inválida o PAYMENTS_WEBHOOK_SECRET no configurado.' }, { status: 401 });

  const body = JSON.parse(rawBody) as GenericPaymentWebhookBody;
  if (!body.orderId || !body.eventType || !body.status) return NextResponse.json({ error: 'Payload incompleto.' }, { status: 400 });

  const order = await loadOrderById(body.orderId);
  if (!order) return NextResponse.json({ error: 'ORDER_NOT_FOUND_FOR_PAYMENT' }, { status: 404 });

  const effectiveIdempotency = idempotencyKeyHeader ?? `${body.orderId}:${body.paymentId ?? 'nopay'}:${body.status}`;
  const claim = await claimWebhookLog(effectiveIdempotency, body, body.orderId, body.paymentId ?? null, body.status, body.eventType);
  if (claim.duplicated) return NextResponse.json({ ok: true, duplicated: true }, { status: 200 });

  try {
    if (body.status === 'succeeded') {
      const syntheticPayment: MercadoPagoPaymentResponse = {
        id: body.paymentId || effectiveIdempotency,
        status: 'approved',
        external_reference: body.orderId,
        transaction_amount: body.amount,
        currency_id: body.currency,
      };
      const reconciled = await reconcileMercadoPagoPaymentRecord(syntheticPayment, body.orderId, 'legacy_webhook');
      return NextResponse.json({
        ok: reconciled.ok,
        orderUpdated: reconciled.orderStatus === 'en_preparacion',
        orderStatus: reconciled.orderStatus,
        validation: reconciled.validation,
        stockCommitted: reconciled.stockCommitted,
        reviewRequired: reconciled.reviewRequired,
      }, { status: 200 });
    }

    if (body.status === 'failed' || body.status === 'refunded') {
      await releaseOrderReservation(body.orderId, `legacy_${body.status}`).catch((error) => console.warn('[payments] legacy reservation release warning', error));
    }
    const orderStatus = await updateLegacyOrder(body.orderId, body.paymentId ?? null, body.status);
    return NextResponse.json({ ok: true, orderUpdated: true, orderStatus, stockCommitted: false }, { status: 200 });
  } catch (error) {
    await releaseWebhookClaim(effectiveIdempotency);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const source = url.searchParams.get('source');
    if (source === 'mercadopago' || request.headers.has('x-signature') || url.pathname.includes('/api/webhooks/mercadopago')) return await handleMercadoPagoWebhook(request);
    return await handleLegacyWebhook(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error procesando webhook de pago.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

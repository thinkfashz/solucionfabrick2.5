import { NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { insforge } from '@/lib/insforge';
import { getMercadoPagoPayment, mapMercadoPagoStatus, verifyMercadoPagoSignature } from '@/lib/mercadopago';
import { confirmPaidOrderAndSendReceiptAsync } from '@/lib/orders/paidConfirmation';
import { dispatchHookAsync } from '@/lib/extensionsBus';

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

function verifyLegacySignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYMENTS_WEBHOOK_SECRET;
  if (!secret || !signature) return true;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === signature;
}

async function persistWebhookLog(idempotencyKey: string, payload: unknown, orderId: string, paymentId: string | null, status: string, eventType: string) {
  const { data: existingLog } = await insforge.database
    .from('payment_webhooks')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .limit(1);

  if ((existingLog ?? []).length > 0) {
    return { duplicated: true };
  }

  await insforge.database.from('payment_webhooks').insert([
    {
      idempotency_key: idempotencyKey,
      event_type: eventType,
      order_id: orderId,
      payment_id: paymentId,
      payment_status: status,
      payload,
      created_at: new Date().toISOString(),
    },
  ]);

  return { duplicated: false };
}

async function updateOrderStatus(orderId: string, paymentId: string | null, status: string) {
  const mappedOrderStatus =
    status === 'succeeded'
      ? 'pagada'
      : status === 'failed'
        ? 'fallida'
        : status === 'refunded'
          ? 'reembolsada'
          : mapMercadoPagoStatus(status);

  const { error: updateError } = await insforge.database
    .from('orders')
    .update({
      status: mappedOrderStatus,
      payment_id: paymentId,
      payment_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  return {
    ok: !updateError,
    orderUpdated: !updateError,
    orderStatus: mappedOrderStatus,
    warning: updateError ? `No se actualizó orders: ${updateError.message}` : null,
  };
}

function safeJsonParse(rawBody: string): MercadoPagoWebhookBody | null {
  try {
    return rawBody ? JSON.parse(rawBody) as MercadoPagoWebhookBody : null;
  } catch {
    return null;
  }
}

function isMercadoPagoSimulation(body: MercadoPagoWebhookBody | null) {
  const action = body?.action || '';
  const eventType = body?.type || body?.topic || '';
  return action.startsWith('order.') || eventType === 'order' || eventType === 'merchant_order';
}

async function handleMercadoPagoWebhook(request: Request) {
  const url = new URL(request.url);
  const rawBody = await request.text();
  const body = safeJsonParse(rawBody);
  const topic = url.searchParams.get('topic') || url.searchParams.get('type') || body?.type || body?.topic || '';
  const dataId = url.searchParams.get('data.id') || url.searchParams.get('id') || (body?.data?.id != null ? String(body.data.id) : '') || (body?.id != null ? String(body.id) : '');
  const signatureHeader = request.headers.get('x-signature');
  const requestIdHeader = request.headers.get('x-request-id');

  // La simulación de Mercado Pago puede enviar order.processed/merchant_order.
  // Eso sirve para validar que la URL responde, pero no es el evento final de pago aprobado.
  // Respondemos 200 para que el panel deje de marcar 404/fallo.
  if (isMercadoPagoSimulation(body) && topic !== 'payment') {
    return NextResponse.json({
      ok: true,
      provider: 'mercado_pago',
      simulated: true,
      ignored: true,
      action: body?.action || topic,
      message: 'URL recibida correctamente. Evento de simulación/order ignorado; el pago real se procesa con evento payment.',
    }, { status: 200 });
  }

  if (!(await verifyMercadoPagoSignature({
    signatureHeader,
    requestIdHeader,
    dataId,
  }))) {
    return NextResponse.json({ error: 'Firma de Mercado Pago inválida.' }, { status: 401 });
  }

  if (topic && topic !== 'payment') {
    return NextResponse.json({ ok: true, ignored: true, topic }, { status: 200 });
  }

  if (!dataId) {
    return NextResponse.json({ ok: true, ignored: true, message: 'Webhook recibido sin data.id de pago.' }, { status: 200 });
  }

  const payment = await getMercadoPagoPayment(dataId);
  const orderId = payment.external_reference;

  if (!orderId) {
    return NextResponse.json({ error: 'El pago no contiene external_reference.' }, { status: 400 });
  }

  const paymentId = String(payment.id);
  const paymentStatus = payment.status || 'pending';
  const idempotencyKey = `mp:${paymentId}:${paymentStatus}`;

  const logResult = await persistWebhookLog(idempotencyKey, payment, orderId, paymentId, paymentStatus, 'mercadopago.payment');
  if (logResult.duplicated) {
    return NextResponse.json({ ok: true, duplicated: true }, { status: 200 });
  }

  const updated = await updateOrderStatus(orderId, paymentId, paymentStatus);

  if (updated.orderStatus === 'pagada') {
    confirmPaidOrderAndSendReceiptAsync(orderId);
    dispatchHookAsync('order.paid', {
      orderId,
      paymentId,
      paymentStatus,
      provider: 'mercadopago',
    });
  }

  return NextResponse.json({
    ok: updated.ok,
    provider: 'mercado_pago',
    paymentId,
    orderId,
    paymentStatus,
    orderStatus: updated.orderStatus,
    notification: updated.orderStatus === 'pagada' ? 'Correo con boleta PDF en proceso de envío.' : 'Pendiente de pago aprobado.',
    warning: updated.warning,
  });
}

async function handleLegacyWebhook(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-insforge-signature');
  const idempotencyKeyHeader = request.headers.get('x-idempotency-key') ?? null;

  if (!verifyLegacySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as GenericPaymentWebhookBody;
  if (!body.orderId || !body.eventType || !body.status) {
    return NextResponse.json({ error: 'Payload incompleto.' }, { status: 400 });
  }

  const effectiveIdempotency = idempotencyKeyHeader ?? `${body.orderId}:${body.paymentId ?? 'nopay'}:${body.status}`;
  const logResult = await persistWebhookLog(
    effectiveIdempotency,
    body,
    body.orderId,
    body.paymentId ?? null,
    body.status,
    body.eventType,
  );

  if (logResult.duplicated) {
    return NextResponse.json({ ok: true, duplicated: true }, { status: 200 });
  }

  const updated = await updateOrderStatus(body.orderId, body.paymentId ?? null, body.status);
  if (updated.orderStatus === 'pagada') {
    confirmPaidOrderAndSendReceiptAsync(body.orderId);
    dispatchHookAsync('order.paid', {
      orderId: body.orderId,
      paymentId: body.paymentId ?? null,
      paymentStatus: body.status,
      provider: 'legacy',
    });
  }

  return NextResponse.json({ ...updated, notification: updated.orderStatus === 'pagada' ? 'Correo con boleta PDF en proceso de envío.' : undefined }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const source = url.searchParams.get('source');
    if (source === 'mercadopago' || request.headers.has('x-signature') || url.pathname.includes('/api/webhooks/mercadopago')) {
      return await handleMercadoPagoWebhook(request);
    }

    return await handleLegacyWebhook(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error procesando webhook de pago.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

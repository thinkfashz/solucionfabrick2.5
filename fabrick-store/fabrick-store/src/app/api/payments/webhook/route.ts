import { NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { insforge } from '@/lib/insforge';

type PaymentWebhookBody = {
  eventType: string;
  orderId: string;
  paymentId?: string;
  status: 'succeeded' | 'failed' | 'refunded' | 'pending';
  amount?: number;
  currency?: string;
};

function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYMENTS_WEBHOOK_SECRET;
  if (!secret || !signature) return true;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === signature;
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-insforge-signature');
    const idempotencyKey = request.headers.get('x-idempotency-key') ?? null;

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as PaymentWebhookBody;
    if (!body.orderId || !body.eventType || !body.status) {
      return NextResponse.json({ error: 'Payload incompleto.' }, { status: 400 });
    }

    const effectiveIdempotency = idempotencyKey ?? `${body.orderId}:${body.paymentId ?? 'nopay'}:${body.status}`;

    // Intentar guardar log idempotente (si la tabla no existe, no bloquear flujo).
    const { data: existingLog } = await insforge.database
      .from('payment_webhooks')
      .select('id')
      .eq('idempotency_key', effectiveIdempotency)
      .limit(1);

    if ((existingLog ?? []).length > 0) {
      return NextResponse.json({ ok: true, duplicated: true }, { status: 200 });
    }

    await insforge.database.from('payment_webhooks').insert([
      {
        idempotency_key: effectiveIdempotency,
        event_type: body.eventType,
        order_id: body.orderId,
        payment_id: body.paymentId ?? null,
        payment_status: body.status,
        payload: body,
        created_at: new Date().toISOString(),
      },
    ]);

    const mappedOrderStatus =
      body.status === 'succeeded'
        ? 'pagada'
        : body.status === 'failed'
          ? 'fallida'
          : body.status === 'refunded'
            ? 'reembolsada'
            : 'pendiente_pago';

    const { error: updateError } = await insforge.database
      .from('orders')
      .update({
        status: mappedOrderStatus,
        payment_id: body.paymentId ?? null,
        payment_status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.orderId);

    return NextResponse.json(
      {
        ok: !updateError,
        orderUpdated: !updateError,
        orderStatus: mappedOrderStatus,
        warning: updateError ? `No se actualizó orders: ${updateError.message}` : null,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: 'Error procesando webhook de pago.' }, { status: 500 });
  }
}

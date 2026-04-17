import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

interface PayerIdentification {
  type: string;
  number: string;
}

interface Payer {
  email: string;
  identification?: PayerIdentification;
}

interface CreatePaymentBody {
  token: string;
  payment_method_id: string;
  issuer_id: string;
  installments: number;
  payer: Payer;
  amount: number;
  orderId: string;
  description?: string;
}

interface MercadoPagoPaymentResponse {
  id: number;
  status: string;
  status_detail: string;
  error?: string;
  message?: string;
  cause?: Array<{ code: string; description: string }>;
}

export async function POST(request: Request): Promise<NextResponse> {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: 'MP_ACCESS_TOKEN no configurado.' }, { status: 500 });
  }

  let body: CreatePaymentBody;
  try {
    body = (await request.json()) as CreatePaymentBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { token, payment_method_id, issuer_id, installments, payer, amount, orderId, description } = body;

  let mpResponse: MercadoPagoPaymentResponse;
  try {
    const res = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Idempotency-Key': `${orderId}-${token}`,
      },
      body: JSON.stringify({
        transaction_amount: amount,
        token,
        description: description ?? '',
        installments,
        payment_method_id,
        issuer_id,
        payer,
      }),
    });

    mpResponse = (await res.json()) as MercadoPagoPaymentResponse;

    if (!res.ok) {
      const detail = mpResponse.message ?? mpResponse.error ?? 'Error en MercadoPago.';
      return NextResponse.json(
        { ok: false, status: mpResponse.status ?? 'error', paymentId: null, detail, error: detail },
        { status: 400 },
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido al llamar a MercadoPago.';
    return NextResponse.json({ ok: false, status: 'error', paymentId: null, detail: null, error: message }, { status: 500 });
  }

  const mpPaymentId = String(mpResponse.id);
  const mpStatus = mpResponse.status;

  if (mpStatus === 'approved') {
    const { error: dbError } = await insforge.database
      .from('orders')
      .update({
        status: 'pagada',
        payment_id: mpPaymentId,
        payment_status: mpStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (dbError) {
      return NextResponse.json(
        {
          ok: false,
          status: mpStatus,
          paymentId: mpPaymentId,
          detail: `Pago aprobado pero error al actualizar la orden: ${dbError.message}`,
          error: 'db_update_failed',
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    ok: mpStatus === 'approved',
    status: mpStatus,
    paymentId: mpPaymentId,
    detail: mpResponse.status_detail ?? null,
  });
}

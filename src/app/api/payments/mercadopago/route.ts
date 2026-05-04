import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getMercadoPagoAccessToken } from '@/lib/mercadopago';
import { getMercadoPagoCredentials } from '@/lib/mercadoPagoCredentials';
import { mapMercadoPagoStatusDetail } from '@/lib/mercadopagoStatus';
import { insforge } from '@/lib/insforge';

/**
 * Server-side direct card payment via Mercado Pago using a card token created
 * on the client with `mp.createCardToken(...)`.
 *
 * The client is expected to call this endpoint AFTER `/api/checkout` has
 * created the order, so we pass `external_reference` (the order id) into MP and
 * also update the matching `orders` row with the resulting payment status. This
 * means the user-visible state of the order ALWAYS tracks what Mercado Pago
 * actually returned — never an optimistic "approved" written by the client.
 */
export async function POST(request: Request) {
  try {
    const resolved = await getMercadoPagoCredentials();
    const accessToken = resolved.accessToken ?? getMercadoPagoAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        {
          error: 'Pasarela de pago no configurada en el servidor.',
          code: 'mp_not_configured',
        },
        { status: 503 },
      );
    }

    const body = await request.json();
    const { token, amount, description, email, installments, externalReference } = body;

    if (!token || !amount || !email) {
      return NextResponse.json(
        { error: 'Datos incompletos para procesar el pago.', code: 'invalid_payload' },
        { status: 400 },
      );
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: 'El monto del pago debe ser un número positivo.', code: 'invalid_amount' },
        { status: 400 },
      );
    }

    const mp = new MercadoPagoConfig({ accessToken, options: { timeout: 10_000 } });
    const payment = new Payment(mp);

    let response;
    try {
      response = await payment.create({
        body: {
          transaction_amount: numericAmount,
          token,
          description: description || 'Compra en Fabrick Store',
          installments: Number(installments) || 1,
          payment_method_id: body.payment_method_id || 'visa',
          payer: { email },
          external_reference: externalReference ? String(externalReference) : undefined,
          binary_mode: false,
        },
      });
    } catch (mpErr) {
      // SDK throws on 4xx — typically validation/tokenization issues that
      // surface as a hard rejection. Surface it as a payment rejection so the
      // UI can show the rejection screen.
      const detail = mpErr instanceof Error ? mpErr.message : 'mp_sdk_error';
      return NextResponse.json(
        {
          status: 'rejected',
          statusDetail: detail,
          message: 'No se pudo procesar el cobro con Mercado Pago.',
          code: 'mp_request_failed',
        },
        { status: 422 },
      );
    }

    const mpStatus = (response.status ?? 'rejected') as string;
    const mpStatusDetail = response.status_detail ?? null;
    const mpPaymentId = response.id != null ? String(response.id) : null;

    // Persist the outcome on the matching order so the admin sees the same
    // truth as the buyer. Failures here MUST NOT leak back to the buyer
    // because the payment itself is already authoritative — log and continue.
    if (externalReference) {
      try {
        const orderStatus =
          mpStatus === 'approved'
            ? 'pagada'
            : mpStatus === 'pending' || mpStatus === 'in_process' || mpStatus === 'authorized'
              ? 'pendiente_pago'
              : 'rechazada';
        await insforge.database
          .from('orders')
          .update({
            status: orderStatus,
            payment_id: mpPaymentId,
            payment_status: mpStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', String(externalReference));
      } catch (persistErr) {
        // eslint-disable-next-line no-console
        console.warn('[mp] could not persist order status:', persistErr);
      }
    }

    if (mpStatus === 'approved') {
      return NextResponse.json({
        status: mpStatus,
        statusDetail: mpStatusDetail,
        paymentId: mpPaymentId,
        message: '¡Pago aprobado!',
      });
    }

    if (mpStatus === 'pending' || mpStatus === 'in_process' || mpStatus === 'authorized') {
      return NextResponse.json(
        {
          status: mpStatus,
          statusDetail: mpStatusDetail,
          paymentId: mpPaymentId,
          message: 'Pago en proceso. Te confirmaremos por email cuando se acredite.',
        },
        { status: 202 },
      );
    }

    return NextResponse.json(
      {
        status: mpStatus,
        statusDetail: mpStatusDetail,
        paymentId: mpPaymentId,
        message: mapMercadoPagoStatusDetail(mpStatusDetail),
        code: 'payment_rejected',
      },
      { status: 422 },
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Error al procesar el pago';
    return NextResponse.json(
      { error: errMsg, code: 'server_error' },
      { status: 500 },
    );
  }
}

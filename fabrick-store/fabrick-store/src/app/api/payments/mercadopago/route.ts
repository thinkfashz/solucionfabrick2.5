import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

export async function POST(request: Request) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: 'Pasarela de pago no configurada en el servidor.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      token,
      amount,
      description,
      email,
      installments,
    } = body;

    if (!token || !amount || !email) {
      return NextResponse.json({ error: 'Datos incompletos para procesar el pago.' }, { status: 400 });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'El monto del pago debe ser un número positivo.' }, { status: 400 });
    }

    const mp = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
    const payment = new Payment(mp);
    const response = await payment.create({
      body: {
        transaction_amount: numericAmount,
        token,
        description: description || 'Compra en Fabrick Store',
        installments: Number(installments) || 1,
        payment_method_id: body.payment_method_id || 'visa',
        payer: { email },
      }
    });

    if (response.status === 'approved') {
      return NextResponse.json({
        success: true,
        status: response.status,
        orderId: response.id,
        message: '¡Pago aprobado exitosamente!'
      });
    } else if (response.status === 'pending' || response.status === 'in_process') {
      return NextResponse.json({
        success: true,
        status: response.status,
        orderId: response.id,
        message: 'Pago en proceso. Te notificaremos por email.'
      });
    } else {
      return NextResponse.json({
        error: 'Pago rechazado. Verifica los datos de tu tarjeta.',
        status: response.status,
        detail: response.status_detail
      }, { status: 422 });
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Error al procesar el pago';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN ?? 'TEST-ACCESS-TOKEN',
  options: { timeout: 5000 }
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      token,        // Card token from frontend tokenization
      amount,       // Amount in CLP
      description,  // Product description
      email,        // Payer email
      installments, // Number of installments (default 1)
    } = body;

    if (!token || !amount || !email) {
      return NextResponse.json({ error: 'Datos incompletos para procesar el pago.' }, { status: 400 });
    }

    const payment = new Payment(mp);
    const response = await payment.create({
      body: {
        transaction_amount: Number(amount),
        token: token,
        description: description || 'Compra en Fabrick Store',
        installments: Number(installments) || 1,
        payment_method_id: body.payment_method_id || 'visa',
        payer: { email: email },
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

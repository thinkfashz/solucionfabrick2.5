import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { calculateCheckoutSummary, validateCheckoutPayload, type CheckoutPayload } from '@/lib/checkout';

export async function POST(request: Request) {
  try {
    const body: CheckoutPayload = await request.json();
    const { items, region, cliente, shippingAddress } = body;

    const validationErrors = validateCheckoutPayload(body);
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: 'Datos inválidos.', validationErrors }, { status: 422 });
    }

    const resumen = calculateCheckoutSummary(items, region);
    const id = `FBK-T-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const now = new Date().toISOString();

    const { error: insertError } = await insforge.database
      .from('orders')
      .insert([
        {
          id,
          customer_name: cliente.nombre,
          customer_email: cliente.email,
          customer_phone: cliente.telefono ?? null,
          region,
          shipping_address: shippingAddress ?? null,
          items,
          subtotal: resumen.subtotal,
          tax: resumen.iva,
          shipping_fee: resumen.despacho,
          total: resumen.total,
          currency: resumen.moneda,
          status: 'pendiente_transferencia',
          created_at: now,
          updated_at: now,
        },
      ]);

    if (insertError) {
      return NextResponse.json(
        { error: `No se pudo registrar la orden: ${insertError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        data: {
          id,
          resumen,
          estado: 'pendiente_transferencia',
          creadoEn: now,
          cliente,
        },
        payment: { method: 'transfer' },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

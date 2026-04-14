import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { calculateCheckoutSummary, validateCheckoutPayload, type CheckoutPayload } from '@/lib/checkout';

export async function POST(request: Request) {
  try {
    const body: CheckoutPayload = await request.json();
    const { items, region, cliente, shippingAddress } = body;

    const validationErrors = validateCheckoutPayload(body);
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: 'Datos inválidos para checkout.', validationErrors }, { status: 422 });
    }

    const resumen = calculateCheckoutSummary(items, region);
    const id = `FBK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const orden = {
      id,
      cliente,
      items,
      resumen,
      shippingAddress: shippingAddress ?? '',
      region,
      estado: 'pendiente_pago',
      creadoEn: new Date().toISOString(),
    };

    let persisted = false;
    let persistenceWarning: string | null = null;

    const { error: insertError } = await insforge.database
      .from('orders')
      .insert([
        {
          id: orden.id,
          customer_name: cliente.nombre,
          customer_email: cliente.email,
          customer_phone: cliente.telefono ?? null,
          region: region,
          shipping_address: shippingAddress ?? null,
          items: items,
          subtotal: resumen.subtotal,
          tax: resumen.iva,
          shipping_fee: resumen.despacho,
          total: resumen.total,
          currency: resumen.moneda,
          status: orden.estado,
          created_at: orden.creadoEn,
        },
      ]);

    if (insertError) {
      persistenceWarning = `No se pudo persistir en DB (orders): ${insertError.message}`;
    } else {
      persisted = true;
    }

    return NextResponse.json(
      {
        data: orden,
        persistence: persisted ? 'db' : 'memory',
        warning: persistenceWarning,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Error interno al procesar el checkout.' }, { status: 500 });
  }
}

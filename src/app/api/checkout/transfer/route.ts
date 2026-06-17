import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { calculateCheckoutSummary, estimateInternalShipping, validateCheckoutPayload, type CheckoutPayload } from '@/lib/checkout';
import { getAppBaseUrl } from '@/lib/mercadopago';
import { createOrderTrackingToken } from '@/lib/orderTracking';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DELIVERY_WINDOW = '7 a 21 días hábiles';

type ExtendedCheckoutPayload = CheckoutPayload & {
  shippingHouseNumber?: string;
  paymentMethod?: string;
};

function fullAddress(address?: string, number?: string) {
  return [address, number ? `N° ${number}` : ''].filter(Boolean).join(' · ');
}

export async function POST(request: Request) {
  try {
    const body: ExtendedCheckoutPayload = await request.json();
    const { items, region, cliente, shippingAddress, shippingHouseNumber } = body;

    const validationErrors = validateCheckoutPayload(body);
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: 'Datos inválidos.', validationErrors }, { status: 422 });
    }

    const resumen = calculateCheckoutSummary(items, region);
    const id = body.clientOrderKey?.trim() || `FBK-T-${Date.now()}-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
    const now = new Date().toISOString();
    const address = fullAddress(shippingAddress, shippingHouseNumber);
    const shippingEstimate = estimateInternalShipping(items, region, address);
    const trackingToken = createOrderTrackingToken(id);
    const trackingUrl = `${getAppBaseUrl()}/pedido/${trackingToken}`;

    const { error: insertError } = await insforge.database
      .from('orders')
      .insert([
        {
          id,
          customer_name: cliente.nombre,
          customer_email: cliente.email,
          customer_phone: cliente.telefono ?? null,
          region,
          shipping_address: address || null,
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
      return NextResponse.json({ error: `No se pudo registrar la orden: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json(
      {
        data: {
          id,
          resumen,
          estado: 'pendiente_transferencia',
          creadoEn: now,
          cliente,
          shippingAddress: address,
          deliveryEstimate: DELIVERY_WINDOW,
          trackingToken,
          trackingUrl,
        },
        payment: { method: 'transfer' },
        notification: {
          ok: true,
          deferred: true,
          reason: 'Orden creada sin correo de confirmación. La boleta/correo final se envía solo cuando el pago sea validado.',
        },
        admin: { shippingEstimate },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { calculateCheckoutSummary, validateCheckoutPayload, type CheckoutPayload } from '@/lib/checkout';
import { CheckoutHydrationError, hydrateCheckoutItemsWithShipping } from '@/lib/checkoutServer';
import { getShippingConfig } from '@/lib/shippingServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body: CheckoutPayload = await request.json();
    const errors = validateCheckoutPayload(body);

    if (errors.length > 0) {
      return NextResponse.json({ valid: false, errors }, { status: 422 });
    }

    let hydratedItems;
    try {
      hydratedItems = await hydrateCheckoutItemsWithShipping(body.items);
    } catch (error) {
      if (error instanceof CheckoutHydrationError) {
        return NextResponse.json({ valid: false, errors: [{ field: 'items', message: error.message }] }, { status: error.status });
      }
      throw error;
    }

    const shippingConfig = await getShippingConfig();
    const summary = calculateCheckoutSummary(hydratedItems, body.region, shippingConfig);

    return NextResponse.json({ valid: true, summary, errors: [] }, { status: 200 });
  } catch {
    return NextResponse.json({ valid: false, errors: [{ field: 'body', message: 'No se pudo validar el checkout con el catálogo actual.' }] }, { status: 400 });
  }
}

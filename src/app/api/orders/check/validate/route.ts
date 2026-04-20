import { NextResponse } from 'next/server';
import { calculateCheckoutSummary, validateCheckoutPayload, type CheckoutPayload } from '@/lib/checkout';

export async function POST(request: Request) {
  try {
    const body: CheckoutPayload = await request.json();
    const errors = validateCheckoutPayload(body);

    if (errors.length > 0) {
      return NextResponse.json({ valid: false, errors }, { status: 422 });
    }

    const summary = calculateCheckoutSummary(body.items, body.region);
    return NextResponse.json({ valid: true, summary, errors: [] }, { status: 200 });
  } catch {
    return NextResponse.json({ valid: false, errors: [{ field: 'body', message: 'Payload inválido.' }] }, { status: 400 });
  }
}

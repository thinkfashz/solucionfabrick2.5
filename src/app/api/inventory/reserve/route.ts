import { NextResponse } from 'next/server';
import { reserveStock } from '@/lib/inventory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/inventory/reserve
 *
 * Body:
 *   { items: [{ variant_id, qty, warehouse_id? }], order_id?, user? }
 *
 * Reserves the requested quantity for each variant. Returns 409 if any item
 * cannot be fully reserved. The route does NOT roll back partial successes
 * automatically — callers (checkout) must call `/release` on failure.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      items?: Array<{ variant_id: string; qty: number; warehouse_id?: string | null }>;
      order_id?: string | null;
      user?: string | null;
    };

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ ok: false, error: 'items_required' }, { status: 400 });
    }

    const results = [];
    for (const item of items) {
      const r = await reserveStock({
        variantId: item.variant_id,
        warehouseId: item.warehouse_id ?? null,
        qty: item.qty,
        orderId: body.order_id ?? null,
        user: body.user ?? null,
      });
      results.push(r);
    }

    const allOk = results.every((r) => r.ok);
    return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 409 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'reserve_failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

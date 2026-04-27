import { NextResponse } from 'next/server';
import { releaseReservation } from '@/lib/inventory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/inventory/release
 *
 * Inverse of `/api/inventory/reserve`. Used when a checkout fails before MP
 * approval, or when the MP webhook reports `rejected`.
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
      const r = await releaseReservation({
        variantId: item.variant_id,
        warehouseId: item.warehouse_id ?? null,
        qty: item.qty,
        orderId: body.order_id ?? null,
        user: body.user ?? null,
      });
      results.push(r);
    }

    return NextResponse.json({ ok: results.every((r) => r.ok), results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'release_failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

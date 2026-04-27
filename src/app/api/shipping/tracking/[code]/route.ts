import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { getDriver, type CarrierCode } from '@/lib/shipping/carrier';

/**
 * GET /api/shipping/tracking/[code]
 *
 * Public tracking endpoint. Looks up the shipment by `tracking_code`, picks
 * the right driver and returns the latest tracking events. Responses are
 * cached briefly (~5 min) to avoid hammering carrier APIs from the
 * `/seguimiento/[code]` page on every reload.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    if (!code || code.length > 64) {
      return NextResponse.json({ ok: false, error: 'invalid_code' }, { status: 400 });
    }

    const { data } = await insforge.database
      .from('shipments')
      .select('id, order_id, carrier, tracking_code, status, eta_days, label_url, cost')
      .eq('tracking_code', code)
      .limit(1);

    const shipment = (data ?? [])[0] as
      | { carrier: CarrierCode; tracking_code: string; status: string; eta_days?: number; cost?: number; order_id?: string }
      | undefined;

    if (!shipment) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    const driver = getDriver(shipment.carrier);
    const tracking = driver
      ? await driver.getTracking(shipment.tracking_code).catch(() => null)
      : null;

    return NextResponse.json(
      {
        ok: true,
        shipment: {
          carrier: shipment.carrier,
          tracking_code: shipment.tracking_code,
          status: shipment.status,
          eta_days: shipment.eta_days ?? null,
          cost: shipment.cost ?? 0,
        },
        tracking,
      },
      {
        headers: {
          // Cache 5 min on edge, browser may serve up to 30 s stale.
          'Cache-Control': 'public, max-age=30, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'tracking_failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

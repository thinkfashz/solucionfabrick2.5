import { NextResponse } from 'next/server';
import { quoteAll, type QuoteRequest } from '@/lib/shipping/carrier';

/**
 * POST /api/shipping/quote
 * Returns shipping quotes from every configured carrier (mock fallback used
 * when nothing else is configured). Body shape:
 *
 *   {
 *     destination: { region, comuna, calle?, numero?, zip? },
 *     items: [{ sku?, qty, weight_g?, length_cm?, width_cm?, height_cm? }],
 *     origin?: { region, comuna }
 *   }
 *
 * Response:
 *   { ok, quotes: [...], cheapest, fastest, errors: [...] }
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_ORIGIN = {
  region: process.env.SHIPPING_ORIGIN_REGION || 'Maule',
  comuna: process.env.SHIPPING_ORIGIN_COMUNA || 'Linares',
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<QuoteRequest>;
    const destination = body.destination;
    const items = Array.isArray(body.items) ? body.items : [];

    if (!destination?.region || !destination?.comuna) {
      return NextResponse.json(
        { ok: false, error: 'destination.region y destination.comuna son requeridos' },
        { status: 400 },
      );
    }
    if (items.length === 0) {
      return NextResponse.json({ ok: false, error: 'items vacío' }, { status: 400 });
    }

    const safeItems = items
      .filter((it) => it && Number.isFinite(it.qty) && (it.qty as number) > 0)
      .slice(0, 100);

    const { quotes, errors } = await quoteAll({
      origin: body.origin ?? DEFAULT_ORIGIN,
      destination,
      items: safeItems,
    });

    const cheapest = quotes[0] ?? null;
    const fastest = [...quotes].sort((a, b) => a.eta_days_min - b.eta_days_min)[0] ?? null;

    return NextResponse.json({
      ok: true,
      quotes,
      cheapest,
      fastest,
      errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'shipping_quote_failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { CURRENCIES, isCurrencyCode, readCurrencyCookie } from '@/lib/money';
import { insforge } from '@/lib/insforge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/currency/status
 *
 * Returns the currently selected currency (from cookie) and the latest known
 * exchange rate vs CLP. Used by the header currency switcher so the UI can
 * render prices without a round-trip on each navigation.
 */
export async function GET(request: Request) {
  const current = readCurrencyCookie(request.headers.get('cookie'));

  let rate: number | null = current === 'CLP' ? 1 : null;
  let fetchedAt: string | null = null;

  if (current !== 'CLP') {
    const { data } = await insforge.database
      .from('exchange_rates')
      .select('rate, fetched_at')
      .eq('base', 'CLP')
      .eq('quote', current)
      .order('fetched_at', { ascending: false })
      .limit(1);
    const row = (data ?? [])[0] as { rate: number; fetched_at: string } | undefined;
    if (row) {
      rate = Number(row.rate);
      fetchedAt = row.fetched_at;
    }
  }

  return NextResponse.json({
    ok: true,
    current,
    rate,
    fetched_at: fetchedAt,
    available: Object.values(CURRENCIES).map((c) => ({
      code: c.code,
      symbol: c.symbol,
      decimals: c.decimals,
    })),
  });
}

/**
 * POST /api/currency/status — sets the selected currency cookie.
 * Body: { currency: 'CLP' | 'USD' | 'EUR' | 'UF' }.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { currency?: string };
  if (!isCurrencyCode(body.currency)) {
    return NextResponse.json({ ok: false, error: 'invalid_currency' }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, currency: body.currency });
  res.cookies.set('fabrick_currency', body.currency, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

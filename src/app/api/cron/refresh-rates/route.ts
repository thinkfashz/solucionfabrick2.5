import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/cron/refresh-rates
 *
 * Vercel cron job (configurable in `vercel.json`) that refreshes the
 * `exchange_rates` table from `mindicador.cl`. The Banco Central data is
 * authoritative for Chile and includes the UF, USD and EUR official values.
 *
 * Auth: when `CRON_SECRET` is set, callers must supply
 * `Authorization: Bearer <secret>`. Vercel cron sends this header
 * automatically when configured.
 */
const SOURCE = 'https://mindicador.cl/api';
const QUOTES = ['USD', 'EUR', 'UF'] as const;

interface MindicadorIndicator {
  serie?: Array<{ valor?: number; fecha?: string }>;
}

async function fetchMindicador(quote: string): Promise<{ rate: number; fetchedAt: string } | null> {
  const url = `${SOURCE}/${quote.toLowerCase()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = (await res.json()) as MindicadorIndicator;
  const point = json.serie?.[0];
  if (!point?.valor || !point?.fecha) return null;
  // Mindicador returns CLP value of 1 unit of `quote`. We store
  // `rate = 1 CLP = X quote` so amountQuote = amountClp * rate.
  const valorClpPorUnidad = Number(point.valor);
  if (!Number.isFinite(valorClpPorUnidad) || valorClpPorUnidad <= 0) return null;
  return { rate: 1 / valorClpPorUnidad, fetchedAt: new Date(point.fecha).toISOString() };
}

function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${cronSecret}`) return unauthorized();
  }

  const inserted: string[] = [];
  const errors: Array<{ quote: string; error: string }> = [];

  for (const quote of QUOTES) {
    try {
      const data = await fetchMindicador(quote);
      if (!data) {
        errors.push({ quote, error: 'no_data' });
        continue;
      }
      const { error: insertError } = await insforge.database.from('exchange_rates').insert([
        {
          base: 'CLP',
          quote,
          rate: data.rate,
          source: 'mindicador.cl',
          fetched_at: data.fetchedAt,
        },
      ]);
      if (insertError) errors.push({ quote, error: insertError.message });
      else inserted.push(quote);
    } catch (err) {
      errors.push({ quote, error: err instanceof Error ? err.message : 'failed' });
    }
  }

  return NextResponse.json({ ok: errors.length === 0, inserted, errors });
}

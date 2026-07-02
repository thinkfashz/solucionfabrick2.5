export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { DEFAULT_SERVICE_PRICES, mergeServicePrices } from '@/lib/servicePricing';

interface DbServicePriceRow {
  slug?: string;
  name?: string;
  unit?: string;
  base_price?: number;
  market_min?: number;
  market_max?: number;
  materials_pct?: number;
  labor_pct?: number;
  logistics_pct?: number;
  contingency_pct?: number;
  disclaimer?: string;
  updated_at?: string;
}

function normalizeRow(row: DbServicePriceRow) {
  return {
    slug: row.slug,
    name: row.name,
    unit: row.unit,
    basePrice: Number(row.base_price ?? 0),
    marketMin: Number(row.market_min ?? 0),
    marketMax: Number(row.market_max ?? 0),
    materialsPct: Number(row.materials_pct ?? 0),
    laborPct: Number(row.labor_pct ?? 0),
    logisticsPct: Number(row.logistics_pct ?? 0),
    contingencyPct: Number(row.contingency_pct ?? 0),
    disclaimer: row.disclaimer,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  try {
    const { data, error } = await insforgeAdmin.database
      .from('service_price_settings')
      .select('*')
      .order('slug', { ascending: true });

    if (error) throw error;

    const merged = mergeServicePrices(((data ?? []) as DbServicePriceRow[]).map(normalizeRow));
    const prices = slug ? merged.filter((item) => item.slug === slug) : merged;
    return NextResponse.json(
      { ok: true, source: data?.length ? 'database' : 'defaults', prices },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    );
  } catch (err) {
    const prices = slug
      ? DEFAULT_SERVICE_PRICES.filter((item) => item.slug === slug)
      : DEFAULT_SERVICE_PRICES;
    return NextResponse.json(
      {
        ok: true,
        source: 'defaults',
        prices,
        warning: err instanceof Error ? err.message : 'No se pudo leer service_price_settings.',
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    );
  }
}

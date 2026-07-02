export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { DEFAULT_SERVICE_PRICES, mergeServicePrices, type ServicePriceSetting, type ServiceUnit } from '@/lib/servicePricing';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function resolveApiKey() {
  return process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';
}

function sqlText(value: unknown) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNum(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : '0';
}

async function runRawSql(query: string) {
  const url = `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': resolveApiKey() },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(30_000),
    cache: 'no-store',
  });
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

function rows(result: { data: unknown }): Record<string, unknown>[] {
  return (result.data as { data?: { rows?: Record<string, unknown>[] } } | null)?.data?.rows ?? [];
}

function normalizeRow(row: Record<string, unknown>): Partial<ServicePriceSetting> {
  return {
    slug: String(row.slug ?? ''),
    name: String(row.name ?? ''),
    unit: String(row.unit ?? 'm2') as ServiceUnit,
    basePrice: Number(row.base_price ?? 0),
    marketMin: Number(row.market_min ?? 0),
    marketMax: Number(row.market_max ?? 0),
    materialsPct: Number(row.materials_pct ?? 0),
    laborPct: Number(row.labor_pct ?? 0),
    logisticsPct: Number(row.logistics_pct ?? 0),
    contingencyPct: Number(row.contingency_pct ?? 0),
    disclaimer: String(row.disclaimer ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

function insertValues(p: ServicePriceSetting) {
  return `(
    ${sqlText(p.slug)}, ${sqlText(p.name)}, ${sqlText(p.unit)}, ${sqlNum(p.basePrice)}, ${sqlNum(p.marketMin)}, ${sqlNum(p.marketMax)},
    ${sqlNum(p.materialsPct)}, ${sqlNum(p.laborPct)}, ${sqlNum(p.logisticsPct)}, ${sqlNum(p.contingencyPct)}, ${sqlText(p.disclaimer)}, NOW()
  )`;
}

async function ensureTableAndDefaults() {
  const create = await runRawSql(`
    CREATE TABLE IF NOT EXISTS service_price_settings (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'm2',
      base_price BIGINT NOT NULL DEFAULT 0,
      market_min BIGINT NOT NULL DEFAULT 0,
      market_max BIGINT NOT NULL DEFAULT 0,
      materials_pct NUMERIC NOT NULL DEFAULT 0.45,
      labor_pct NUMERIC NOT NULL DEFAULT 0.40,
      logistics_pct NUMERIC NOT NULL DEFAULT 0.08,
      contingency_pct NUMERIC NOT NULL DEFAULT 0.07,
      disclaimer TEXT DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  if (!create.ok) return create;

  const seed = await runRawSql(`
    INSERT INTO service_price_settings
      (slug, name, unit, base_price, market_min, market_max, materials_pct, labor_pct, logistics_pct, contingency_pct, disclaimer, updated_at)
    VALUES ${DEFAULT_SERVICE_PRICES.map(insertValues).join(',')}
    ON CONFLICT (slug) DO NOTHING
  `);
  return seed;
}

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  const setup = await ensureTableAndDefaults();
  if (!setup.ok) {
    return NextResponse.json({ error: 'No se pudo preparar service_price_settings', detail: setup.data }, { status: 500 });
  }

  const result = await runRawSql('SELECT * FROM service_price_settings ORDER BY slug ASC');
  if (!result.ok) return NextResponse.json({ error: 'No se pudieron leer precios', detail: result.data }, { status: 500 });

  return NextResponse.json({ ok: true, prices: mergeServicePrices(rows(result).map(normalizeRow)) });
}

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  let body: Partial<ServicePriceSetting>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!body.slug || !body.name || !body.unit) {
    return NextResponse.json({ error: 'slug, name y unit son requeridos' }, { status: 400 });
  }

  const allowedUnits: ServiceUnit[] = ['m2', 'ml', 'm3', 'punto', 'unidad'];
  if (!allowedUnits.includes(body.unit)) {
    return NextResponse.json({ error: 'Unidad inválida' }, { status: 400 });
  }

  const setup = await ensureTableAndDefaults();
  if (!setup.ok) {
    return NextResponse.json({ error: 'No se pudo preparar service_price_settings', detail: setup.data }, { status: 500 });
  }

  const result = await runRawSql(`
    INSERT INTO service_price_settings
      (slug, name, unit, base_price, market_min, market_max, materials_pct, labor_pct, logistics_pct, contingency_pct, disclaimer, updated_at)
    VALUES (
      ${sqlText(body.slug)},
      ${sqlText(body.name)},
      ${sqlText(body.unit)},
      ${sqlNum(body.basePrice)},
      ${sqlNum(body.marketMin)},
      ${sqlNum(body.marketMax)},
      ${sqlNum(body.materialsPct)},
      ${sqlNum(body.laborPct)},
      ${sqlNum(body.logisticsPct)},
      ${sqlNum(body.contingencyPct)},
      ${sqlText(body.disclaimer)},
      NOW()
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      unit = EXCLUDED.unit,
      base_price = EXCLUDED.base_price,
      market_min = EXCLUDED.market_min,
      market_max = EXCLUDED.market_max,
      materials_pct = EXCLUDED.materials_pct,
      labor_pct = EXCLUDED.labor_pct,
      logistics_pct = EXCLUDED.logistics_pct,
      contingency_pct = EXCLUDED.contingency_pct,
      disclaimer = EXCLUDED.disclaimer,
      updated_at = NOW()
    RETURNING *
  `);

  if (!result.ok) return NextResponse.json({ error: 'No se pudo guardar precio', detail: result.data }, { status: 500 });
  return NextResponse.json({ ok: true, price: normalizeRow(rows(result)[0] ?? {}) });
}

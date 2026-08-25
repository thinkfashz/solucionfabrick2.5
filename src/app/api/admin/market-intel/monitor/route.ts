import { NextResponse, type NextRequest } from 'next/server';
import { getAdminTenantId } from '@/lib/adminApi';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { recordAdminAudit, recordAdminFailure } from '@/lib/adminAudit';
import { insforgeAdmin } from '@/lib/insforge';
import { aggregateProductRefs, type MarketSource } from '@/lib/marketIntel';
import {
  compareMarketSnapshotForTenant,
  persistMarketSnapshotForTenant,
} from '@/lib/marketIntelTenantStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PRODUCT_SELECT = 'id, name, price, supplier_price, stock, activo, image_url, source, source_url, source_id, specifications, created_at';
const VALID_SOURCES = new Set<MarketSource>(['mercadolibre', 'serper', 'serpapi']);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function monitoredRow(row: Record<string, unknown>) {
  const specifications = record(row.specifications);
  const marketIntel = record(specifications.market_intel);
  if (!Object.keys(marketIntel).length) return null;
  return {
    id: String(row.id || ''),
    name: String(row.name || ''),
    price: numberValue(row.price),
    supplierPrice: row.supplier_price == null ? null : numberValue(row.supplier_price),
    stock: row.stock == null ? null : numberValue(row.stock),
    active: row.activo === true,
    imageUrl: row.image_url ? String(row.image_url) : null,
    source: row.source ? String(row.source) : null,
    sourceUrl: row.source_url ? String(row.source_url) : null,
    sourceId: row.source_id ? String(row.source_id) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    marketIntel,
  };
}

function resolveSources(marketIntel: Record<string, unknown>): MarketSource[] {
  const stored = Array.isArray(marketIntel.market_sources)
    ? marketIntel.market_sources.filter((item): item is MarketSource => typeof item === 'string' && VALID_SOURCES.has(item as MarketSource))
    : [];
  if (stored.length) return Array.from(new Set(stored));
  return ['mercadolibre', 'serper'];
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'read' });
  if (!auth.ok) return auth.response;
  const tenantId = await getAdminTenantId(request);

  const { data, error } = await insforgeAdmin.database
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    await recordAdminFailure({ session: auth.session, request, action: 'read', resource: 'products', metadata: { module: 'market-intel-monitor', error: error.message } });
    return NextResponse.json({ error: error.message || 'No se pudieron cargar los productos monitoreados.' }, { status: 500 });
  }

  const products = (Array.isArray(data) ? data : [])
    .map((row) => monitoredRow(row as Record<string, unknown>))
    .filter((row): row is NonNullable<ReturnType<typeof monitoredRow>> => Boolean(row));

  return NextResponse.json({ ok: true, products });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'update' });
  if (!auth.ok) return auth.response;
  const tenantId = await getAdminTenantId(request);

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const id = String(body.id || '').trim();
  if (!id) return NextResponse.json({ error: 'Falta el id del producto.' }, { status: 400 });

  const { data, error } = await insforgeAdmin.database
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    await recordAdminFailure({ session: auth.session, request, action: 'update', resource: 'products', resourceId: id, metadata: { module: 'market-intel-monitor', error: error.message } });
    return NextResponse.json({ error: error.message || 'No se pudo cargar el producto.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });

  const row = data as Record<string, unknown>;
  const specifications = record(row.specifications);
  const previousIntel = record(specifications.market_intel);
  if (!Object.keys(previousIntel).length) {
    return NextResponse.json({ error: 'Este producto no tiene una referencia de Inteligencia de Mercado para actualizar.' }, { status: 409 });
  }

  const query = String(previousIntel.query || row.name || '').trim();
  if (!query) return NextResponse.json({ error: 'No se pudo resolver la consulta de mercado del producto.' }, { status: 400 });

  const site = typeof previousIntel.site === 'string' && /^[A-Z]{3}$/.test(previousIntel.site) ? previousIntel.site : 'MLC';
  const sources = resolveSources(previousIntel);

  try {
    const snapshot = await aggregateProductRefs(query, {
      sources,
      site,
      useCache: false,
      limitPerSource: 20,
    });

    if (!snapshot.refs.length) {
      return NextResponse.json({ error: 'La actualización no encontró referencias de mercado. Se conservó la información anterior.' }, { status: 424 });
    }

    const delta = await compareMarketSnapshotForTenant(tenantId, snapshot.normalizedQuery, snapshot.stats.avg);
    const snapshotId = await persistMarketSnapshotForTenant(tenantId, snapshot);

    const currentPrice = Math.max(0, numberValue(row.price));
    const currentCost = Math.max(0, numberValue(row.supplier_price, numberValue(previousIntel.current_cost, numberValue(previousIntel.reference_cost))));
    const reservePct = Math.min(80, Math.max(0, numberValue(previousIntel.operating_reserve_percentage)));
    const reserveAmount = Math.round(currentPrice * reservePct / 100);
    const grossProfit = currentPrice - currentCost;
    const grossMargin = currentPrice > 0 ? (grossProfit / currentPrice) * 100 : 0;
    const netProfit = currentPrice - currentCost - reserveAmount;
    const netMargin = currentPrice > 0 ? (netProfit / currentPrice) * 100 : 0;
    const median = numberValue(snapshot.stats.median);
    const gapToMedian = median > 0 ? ((currentPrice - median) / median) * 100 : null;
    const refreshedAt = new Date().toISOString();

    const nextIntel: Record<string, unknown> = {
      ...previousIntel,
      normalized_query: snapshot.normalizedQuery,
      site: snapshot.site,
      previous_market_min: previousIntel.market_min ?? null,
      previous_market_avg: previousIntel.market_avg ?? null,
      previous_market_median: previousIntel.market_median ?? null,
      previous_market_max: previousIntel.market_max ?? null,
      market_min: snapshot.stats.min,
      market_avg: snapshot.stats.avg,
      market_median: snapshot.stats.median,
      market_max: snapshot.stats.max,
      market_refs_count: snapshot.refs.length,
      market_sources: snapshot.sources,
      market_snapshot_id: snapshotId,
      market_delta_percentage: delta.deltaPct == null ? null : Math.round(delta.deltaPct * 10) / 10,
      market_trend: delta.trend,
      market_previous_avg: delta.previousAvg,
      market_previous_at: delta.previousAt,
      current_cost: currentCost || null,
      current_sale_price: currentPrice,
      current_gross_profit: grossProfit,
      current_gross_margin_percentage: Math.round(grossMargin * 10) / 10,
      current_reserve_amount: reserveAmount,
      current_estimated_net_profit: netProfit,
      current_estimated_net_margin_percentage: Math.round(netMargin * 10) / 10,
      current_gap_to_market_median_percentage: gapToMedian == null ? null : Math.round(gapToMedian * 10) / 10,
      market_refreshed_at: refreshedAt,
      last_reviewed_at: refreshedAt,
      refresh_policy: 'reference-only-no-auto-price-change',
    };

    const { data: updated, error: updateError } = await insforgeAdmin.database
      .from('products')
      .update({ specifications: { ...specifications, market_intel: nextIntel } })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select(PRODUCT_SELECT)
      .single();

    if (updateError || !updated) {
      await recordAdminFailure({ session: auth.session, request, action: 'update', resource: 'products', resourceId: id, metadata: { module: 'market-intel-monitor', error: updateError?.message || 'missing updated row' } });
      return NextResponse.json({ error: updateError?.message || 'No se pudo guardar la nueva referencia de mercado.' }, { status: 500 });
    }

    await recordAdminAudit({
      session: auth.session,
      request,
      action: 'update',
      resource: 'products',
      resourceId: id,
      metadata: {
        module: 'market-intel-monitor',
        query,
        refs: snapshot.refs.length,
        previousMedian: previousIntel.market_median ?? null,
        currentMedian: snapshot.stats.median,
        salePriceChanged: false,
        stockChanged: false,
        activeChanged: false,
      },
    });

    return NextResponse.json({
      ok: true,
      product: monitoredRow(updated as Record<string, unknown>),
      snapshot: { query: snapshot.query, stats: snapshot.stats, sources: snapshot.sources, refsCount: snapshot.refs.length },
      delta,
      priceChanged: false,
    });
  } catch (refreshError) {
    const message = refreshError instanceof Error ? refreshError.message : 'No se pudo actualizar el mercado.';
    await recordAdminFailure({ session: auth.session, request, action: 'update', resource: 'products', resourceId: id, metadata: { module: 'market-intel-monitor', error: message } });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

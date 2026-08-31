import { NextRequest, NextResponse } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { requireTenantAdmin } from '@/lib/tenantAdmin';

export const dynamic = 'force-dynamic';

const PRODUCT_SELECT = 'id,name,stock,price,sku,ean,scan_code,scan_format,image_url,activo,category_id,source,source_id,specifications';

type Product = {
  id: string;
  name: string;
  stock: number | null;
  price?: number | null;
  sku?: string | null;
  ean?: string | null;
  scan_code?: string | null;
  image_url?: string | null;
  activo?: boolean | null;
  category_id?: string | null;
  source?: string | null;
  source_id?: string | null;
  specifications?: Record<string, unknown> | null;
};

function cleanQuery(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 180);
}

function clampLimit(value: unknown) {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? Math.max(1, Math.min(100, parsed)) : 30;
}

function dedupe(products: Product[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

function scoreProduct(product: Product, q: string) {
  const needle = q.toLowerCase();
  const name = String(product.name || '').toLowerCase();
  const sku = String(product.sku || '').toLowerCase();
  const ean = String(product.ean || '').toLowerCase();
  const scan = String(product.scan_code || '').toLowerCase();
  let score = 0;
  if (scan === needle || ean === needle || sku === needle) score += 100;
  if (name === needle) score += 80;
  if (name.startsWith(needle)) score += 55;
  if (name.includes(needle)) score += 35;
  if (sku.includes(needle) || ean.includes(needle) || scan.includes(needle)) score += 30;
  score += Math.min(10, Math.max(0, Number(product.stock ?? 0)) / 100);
  return score;
}

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'products', action: 'read' });
  if (!auth.ok) return auth.response;
  const { tenantId } = auth.ctx;
  const url = new URL(request.url);
  const q = cleanQuery(url.searchParams.get('q'));
  const limit = clampLimit(url.searchParams.get('limit'));
  const stockFilter = cleanQuery(url.searchParams.get('stock')).toLowerCase();
  const activeOnly = url.searchParams.get('active') === '1';

  try {
    if (!q) {
      let query = insforgeAdmin.database.from('products').select(PRODUCT_SELECT)
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })
        .limit(limit);
      if (activeOnly) query = query.eq('activo', true);
      if (stockFilter === 'out') query = query.eq('stock', 0);
      if (stockFilter === 'low') query = query.lte('stock', 5).gt('stock', 0);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ ok: true, query: q, products: data ?? [], count: data?.length ?? 0 });
    }

    const exactSignals = q.replace(/\s+/g, '');
    const collected: Product[] = [];

    for (const field of ['scan_code', 'ean', 'sku'] as const) {
      const { data } = await insforgeAdmin.database.from('products').select(PRODUCT_SELECT)
        .eq('tenant_id', tenantId).eq(field, exactSignals).limit(3);
      if (data?.length) collected.push(...data as Product[]);
    }

    const safePattern = q.replace(/[%_]/g, '').trim();
    if (safePattern) {
      let nameQuery = insforgeAdmin.database.from('products').select(PRODUCT_SELECT)
        .eq('tenant_id', tenantId)
        .ilike('name', `%${safePattern}%`)
        .limit(Math.max(limit * 2, 30));
      if (activeOnly) nameQuery = nameQuery.eq('activo', true);
      const { data } = await nameQuery;
      if (data?.length) collected.push(...data as Product[]);
    }

    let products = dedupe(collected)
      .sort((a, b) => scoreProduct(b, q) - scoreProduct(a, q));

    if (stockFilter === 'out') products = products.filter((product) => Number(product.stock ?? 0) <= 0);
    if (stockFilter === 'low') products = products.filter((product) => Number(product.stock ?? 0) > 0 && Number(product.stock ?? 0) <= 5);
    products = products.slice(0, limit);

    return NextResponse.json({
      ok: true,
      query: q,
      count: products.length,
      products,
      answer: products.length === 1
        ? `${products[0].name}: ${Math.max(0, Number(products[0].stock ?? 0))} unidad(es) en stock.`
        : products.length > 1
          ? `Encontré ${products.length} productos relacionados con “${q}”.`
          : `No encontré productos relacionados con “${q}”.`,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo buscar el inventario.' }, { status: 500 });
  }
}

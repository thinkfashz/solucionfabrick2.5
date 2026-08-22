import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';
import { DEFAULT_TENANT_ID } from '@/lib/tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

async function sessionFor(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return cookie ? decodeSession(cookie).catch(() => null) : null;
}

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(request: NextRequest) {
  const session = await sessionFor(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: NO_STORE });
  const tenantId = session.tenant_id || DEFAULT_TENANT_ID;

  try {
    const [productsRes, targetsRes, historyRes] = await Promise.all([
      insforgeAdmin.database
        .from('products')
        .select('id,name,price,stock,activo,source,source_url,source_id,supplier_price,supplier_currency,updated_at')
        .eq('tenant_id', tenantId)
        .limit(3000),
      insforgeAdmin.database
        .from('supplier_watch_targets')
        .select('id,tenant_id,product_id,source,source_url,enabled,check_interval_minutes,last_checked_at,last_status,last_error,updated_at')
        .eq('tenant_id', tenantId)
        .limit(3000),
      insforgeAdmin.database
        .from('supplier_price_history')
        .select('product_id,supplier_price,currency,in_stock,observed_at')
        .eq('tenant_id', tenantId)
        .order('observed_at', { ascending: false })
        .limit(5000),
    ]);

    if (productsRes.error) throw new Error(productsRes.error.message);
    if (targetsRes.error) throw new Error(targetsRes.error.message);
    if (historyRes.error) throw new Error(historyRes.error.message);

    const targets = Array.isArray(targetsRes.data) ? targetsRes.data : [];
    const latestHistory = new Map<string, any>();
    for (const row of (Array.isArray(historyRes.data) ? historyRes.data : [])) {
      const key = String((row as any).product_id || '');
      if (key && !latestHistory.has(key)) latestHistory.set(key, row);
    }
    const targetByProduct = new Map(targets.map((row: any) => [String(row.product_id), row]));

    const products = (Array.isArray(productsRes.data) ? productsRes.data : []).map((row: any) => {
      const target = targetByProduct.get(String(row.id)) || null;
      const last = latestHistory.get(String(row.id)) || null;
      const baselineSupplierPrice = n(row.supplier_price);
      const lastSupplier = last ? n((last as any).supplier_price) : 0;
      const supplierPrice = lastSupplier > 0 ? lastSupplier : baselineSupplierPrice;
      const sellPrice = n(row.price);
      const marginPercent = sellPrice > 0 && supplierPrice > 0 ? Math.round(((sellPrice - supplierPrice) / sellPrice) * 1000) / 10 : 0;
      const stock = Math.max(0, Math.floor(n(row.stock)));
      const stockStatus = stock <= 0 ? 'out' : stock <= 3 ? 'critical' : stock <= 8 ? 'low' : 'ok';
      const supplierDeltaPercent = baselineSupplierPrice > 0 && lastSupplier > 0
        ? Math.round(((lastSupplier - baselineSupplierPrice) / baselineSupplierPrice) * 1000) / 10
        : 0;

      return {
        id: row.id,
        name: row.name,
        active: row.activo !== false,
        price: sellPrice,
        stock,
        stockStatus,
        source: row.source || null,
        sourceUrl: row.source_url || null,
        supplierPrice,
        baselineSupplierPrice,
        supplierCurrency: (last as any)?.currency || row.supplier_currency || 'CLP',
        marginPercent,
        marginStatus: supplierPrice > 0 && marginPercent < 25 ? 'risk' : 'ok',
        watch: target ? {
          id: target.id,
          enabled: target.enabled !== false,
          intervalMinutes: target.check_interval_minutes,
          lastCheckedAt: target.last_checked_at,
          lastStatus: target.last_status,
          lastError: target.last_error,
        } : null,
        latestObservation: last ? {
          supplierPrice: lastSupplier,
          currency: (last as any).currency || 'CLP',
          inStock: (last as any).in_stock,
          observedAt: (last as any).observed_at,
          deltaPercent: supplierDeltaPercent,
        } : null,
      };
    });

    const summary = {
      products: products.length,
      activeProducts: products.filter((p) => p.active).length,
      outOfStock: products.filter((p) => p.stockStatus === 'out').length,
      criticalStock: products.filter((p) => p.stockStatus === 'critical').length,
      lowStock: products.filter((p) => p.stockStatus === 'low').length,
      marginRisk: products.filter((p) => p.marginStatus === 'risk').length,
      watchEnabled: products.filter((p) => p.watch?.enabled).length,
      watchCandidates: products.filter((p) => p.sourceUrl && !p.watch).length,
      watchErrors: products.filter((p) => p.watch?.lastStatus === 'error').length,
    };

    return NextResponse.json({ ok: true, tenantId, summary, products }, { headers: NO_STORE });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar inteligencia operacional.' }, { status: 503, headers: NO_STORE });
  }
}

export async function POST(request: NextRequest) {
  const session = await sessionFor(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: NO_STORE });
  if ((session.rol || 'viewer') === 'viewer') return NextResponse.json({ error: 'El rol viewer no puede configurar monitores.' }, { status: 403, headers: NO_STORE });
  const tenantId = session.tenant_id || DEFAULT_TENANT_ID;

  let body: { productId?: string; enabled?: boolean; intervalMinutes?: number };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400, headers: NO_STORE });
  }
  const productId = String(body.productId || '').trim();
  if (!productId) return NextResponse.json({ error: 'productId requerido' }, { status: 422, headers: NO_STORE });

  try {
    const { data: productRows, error: productError } = await insforgeAdmin.database
      .from('products')
      .select('id,source,source_url,source_id')
      .eq('tenant_id', tenantId)
      .eq('id', productId)
      .limit(1);
    if (productError) throw new Error(productError.message);
    const product = Array.isArray(productRows) ? productRows[0] as any : null;
    if (!product) return NextResponse.json({ error: 'Producto no encontrado en el tenant activo.' }, { status: 404, headers: NO_STORE });
    if (!product.source_url) return NextResponse.json({ error: 'El producto no tiene source_url. Agrega primero la procedencia del proveedor.' }, { status: 422, headers: NO_STORE });

    const { data: existingRows, error: existingError } = await insforgeAdmin.database
      .from('supplier_watch_targets')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('product_id', productId)
      .eq('source_url', product.source_url)
      .limit(1);
    if (existingError) throw new Error(existingError.message);
    const existing = Array.isArray(existingRows) ? existingRows[0] as any : null;
    const payload = {
      tenant_id: tenantId,
      product_id: productId,
      source: product.source || null,
      source_url: product.source_url,
      source_id: product.source_id || null,
      enabled: body.enabled !== false,
      check_interval_minutes: Math.max(60, Math.min(10080, Math.floor(Number(body.intervalMinutes || 1440)))),
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await insforgeAdmin.database.from('supplier_watch_targets').update(payload).eq('id', existing.id).eq('tenant_id', tenantId);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, mode: 'updated', id: existing.id }, { headers: NO_STORE });
    }

    const { data, error } = await insforgeAdmin.database.from('supplier_watch_targets').insert([payload]).select('id').limit(1);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, mode: 'created', id: Array.isArray(data) ? (data[0] as any)?.id : null }, { headers: NO_STORE });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo configurar el monitor.' }, { status: 503, headers: NO_STORE });
  }
}

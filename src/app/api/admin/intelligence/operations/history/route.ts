import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';
import { DEFAULT_TENANT_ID } from '@/lib/tenant';
import { runSupplierPriceWatch } from '@/lib/fabrickPriceWatch';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

async function sessionFor(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return cookie ? decodeSession(cookie).catch(() => null) : null;
}

export async function GET(request: NextRequest) {
  const session = await sessionFor(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: NO_STORE });
  const tenantId = session.tenant_id || DEFAULT_TENANT_ID;
  const productId = String(request.nextUrl.searchParams.get('productId') || '').trim();
  if (!productId) return NextResponse.json({ error: 'productId requerido' }, { status: 422, headers: NO_STORE });

  try {
    const [{ data: products, error: productError }, { data: history, error: historyError }, { data: targets, error: targetError }] = await Promise.all([
      insforgeAdmin.database.from('products').select('id,name,price,supplier_price,source,source_url,stock').eq('tenant_id', tenantId).eq('id', productId).limit(1),
      insforgeAdmin.database.from('supplier_price_history').select('supplier_price,currency,in_stock,source_url,raw,observed_at').eq('tenant_id', tenantId).eq('product_id', productId).order('observed_at', { ascending: true }).limit(180),
      insforgeAdmin.database.from('supplier_watch_targets').select('id,enabled,check_interval_minutes,last_checked_at,last_status,last_error').eq('tenant_id', tenantId).eq('product_id', productId).limit(1),
    ]);
    if (productError) throw new Error(productError.message);
    if (historyError) throw new Error(historyError.message);
    if (targetError) throw new Error(targetError.message);
    const product = Array.isArray(products) ? products[0] : null;
    if (!product) return NextResponse.json({ error: 'Producto no encontrado en el tenant activo.' }, { status: 404, headers: NO_STORE });
    const rows = Array.isArray(history) ? history : [];
    const prices = rows.map((row: any) => Number(row.supplier_price || 0)).filter((value) => value > 0);
    const first = prices[0] || Number((product as any).supplier_price || 0);
    const last = prices.at(-1) || first;
    const changePercent = first > 0 && last > 0 ? Math.round(((last - first) / first) * 1000) / 10 : 0;
    return NextResponse.json({
      ok: true,
      product,
      watch: Array.isArray(targets) ? targets[0] || null : null,
      history: rows,
      summary: { observations: rows.length, firstPrice: first, latestPrice: last, changePercent, minPrice: prices.length ? Math.min(...prices) : 0, maxPrice: prices.length ? Math.max(...prices) : 0 },
    }, { headers: NO_STORE });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar el historial.' }, { status: 503, headers: NO_STORE });
  }
}

export async function POST(request: NextRequest) {
  const session = await sessionFor(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: NO_STORE });
  if (!['admin', 'superadmin'].includes(session.rol || 'viewer')) return NextResponse.json({ error: 'Sin permiso para ejecutar Price Watch.' }, { status: 403, headers: NO_STORE });
  const tenantId = session.tenant_id || DEFAULT_TENANT_ID;
  let body: { productId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400, headers: NO_STORE }); }
  const productId = String(body.productId || '').trim();
  if (!productId) return NextResponse.json({ error: 'productId requerido' }, { status: 422, headers: NO_STORE });

  try {
    const { data: targets, error } = await insforgeAdmin.database.from('supplier_watch_targets').select('id,enabled').eq('tenant_id', tenantId).eq('product_id', productId).limit(1);
    if (error) throw new Error(error.message);
    const target = Array.isArray(targets) ? targets[0] as any : null;
    if (!target?.id) return NextResponse.json({ error: 'Este producto no tiene Price Watch configurado.' }, { status: 404, headers: NO_STORE });
    if (target.enabled === false) return NextResponse.json({ error: 'El monitor está desactivado.' }, { status: 422, headers: NO_STORE });

    const { error: resetError } = await insforgeAdmin.database.from('supplier_watch_targets').update({ last_checked_at: null, updated_at: new Date().toISOString() }).eq('id', target.id).eq('tenant_id', tenantId);
    if (resetError) throw new Error(resetError.message);
    const report = await runSupplierPriceWatch();
    const matched = Array.isArray((report as any).results) ? (report as any).results.find((item: any) => String(item.productId) === productId) : null;
    return NextResponse.json({ ok: true, productId, matched: matched || null, report }, { headers: NO_STORE });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo ejecutar Price Watch.' }, { status: 503, headers: NO_STORE });
  }
}

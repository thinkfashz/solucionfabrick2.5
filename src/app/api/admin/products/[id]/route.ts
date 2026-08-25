import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { getAdminTenantId } from '@/lib/adminApi';
import { requireAdminPermission } from '@/lib/adminPermissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

const PRODUCT_SELECT = 'id, tenant_id, name, description, price, stock, delivery_days, image_url, featured, activo, tagline, category_id, created_at, source, source_url, source_id, supplier_price, supplier_currency, specifications, shipping_mode, shipping_fee, shipping_weight_kg, shipping_dimensions, shipping_region_overrides, rating, discount_percentage, sku, ean, scan_code, scan_format';

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'read' });
  if (!auth.ok) return auth.response;
  const tenantId = await getAdminTenantId(request);
  const { id } = await context.params;
  const productId = decodeURIComponent(id || '').trim();
  if (!productId) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

  const { data, error } = await insforgeAdmin.database
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('tenant_id', tenantId)
    .eq('id', productId)
    .limit(1);

  if (error) return NextResponse.json({ error: error.message || 'No se pudo cargar el producto.' }, { status: 500 });
  const product = Array.isArray(data) ? data[0] : null;
  if (!product) return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
  return NextResponse.json({ ok: true, product }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

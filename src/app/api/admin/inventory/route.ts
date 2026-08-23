import { NextRequest, NextResponse } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession, getAdminTenantId } from '@/lib/adminApi';

function cleanCode(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, '').slice(0, 128);
}

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();
  const tenantId = await getAdminTenantId(request);
  const db = getAdminInsforge().database;
  const url = new URL(request.url);
  const code = cleanCode(url.searchParams.get('code'));
  const catalog = url.searchParams.get('catalog') === '1';
  const history = url.searchParams.get('history') === '1';

  try {
    if (history) {
      const { data, error } = await db.from('inventory_movements')
        .select('id,product_id,movement_type,quantity,stock_before,stock_after,barcode,note,actor_id,created_at,reference_type,reference_id')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return NextResponse.json({ movements: data ?? [] });
    }
    if (catalog) {
      const { data, error } = await db.from('products')
        .select('id,name,stock,sku,ean,image_url,activo')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })
        .limit(500);
      if (error) throw error;
      return NextResponse.json({ products: data ?? [] });
    }
    if (!code) return NextResponse.json({ error: 'Código requerido.' }, { status: 400 });

    const select = 'id,name,stock,sku,ean,image_url,activo';
    const { data: byEan, error: eanError } = await db.from('products').select(select).eq('tenant_id', tenantId).eq('ean', code).limit(2);
    if (eanError) throw eanError;
    if ((byEan ?? []).length > 1) return NextResponse.json({ error: 'EAN duplicado. Corrige el catálogo antes de mover stock.' }, { status: 409 });
    if (byEan?.[0]) return NextResponse.json({ found: true, product: byEan[0], code });

    const { data: bySku, error: skuError } = await db.from('products').select(select).eq('tenant_id', tenantId).eq('sku', code).limit(2);
    if (skuError) throw skuError;
    if ((bySku ?? []).length > 1) return NextResponse.json({ error: 'SKU duplicado. Corrige el catálogo antes de mover stock.' }, { status: 409 });
    return bySku?.[0]
      ? NextResponse.json({ found: true, product: bySku[0], code })
      : NextResponse.json({ found: false, code });
  } catch (error) {
    return adminError(error, 'INVENTORY_LOOKUP_FAILED', 500, request);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();
  const tenantId = await getAdminTenantId(request);
  const db = getAdminInsforge().database;
  try {
    const body = await request.json() as { productId?: string; sku?: string; ean?: string };
    if (!body.productId) return NextResponse.json({ error: 'productId requerido.' }, { status: 400 });
    const patch: Record<string, string | null> = {};
    if (body.sku !== undefined) patch.sku = cleanCode(body.sku) || null;
    if (body.ean !== undefined) patch.ean = cleanCode(body.ean) || null;
    if (!Object.keys(patch).length) return NextResponse.json({ error: 'Envía sku o ean.' }, { status: 400 });
    const { data, error } = await db.from('products').update(patch).eq('tenant_id', tenantId).eq('id', body.productId).select('id,name,stock,sku,ean').single();
    if (error) throw error;
    return NextResponse.json({ ok: true, product: data });
  } catch (error) {
    return adminError(error, 'INVENTORY_CODE_BIND_FAILED', 500, request);
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();
  const tenantId = await getAdminTenantId(request);
  const db = getAdminInsforge().database;
  try {
    const body = await request.json() as {
      productId?: string; type?: 'in' | 'out' | 'adjustment' | 'return'; quantity?: number;
      barcode?: string; note?: string; referenceType?: string; referenceId?: string;
    };
    if (!body.productId || !body.type) return NextResponse.json({ error: 'Producto y tipo son requeridos.' }, { status: 400 });
    const quantity = Math.trunc(Number(body.quantity));
    if (!Number.isFinite(quantity) || quantity < 0) return NextResponse.json({ error: 'Cantidad inválida.' }, { status: 400 });

    const { data: product, error: readError } = await db.from('products').select('id,name,stock,sku,ean').eq('tenant_id', tenantId).eq('id', body.productId).single();
    if (readError || !product) throw readError ?? new Error('Producto no encontrado.');
    const before = Math.max(0, Number(product.stock ?? 0));
    let after = before;
    let signedQty = quantity;
    if (body.type === 'in' || body.type === 'return') after = before + quantity;
    else if (body.type === 'out') { after = before - quantity; signedQty = -quantity; }
    else { after = quantity; signedQty = after - before; }
    if (after < 0) return NextResponse.json({ error: `Stock insuficiente. Disponible: ${before}.` }, { status: 409 });

    const { error: updateError } = await db.from('products').update({ stock: after }).eq('tenant_id', tenantId).eq('id', body.productId);
    if (updateError) throw updateError;
    const movement = {
      tenant_id: tenantId,
      product_id: body.productId,
      movement_type: body.type,
      quantity: signedQty,
      stock_before: before,
      stock_after: after,
      reference_type: body.referenceType || 'manual_scan',
      reference_id: body.referenceId || null,
      barcode: cleanCode(body.barcode) || null,
      note: String(body.note ?? '').trim().slice(0, 500) || null,
      actor_id: session.email || 'admin',
    };
    const { data: inserted, error: movementError } = await db.from('inventory_movements').insert([movement]).select('*').single();
    if (movementError) {
      await db.from('products').update({ stock: before }).eq('tenant_id', tenantId).eq('id', body.productId);
      throw movementError;
    }
    return NextResponse.json({ ok: true, product: { ...product, stock: after }, movement: inserted });
  } catch (error) {
    return adminError(error, 'INVENTORY_MOVEMENT_FAILED', 500, request);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { adminError, getAdminInsforge, getAdminTenantId } from '@/lib/adminApi';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { applyInventoryMovementAtomic, inventoryMovementHttpError } from '@/lib/inventory/stockLedger';

function cleanLegacyCode(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, '').slice(0, 128);
}

function cleanScanCode(value: unknown) {
  return String(value ?? '').trim().slice(0, 512);
}

function cleanFormat(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
}

function clampLimit(value: unknown, fallback = 100) {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? Math.max(1, Math.min(250, parsed)) : fallback;
}

const PRODUCT_SELECT = 'id,name,stock,price,sku,ean,scan_code,scan_format,image_url,activo';

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'read' });
  if (!auth.ok) return auth.response;
  const tenantId = await getAdminTenantId(request);
  const db = getAdminInsforge().database;
  const url = new URL(request.url);
  const code = cleanScanCode(url.searchParams.get('code'));
  const catalog = url.searchParams.get('catalog') === '1';
  const history = url.searchParams.get('history') === '1';
  const limit = clampLimit(url.searchParams.get('limit'));

  try {
    if (history) {
      const { data, error } = await db.from('inventory_movements')
        .select('id,product_id,movement_type,quantity,stock_before,stock_after,barcode,note,actor_id,created_at,reference_type,reference_id')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return NextResponse.json({ movements: data ?? [] });
    }
    if (catalog) {
      const { data, error } = await db.from('products')
        .select(PRODUCT_SELECT)
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return NextResponse.json({ products: data ?? [], limit, partial: (data?.length ?? 0) >= limit });
    }
    if (!code) return NextResponse.json({ error: 'Código requerido.' }, { status: 400 });

    const { data: byScan, error: scanError } = await db.from('products').select(PRODUCT_SELECT).eq('tenant_id', tenantId).eq('scan_code', code).limit(2);
    if (scanError) throw scanError;
    if ((byScan ?? []).length > 1) return NextResponse.json({ error: 'Código de escaneo duplicado. Corrige el catálogo antes de mover stock.' }, { status: 409 });
    if (byScan?.[0]) return NextResponse.json({ found: true, product: byScan[0], code });

    const legacyCode = cleanLegacyCode(code);
    const { data: byEan, error: eanError } = await db.from('products').select(PRODUCT_SELECT).eq('tenant_id', tenantId).eq('ean', legacyCode).limit(2);
    if (eanError) throw eanError;
    if ((byEan ?? []).length > 1) return NextResponse.json({ error: 'EAN duplicado. Corrige el catálogo antes de mover stock.' }, { status: 409 });
    if (byEan?.[0]) return NextResponse.json({ found: true, product: byEan[0], code });

    const { data: bySku, error: skuError } = await db.from('products').select(PRODUCT_SELECT).eq('tenant_id', tenantId).eq('sku', legacyCode).limit(2);
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
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'update' });
  if (!auth.ok) return auth.response;
  const tenantId = await getAdminTenantId(request);
  const db = getAdminInsforge().database;
  try {
    const body = await request.json() as { productId?: string; sku?: string; ean?: string; code?: string; format?: string };
    if (!body.productId) return NextResponse.json({ error: 'productId requerido.' }, { status: 400 });
    const patch: Record<string, string | null> = {};
    if (body.sku !== undefined) patch.sku = cleanLegacyCode(body.sku) || null;
    if (body.ean !== undefined) patch.ean = cleanLegacyCode(body.ean) || null;
    if (body.code !== undefined) {
      const scanCode = cleanScanCode(body.code);
      patch.scan_code = scanCode || null;
      patch.scan_format = scanCode ? (cleanFormat(body.format) || 'manual') : null;
      if ((body.format === 'ean_13' || body.format === 'ean_8') && body.ean === undefined) patch.ean = cleanLegacyCode(body.code) || null;
    }
    if (!Object.keys(patch).length) return NextResponse.json({ error: 'Envía sku, ean o code.' }, { status: 400 });
    const { data, error } = await db.from('products').update(patch).eq('tenant_id', tenantId).eq('id', body.productId).select(PRODUCT_SELECT).single();
    if (error) throw error;
    return NextResponse.json({ ok: true, product: data });
  } catch (error) {
    return adminError(error, 'INVENTORY_CODE_BIND_FAILED', 500, request);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'update' });
  if (!auth.ok) return auth.response;
  const tenantId = await getAdminTenantId(request);
  const db = getAdminInsforge().database;

  try {
    const body = await request.json() as {
      productId?: string;
      type?: 'in' | 'out' | 'adjustment' | 'return';
      quantity?: number;
      barcode?: string;
      note?: string;
      referenceType?: string;
      referenceId?: string;
      idempotencyKey?: string;
    };
    if (!body.productId || !body.type) return NextResponse.json({ error: 'Producto y tipo son requeridos.' }, { status: 400 });

    const quantity = Math.trunc(Number(body.quantity));
    if (!Number.isFinite(quantity) || quantity < 0) return NextResponse.json({ error: 'Cantidad inválida.' }, { status: 400 });

    const referenceType = String(body.referenceType || 'manual_scan').trim().slice(0, 120) || 'manual_scan';
    const referenceId = String(body.referenceId || body.idempotencyKey || '').trim().slice(0, 240) || null;
    const movement = await applyInventoryMovementAtomic({
      tenantId,
      productId: body.productId,
      type: body.type,
      quantity,
      referenceType,
      referenceId,
      barcode: cleanScanCode(body.barcode) || null,
      note: String(body.note ?? '').trim().slice(0, 500) || null,
      actorId: auth.session.email || 'admin',
    });

    const { data: product, error: readError } = await db.from('products')
      .select(PRODUCT_SELECT)
      .eq('tenant_id', tenantId)
      .eq('id', body.productId)
      .single();
    if (readError) throw readError;

    return NextResponse.json({ ok: true, duplicate: movement.duplicate, product, movement });
  } catch (error) {
    const mapped = inventoryMovementHttpError(error);
    if (mapped.status < 500) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return adminError(error, 'INVENTORY_MOVEMENT_FAILED', 500, request);
  }
}

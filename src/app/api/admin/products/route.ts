import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { getAdminTenantId } from '@/lib/adminApi';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { recordAdminAudit, recordAdminFailure } from '@/lib/adminAudit';

export const dynamic = 'force-dynamic';

function parseProductId(request: NextRequest) {
  return new URL(request.url).searchParams.get('id')?.trim() ?? '';
}

const PRODUCT_SELECT = 'id, tenant_id, name, description, price, stock, delivery_days, image_url, featured, activo, tagline, category_id, created_at, source, source_url, source_id, supplier_price, supplier_currency, specifications, shipping_mode, shipping_fee, shipping_weight_kg, shipping_dimensions, shipping_region_overrides, rating, discount_percentage, sku, ean, scan_code, scan_format';

function numberInRange(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : null;
}

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanLegacyCode(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, '').slice(0, 128);
}

function cleanScanCode(value: unknown) {
  return String(value ?? '').trim().slice(0, 512);
}

function cleanFormat(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
}

function objectOrEmpty(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function buildCreatePayload(body: Record<string, unknown>, tenantId: string) {
  const name = cleanText(body.name, 180);
  if (!name) return { error: 'Nombre requerido.' as const };

  const price = numberInRange(body.price ?? 0, 0, 999999999) ?? 0;
  const stock = numberInRange(body.stock ?? 0, 0, 999999999) ?? 0;
  const rating = numberInRange(body.rating, 0, 5);
  const discount = numberInRange(body.discount_percentage, 0, 95);
  const shippingFee = numberInRange(body.shipping_fee, 0, 999999999);
  const supplierPrice = numberInRange(body.supplier_price, 0, 999999999);
  const deliveryDays = numberInRange(body.delivery_days, 0, 3650);
  const shippingWeight = numberInRange(body.shipping_weight_kg, 0, 999999);
  const scanCode = cleanScanCode(body.scan_code);
  const scanFormat = scanCode ? (cleanFormat(body.scan_format) || 'manual') : '';
  const ean = cleanLegacyCode(body.ean);
  const sku = cleanLegacyCode(body.sku);

  const payload: Record<string, unknown> = {
    tenant_id: tenantId,
    name,
    description: cleanText(body.description, 5000) || null,
    tagline: cleanText(body.tagline, 240) || null,
    price: Math.round(price),
    stock: Math.round(stock),
    image_url: cleanText(body.image_url, 2000) || null,
    featured: body.featured === true,
    activo: body.activo === true,
    category_id: cleanText(body.category_id, 120) || null,
    source: cleanText(body.source, 120) || null,
    source_url: cleanText(body.source_url, 2000) || null,
    source_id: cleanText(body.source_id, 240) || null,
    supplier_price: supplierPrice === null ? null : supplierPrice,
    supplier_currency: cleanText(body.supplier_currency, 12) || 'CLP',
    specifications: objectOrEmpty(body.specifications),
    shipping_mode: cleanText(body.shipping_mode, 40) || 'inherit',
    shipping_fee: shippingFee === null ? null : shippingFee,
    shipping_weight_kg: shippingWeight === null ? null : shippingWeight,
    shipping_dimensions: cleanText(body.shipping_dimensions, 240) || null,
    shipping_region_overrides: objectOrEmpty(body.shipping_region_overrides),
    rating: rating === null ? null : Math.round(rating * 10) / 10,
    discount_percentage: discount === null ? 0 : Math.round(discount),
    sku: sku || null,
    ean: ean || null,
    scan_code: scanCode || null,
    scan_format: scanCode ? scanFormat : null,
  };

  if (deliveryDays !== null) payload.delivery_days = Math.round(deliveryDays);
  return { payload };
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
    await recordAdminFailure({ session: auth.session, request, action: 'read', resource: 'products', metadata: { error: error.message } });
    return NextResponse.json({ error: error.message ?? 'No se pudieron cargar los productos.' }, { status: 500 });
  }

  return NextResponse.json({ products: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'create' });
  if (!auth.ok) return auth.response;
  const tenantId = await getAdminTenantId(request);

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 }); }
  const built = buildCreatePayload(body, tenantId);
  if ('error' in built) return NextResponse.json({ error: built.error }, { status: 400 });

  const { data, error } = await insforgeAdmin.database
    .from('products')
    .insert([built.payload])
    .select(PRODUCT_SELECT)
    .single();

  if (error) {
    const duplicate = (error as { code?: string }).code === '23505';
    await recordAdminFailure({ session: auth.session, request, action: 'create', resource: 'products', metadata: { error: error.message, scanCode: built.payload.scan_code, sku: built.payload.sku, ean: built.payload.ean } });
    return NextResponse.json({ error: duplicate ? 'Ese SKU, EAN o código QR/barra ya está asociado a otro producto.' : (error.message ?? 'No se pudo crear el producto.') }, { status: duplicate ? 409 : 500 });
  }

  await recordAdminAudit({ session: auth.session, request, action: 'create', resource: 'products', resourceId: String(data?.id ?? ''), metadata: { source: built.payload.source ?? 'admin', hasScanCode: Boolean(built.payload.scan_code) } });
  return NextResponse.json({ ok: true, product: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'update' });
  if (!auth.ok) return auth.response;
  const tenantId = await getAdminTenantId(request);

  const id = parseProductId(request);
  if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 }); }

  const patch: Record<string, unknown> = {};
  if (typeof body.activo === 'boolean') patch.activo = body.activo;
  if (typeof body.featured === 'boolean') patch.featured = body.featured;
  if (body.name !== undefined) {
    const name = cleanText(body.name, 180);
    if (!name) return NextResponse.json({ error: 'El nombre no puede quedar vacío.' }, { status: 400 });
    patch.name = name;
  }
  if (body.description !== undefined) patch.description = cleanText(body.description, 5000) || null;
  if (body.tagline !== undefined) patch.tagline = cleanText(body.tagline, 240) || null;
  if (body.category_id !== undefined) patch.category_id = cleanText(body.category_id, 120) || null;
  if (body.image_url !== undefined) patch.image_url = cleanText(body.image_url, 2000) || null;
  if (body.source !== undefined) patch.source = cleanText(body.source, 120) || null;
  if (body.source_url !== undefined) patch.source_url = cleanText(body.source_url, 2000) || null;
  if (body.source_id !== undefined) patch.source_id = cleanText(body.source_id, 240) || null;
  if (body.supplier_currency !== undefined) patch.supplier_currency = cleanText(body.supplier_currency, 12) || 'CLP';
  if (body.shipping_mode !== undefined) patch.shipping_mode = cleanText(body.shipping_mode, 40) || 'inherit';
  if (body.shipping_dimensions !== undefined) patch.shipping_dimensions = cleanText(body.shipping_dimensions, 240) || null;

  if (body.price !== undefined) {
    const value = numberInRange(body.price, 0, 999999999);
    if (value === null) return NextResponse.json({ error: 'Precio inválido.' }, { status: 400 });
    patch.price = Math.round(value);
  }
  if (body.stock !== undefined && body.stock !== null && body.stock !== '') {
    const value = numberInRange(body.stock, 0, 999999999);
    if (value === null) return NextResponse.json({ error: 'Stock inválido.' }, { status: 400 });
    patch.stock = Math.round(value);
  } else if (body.stock === null || body.stock === '') patch.stock = null;
  if (body.delivery_days !== undefined && body.delivery_days !== null && body.delivery_days !== '') {
    const value = numberInRange(body.delivery_days, 0, 3650);
    if (value === null) return NextResponse.json({ error: 'Plazo de entrega inválido.' }, { status: 400 });
    patch.delivery_days = Math.round(value);
  } else if (body.delivery_days === null || body.delivery_days === '') patch.delivery_days = null;
  if (body.supplier_price !== undefined) patch.supplier_price = body.supplier_price === null || body.supplier_price === '' ? null : numberInRange(body.supplier_price, 0, 999999999);
  if (body.shipping_fee !== undefined) patch.shipping_fee = body.shipping_fee === null || body.shipping_fee === '' ? null : numberInRange(body.shipping_fee, 0, 999999999);
  if (body.shipping_weight_kg !== undefined) patch.shipping_weight_kg = body.shipping_weight_kg === null || body.shipping_weight_kg === '' ? null : numberInRange(body.shipping_weight_kg, 0, 999999);
  if (body.rating !== undefined) {
    const rating = numberInRange(body.rating, 0, 5);
    patch.rating = rating === null ? null : Math.round(rating * 10) / 10;
  }
  if (body.discount_percentage !== undefined) {
    const discount = numberInRange(body.discount_percentage, 0, 95);
    patch.discount_percentage = discount === null ? 0 : Math.round(discount);
  }
  if (body.specifications !== undefined) patch.specifications = objectOrEmpty(body.specifications);
  if (body.shipping_region_overrides !== undefined) patch.shipping_region_overrides = objectOrEmpty(body.shipping_region_overrides);
  if (body.sku !== undefined) patch.sku = cleanLegacyCode(body.sku) || null;
  if (body.ean !== undefined) patch.ean = cleanLegacyCode(body.ean) || null;
  if (body.scan_code !== undefined) patch.scan_code = cleanScanCode(body.scan_code) || null;
  if (body.scan_format !== undefined) patch.scan_format = cleanFormat(body.scan_format) || null;

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'No hay campos válidos para actualizar.' }, { status: 400 });

  const { data, error } = await insforgeAdmin.database
    .from('products')
    .update(patch)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .select(PRODUCT_SELECT)
    .single();
  if (error) {
    const duplicate = (error as { code?: string }).code === '23505';
    await recordAdminFailure({ session: auth.session, request, action: 'update', resource: 'products', resourceId: id, metadata: { patch, error: error.message } });
    return NextResponse.json({ error: duplicate ? 'Ese SKU, EAN o código QR/barra ya está asociado a otro producto.' : (error.message ?? 'No se pudo actualizar el producto.') }, { status: duplicate ? 409 : 500 });
  }
  await recordAdminAudit({ session: auth.session, request, action: 'update', resource: 'products', resourceId: id, metadata: { fields: Object.keys(patch) } });
  return NextResponse.json({ ok: true, product: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'delete' });
  if (!auth.ok) return auth.response;
  const tenantId = await getAdminTenantId(request);

  const id = parseProductId(request);
  if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

  const { error } = await insforgeAdmin.database.from('products').delete().eq('tenant_id', tenantId).eq('id', id);
  if (error) {
    await recordAdminFailure({ session: auth.session, request, action: 'delete', resource: 'products', resourceId: id, metadata: { error: error.message } });
    return NextResponse.json({ error: error.message ?? 'No se pudo eliminar el producto.' }, { status: 500 });
  }
  await recordAdminAudit({ session: auth.session, request, action: 'delete', resource: 'products', resourceId: id });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { recordAdminAudit, recordAdminFailure } from '@/lib/adminAudit';

export const dynamic = 'force-dynamic';

function parseProductId(request: NextRequest) {
  return new URL(request.url).searchParams.get('id')?.trim() ?? '';
}

const PRODUCT_SELECT = 'id, name, description, price, stock, image_url, featured, activo, tagline, category_id, created_at, source, source_url, source_id, supplier_price, supplier_currency, specifications, shipping_mode, shipping_fee, shipping_weight_kg, shipping_dimensions, shipping_region_overrides, rating, discount_percentage';

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'read' });
  if (!auth.ok) return auth.response;

  const { data, error } = await insforgeAdmin.database
    .from('products')
    .select(PRODUCT_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    await recordAdminFailure({ session: auth.session, request, action: 'read', resource: 'products', metadata: { error: error.message } });
    return NextResponse.json({ error: error.message ?? 'No se pudieron cargar los productos.' }, { status: 500 });
  }

  return NextResponse.json({ products: data ?? [] });
}

function numberInRange(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : null;
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'update' });
  if (!auth.ok) return auth.response;

  const id = parseProductId(request);
  if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 }); }

  const patch: Record<string, unknown> = {};
  if (typeof body.activo === 'boolean') patch.activo = body.activo;
  if (typeof body.featured === 'boolean') patch.featured = body.featured;
  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim().slice(0, 180);
  if (typeof body.description === 'string') patch.description = body.description.trim().slice(0, 5000);
  if (typeof body.tagline === 'string') patch.tagline = body.tagline.trim().slice(0, 240);
  const price = numberInRange(body.price, 0, 999999999);
  if (price !== null) patch.price = Math.round(price);
  const rating = numberInRange(body.rating, 0, 5);
  if (rating !== null) patch.rating = Math.round(rating * 10) / 10;
  const discount = numberInRange(body.discount_percentage, 0, 95);
  if (discount !== null) patch.discount_percentage = Math.round(discount);
  if (body.specifications && typeof body.specifications === 'object' && !Array.isArray(body.specifications)) patch.specifications = body.specifications;

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'No hay campos válidos para actualizar.' }, { status: 400 });

  const { error } = await insforgeAdmin.database.from('products').update(patch).eq('id', id);
  if (error) {
    await recordAdminFailure({ session: auth.session, request, action: 'update', resource: 'products', resourceId: id, metadata: { patch, error: error.message } });
    return NextResponse.json({ error: error.message ?? 'No se pudo actualizar el producto.' }, { status: 500 });
  }
  await recordAdminAudit({ session: auth.session, request, action: 'update', resource: 'products', resourceId: id, metadata: { fields: Object.keys(patch) } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'delete' });
  if (!auth.ok) return auth.response;

  const id = parseProductId(request);
  if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

  const { error } = await insforgeAdmin.database.from('products').delete().eq('id', id);
  if (error) {
    await recordAdminFailure({ session: auth.session, request, action: 'delete', resource: 'products', resourceId: id, metadata: { error: error.message } });
    return NextResponse.json({ error: error.message ?? 'No se pudo eliminar el producto.' }, { status: 500 });
  }
  await recordAdminAudit({ session: auth.session, request, action: 'delete', resource: 'products', resourceId: id });
  return NextResponse.json({ ok: true });
}

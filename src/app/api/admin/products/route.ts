import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { recordAdminAudit, recordAdminFailure } from '@/lib/adminAudit';

export const dynamic = 'force-dynamic';

function parseProductId(request: NextRequest) {
  return new URL(request.url).searchParams.get('id')?.trim() ?? '';
}

const PRODUCT_SELECT = 'id, name, description, price, stock, image_url, featured, activo, tagline, category_id, created_at, shipping_mode, shipping_fee, shipping_weight_kg, shipping_dimensions, shipping_region_overrides';

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

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'update' });
  if (!auth.ok) return auth.response;

  const id = parseProductId(request);
  if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 }); }

  const patch: Record<string, boolean> = {};
  if (typeof body.activo === 'boolean') patch.activo = body.activo;
  if (typeof body.featured === 'boolean') patch.featured = body.featured;

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'No hay campos válidos para actualizar.' }, { status: 400 });

  const { error } = await insforgeAdmin.database.from('products').update(patch).eq('id', id);
  if (error) {
    await recordAdminFailure({ session: auth.session, request, action: 'update', resource: 'products', resourceId: id, metadata: { patch, error: error.message } });
    return NextResponse.json({ error: error.message ?? 'No se pudo actualizar el producto.' }, { status: 500 });
  }
  await recordAdminAudit({ session: auth.session, request, action: 'update', resource: 'products', resourceId: id, metadata: { patch } });
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

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { recordAdminAudit, recordAdminFailure } from '@/lib/adminAudit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CategoryBody = {
  name?: unknown;
  description?: unknown;
  image_url?: unknown;
};

type AdminCategory = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  created_at?: string;
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function categoryId(request: NextRequest) {
  return new URL(request.url).searchParams.get('id')?.trim() ?? '';
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'read' });
  if (!auth.ok) return auth.response;

  const { data, error } = await insforgeAdmin.database
    .from('categories')
    .select('id, name, description, image_url, created_at')
    .order('name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message || 'No se pudieron cargar las categorías.' }, { status: 500 });
  return NextResponse.json({ categories: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'create' });
  if (!auth.ok) return auth.response;

  let body: CategoryBody;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 }); }

  const name = cleanText(body.name, 80);
  const description = cleanText(body.description, 280);
  const imageUrl = cleanText(body.image_url, 1200);
  if (name.length < 2) return NextResponse.json({ error: 'Escribe un nombre de categoría de al menos 2 caracteres.' }, { status: 400 });

  const { data: existing } = await insforgeAdmin.database.from('categories').select('id, name').ilike('name', name).limit(1);
  if (Array.isArray(existing) && existing.length) return NextResponse.json({ error: 'Ya existe una categoría con ese nombre.' }, { status: 409 });

  const payload = { name, description: description || null, image_url: imageUrl || null };
  const { data, error } = await insforgeAdmin.database.from('categories').insert([payload]);
  if (error) {
    await recordAdminFailure({ session: auth.session, request, action: 'create', resource: 'products', metadata: { entity: 'category', error: error.message } });
    return NextResponse.json({ error: error.message || 'No se pudo crear la categoría.' }, { status: 500 });
  }

  let category: AdminCategory | null = Array.isArray(data) ? (data[0] as AdminCategory | undefined) ?? null : null;
  if (!category) {
    const { data: fresh } = await insforgeAdmin.database.from('categories').select('id, name, description, image_url, created_at').ilike('name', name).limit(1);
    category = Array.isArray(fresh) ? (fresh[0] as AdminCategory | undefined) ?? null : null;
  }
  if (!category?.id) {
    return NextResponse.json({ error: 'La categoría se creó, pero no se pudo recuperar su identificador. Actualiza el catálogo e inténtalo otra vez.' }, { status: 500 });
  }
  await recordAdminAudit({ session: auth.session, request, action: 'create', resource: 'products', metadata: { entity: 'category', name } });
  return NextResponse.json({ ok: true, category }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'update' });
  if (!auth.ok) return auth.response;
  const id = categoryId(request);
  if (!id) return NextResponse.json({ error: 'ID de categoría requerido.' }, { status: 400 });

  let body: CategoryBody;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 }); }
  const patch: Record<string, string | null> = {};
  if (body.name !== undefined) {
    const name = cleanText(body.name, 80);
    if (name.length < 2) return NextResponse.json({ error: 'El nombre debe tener al menos 2 caracteres.' }, { status: 400 });
    patch.name = name;
  }
  if (body.description !== undefined) patch.description = cleanText(body.description, 280) || null;
  if (body.image_url !== undefined) patch.image_url = cleanText(body.image_url, 1200) || null;
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'No hay cambios válidos.' }, { status: 400 });

  const { error } = await insforgeAdmin.database.from('categories').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message || 'No se pudo actualizar la categoría.' }, { status: 500 });
  await recordAdminAudit({ session: auth.session, request, action: 'update', resource: 'products', resourceId: id, metadata: { entity: 'category', patch } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'delete' });
  if (!auth.ok) return auth.response;
  const id = categoryId(request);
  if (!id) return NextResponse.json({ error: 'ID de categoría requerido.' }, { status: 400 });

  const { count } = await insforgeAdmin.database.from('products').select('id', { count: 'exact', head: true }).eq('category_id', id);
  if ((count ?? 0) > 0) return NextResponse.json({ error: `Esta categoría contiene ${count} producto(s). Muévelos antes de eliminarla.` }, { status: 409 });

  const { error } = await insforgeAdmin.database.from('categories').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message || 'No se pudo eliminar la categoría.' }, { status: 500 });
  await recordAdminAudit({ session: auth.session, request, action: 'delete', resource: 'products', resourceId: id, metadata: { entity: 'category' } });
  return NextResponse.json({ ok: true });
}

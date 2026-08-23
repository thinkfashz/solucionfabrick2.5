import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { requireAdminPermission } from '@/lib/adminPermissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };
const VALID_STATUS = new Set(['approved', 'rejected', 'pending']);

function cleanId(value: string) {
  return value.trim().slice(0, 120);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdminPermission(request, { resource: 'content', action: 'update' });
  if (!auth.ok) return auth.response;

  const { id: rawId } = await params;
  const id = cleanId(rawId);
  if (!id) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

  const body = await request.json().catch(() => null) as { status?: unknown } | null;
  const status = typeof body?.status === 'string' ? body.status.trim() : '';
  if (!VALID_STATUS.has(status)) return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });

  try {
    const { error } = await insforgeAdmin.database
      .from('blog_comments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo actualizar el comentario.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdminPermission(request, { resource: 'content', action: 'delete' });
  if (!auth.ok) return auth.response;

  const { id: rawId } = await params;
  const id = cleanId(rawId);
  if (!id) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

  try {
    const { error } = await insforgeAdmin.database
      .from('blog_comments')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo eliminar el comentario.' },
      { status: 500 },
    );
  }
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { deleteMaterial, updateMaterial, BudgetError, type MaterialInput } from '@/lib/budget';
import { publishCmsEvent } from '@/lib/cmsBus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** PATCH /api/admin/materials/[id] — partial update (price, stock, active, …). */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const { id } = await ctx.params;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: Partial<MaterialInput> = {};
    if ('name' in body) patch.name = String(body.name ?? '');
    if ('description' in body) patch.description = body.description as string | null;
    if ('category' in body) patch.category = String(body.category ?? '');
    if ('unit' in body) patch.unit = String(body.unit ?? '');
    if ('price' in body) patch.price = Number(body.price);
    if ('image_url' in body) patch.image_url = body.image_url as string | null;
    if ('active' in body) patch.active = Boolean(body.active);
    if ('stock' in body) patch.stock = body.stock === null ? null : Number(body.stock);
    if ('position' in body) patch.position = Number(body.position);

    const updated = await updateMaterial(id, patch);

    publishCmsEvent({
      topic: 'materials',
      action: 'update',
      id: updated.id,
      paths: ['/presupuesto'],
    });

    return NextResponse.json({ material: updated });
  } catch (err) {
    if (err instanceof BudgetError) {
      return NextResponse.json(
        { error: err.message, code: err.code, hint: err.hint },
        { status: err.status },
      );
    }
    return adminError(err, 'MATERIAL_UPDATE_FAILED');
  }
}

/** DELETE /api/admin/materials/[id] — remove a material. */
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const { id } = await ctx.params;

    await deleteMaterial(id);

    publishCmsEvent({
      topic: 'materials',
      action: 'delete',
      id,
      paths: ['/presupuesto'],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BudgetError) {
      return NextResponse.json(
        { error: err.message, code: err.code, hint: err.hint },
        { status: err.status },
      );
    }
    return adminError(err, 'MATERIAL_DELETE_FAILED');
  }
}

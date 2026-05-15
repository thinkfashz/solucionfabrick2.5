import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { deleteMaterial, updateMaterial, BudgetError, type MaterialInput } from '@/lib/budget';
import { publishCmsEvent } from '@/lib/cmsBus';
import { v, parse, validationError } from '@/lib/validate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const materialPatchSchema = {
  name:     v.string({ min: 1, max: 200 }),
  category: v.string({ max: 100 }),
  unit:     v.string({ max: 50 }),
  price:    v.number({ min: 0 }),
  active:   v.boolean(),
  stock:    v.number({ min: 0 }),
  position: v.number({ min: 0 }),
};

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
    const parsed = parse(materialPatchSchema, body);
    if (!parsed.ok) return validationError(parsed.errors);

    const patch: Partial<MaterialInput> = { ...parsed.data } as Partial<MaterialInput>;
    // description and image_url can be explicitly null to clear the field.
    if ('description' in body) patch.description = body.description as string | null;
    if ('image_url' in body) patch.image_url = body.image_url as string | null;

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

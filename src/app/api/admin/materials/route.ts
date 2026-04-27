import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { createMaterial, getMaterials, BudgetError } from '@/lib/budget';
import { publishCmsEvent } from '@/lib/cmsBus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** GET /api/admin/materials — list all materials (admin view, includes inactive). */
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const materials = await getMaterials();
    return NextResponse.json({ materials });
  } catch (err) {
    return adminError(err, 'MATERIALS_LIST_FAILED');
  }
}

/** POST /api/admin/materials — create a new material. */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const created = await createMaterial({
      name: String(body.name ?? ''),
      description: typeof body.description === 'string' ? body.description : null,
      category: String(body.category ?? 'obra-gruesa'),
      unit: String(body.unit ?? 'unidad'),
      price: Number(body.price ?? 0),
      image_url: typeof body.image_url === 'string' ? body.image_url : null,
      active: body.active === undefined ? true : Boolean(body.active),
      stock: body.stock === undefined || body.stock === null ? null : Number(body.stock),
      position: body.position === undefined ? 0 : Number(body.position),
    });

    publishCmsEvent({
      topic: 'materials',
      action: 'create',
      id: created.id,
      paths: ['/presupuesto'],
    });

    return NextResponse.json({ material: created }, { status: 201 });
  } catch (err) {
    if (err instanceof BudgetError) {
      return NextResponse.json(
        { error: err.message, code: err.code, hint: err.hint },
        { status: err.status },
      );
    }
    return adminError(err, 'MATERIAL_CREATE_FAILED');
  }
}

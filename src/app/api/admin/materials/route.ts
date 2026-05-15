import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { createMaterial, getMaterials, BudgetError } from '@/lib/budget';
import { publishCmsEvent } from '@/lib/cmsBus';
import { v, parse, validationError } from '@/lib/validate';

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

const materialSchema = {
  name:        v.string({ required: true, min: 1, max: 200 }),
  description: v.string({ max: 1000 }),
  category:    v.string({ max: 100 }),
  unit:        v.string({ max: 50 }),
  price:       v.number({ min: 0 }),
  image_url:   v.string({ max: 500 }),
  active:      v.boolean(),
  stock:       v.number({ min: 0 }),
  position:    v.number({ min: 0 }),
};

/** POST /api/admin/materials — create a new material. */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const raw = await request.json().catch(() => ({}));
    const parsed = parse(materialSchema, raw);
    if (!parsed.ok) return validationError(parsed.errors);
    const d = parsed.data as {
      name: string; description?: string; category?: string; unit?: string;
      price?: number; image_url?: string; active?: boolean; stock?: number; position?: number;
    };

    const created = await createMaterial({
      name:        d.name,
      description: d.description ?? null,
      category:    d.category ?? 'obra-gruesa',
      unit:        d.unit ?? 'unidad',
      price:       d.price ?? 0,
      image_url:   d.image_url ?? null,
      active:      d.active ?? true,
      stock:       d.stock ?? null,
      position:    d.position ?? 0,
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

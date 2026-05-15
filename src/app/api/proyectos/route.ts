import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { insforge } from '@/lib/insforge';
import { PROJECTS_CACHE_TAG } from '@/lib/projects';
import { getPublicProjects } from '@/lib/projectsServer';
import { v, parse, validationError } from '@/lib/validate';

/**
 * GET   /api/proyectos            — list projects (DB ⇢ fallback seed)
 * POST  /api/proyectos            — create a project (DB only)
 * PATCH /api/proyectos?id=XYZ     — update a project (DB only)
 * DELETE /api/proyectos?id=XYZ    — delete a project (DB only)
 */

const proyectoSchema = {
  title:       v.string({ required: true, min: 1, max: 200 }),
  location:    v.string({ required: true, min: 1, max: 200 }),
  year:        v.string({ max: 10 }),
  area_m2:     v.number({ min: 0 }),
  category:    v.string({ max: 100 }),
  hero_image:  v.string({ max: 1000 }),
  summary:     v.string({ max: 500 }),
  description: v.string({ max: 10000 }),
  gallery:     v.array({ of: v.string({ max: 1000 }), maxItems: 30 }),
  materials:   v.array({ of: v.string({ max: 200 }), maxItems: 50 }),
  highlights:  v.array({ of: v.string({ max: 300 }), maxItems: 20 }),
  scope:       v.array({ of: v.string({ max: 300 }), maxItems: 20 }),
  featured:    v.boolean(),
};

// PATCH accepts all fields as optional
const proyectoPatchSchema = Object.fromEntries(
  Object.entries(proyectoSchema).map(([k, def]) => [k, { ...def, required: false }]),
);

export async function GET() {
  const { data, source } = await getPublicProjects();
  return NextResponse.json({ data, source });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = parse(proyectoSchema, body);
    if (!result.ok) return validationError(result.errors);

    const { data, error } = await insforge.database
      .from('projects')
      .insert([result.data]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidateTag(PROJECTS_CACHE_TAG);
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing ?id parameter' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const result = parse(proyectoPatchSchema, body);
    if (!result.ok) return validationError(result.errors);
    if (Object.keys(result.data).length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron campos para actualizar.' }, { status: 400 });
    }

    const { data, error } = await insforge.database
      .from('projects')
      .update(result.data)
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidateTag(PROJECTS_CACHE_TAG);
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing ?id parameter' }, { status: 400 });

    const { error } = await insforge.database
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidateTag(PROJECTS_CACHE_TAG);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

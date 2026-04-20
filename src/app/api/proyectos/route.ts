import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { getSeedProjects, type FabrickProject } from '@/lib/projects';

/**
 * GET   /api/proyectos            — list projects (DB ⇢ fallback seed)
 * POST  /api/proyectos            — create a project (DB only)
 * PATCH /api/proyectos?id=XYZ     — update a project (DB only)
 * DELETE /api/proyectos?id=XYZ    — delete a project (DB only)
 *
 * The backend table is named `projects`. If that table does not exist yet,
 * the GET handler transparently returns the seed list so the public page
 * always has content. Mutations will error with a friendly message until
 * the admin creates the table via InsForge console.
 */

const FIELDS =
  'id, title, location, year, area_m2, category, hero_image, gallery, summary, description, materials, highlights, scope, featured, created_at, updated_at';

export async function GET() {
  try {
    const { data, error } = await insforge.database
      .from('projects')
      .select(FIELDS)
      .order('featured', { ascending: false })
      .order('year', { ascending: false });

    if (error || !data || data.length === 0) {
      return NextResponse.json({ data: getSeedProjects(), source: 'seed' });
    }
    return NextResponse.json({ data, source: 'db' });
  } catch {
    return NextResponse.json({ data: getSeedProjects(), source: 'seed' });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<FabrickProject>;
    const { data, error } = await insforge.database
      .from('projects')
      .insert([body]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing ?id parameter' }, { status: 400 });
    }
    const body = (await request.json()) as Partial<FabrickProject>;
    const { data, error } = await insforge.database
      .from('projects')
      .update(body)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing ?id parameter' }, { status: 400 });
    }
    const { error } = await insforge.database
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

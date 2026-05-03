import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { insforge } from '@/lib/insforge';
import { type FabrickProject, PROJECTS_CACHE_TAG } from '@/lib/projects';
import { getPublicProjects } from '@/lib/projectsServer';

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

export async function GET() {
  const { data, source } = await getPublicProjects();
  return NextResponse.json({ data, source });
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
    revalidateTag(PROJECTS_CACHE_TAG);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

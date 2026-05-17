import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

type Role = 'superadmin' | 'admin' | 'viewer';

async function readSession(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return { error: NextResponse.json({ error: 'No autenticado.' }, { status: 401 }) };
  }
  const payload = await decodeSession(sessionCookie.value);
  if (!payload) {
    return { error: NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 }) };
  }
  return { payload };
}

function canWrite(role?: Role) {
  return role === 'superadmin' || role === 'admin';
}

function parseProductId(request: NextRequest) {
  return new URL(request.url).searchParams.get('id')?.trim() ?? '';
}

export async function GET(request: NextRequest) {
  const auth = await readSession(request);
  if (auth.error) return auth.error;

  const { data, error } = await insforgeAdmin.database
    .from('products')
    .select('id, name, description, price, stock, image_url, featured, activo, tagline, category_id, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message ?? 'No se pudieron cargar los productos.' }, { status: 500 });
  }

  return NextResponse.json({ products: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const auth = await readSession(request);
  if (auth.error) return auth.error;
  if (!canWrite(auth.payload?.rol as Role | undefined)) {
    return NextResponse.json({ error: 'No tienes permisos para modificar productos.' }, { status: 403 });
  }

  const id = parseProductId(request);
  if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
  }

  const patch: Record<string, boolean> = {};
  if (typeof body.activo === 'boolean') patch.activo = body.activo;
  if (typeof body.featured === 'boolean') patch.featured = body.featured;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No hay campos válidos para actualizar.' }, { status: 400 });
  }

  const { error } = await insforgeAdmin.database.from('products').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message ?? 'No se pudo actualizar el producto.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await readSession(request);
  if (auth.error) return auth.error;
  if (!canWrite(auth.payload?.rol as Role | undefined)) {
    return NextResponse.json({ error: 'No tienes permisos para eliminar productos.' }, { status: 403 });
  }

  const id = parseProductId(request);
  if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

  const { error } = await insforgeAdmin.database.from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message ?? 'No se pudo eliminar el producto.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

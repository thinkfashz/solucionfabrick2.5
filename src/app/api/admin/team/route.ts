import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const payload = await decodeSession(sessionCookie.value);
  if (!payload) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });

  const { data, error } = await insforgeAdmin.database
    .from('admin_users')
    .select('email, nombre, rol, aprobado, created_at, updated_at')
    .order('created_at', { ascending: true });

  if (error) {
    if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
      return NextResponse.json({ members: [], pending: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all = data || [];
  return NextResponse.json({
    members: all.filter((m: any) => m.aprobado === true),
    pending: all.filter((m: any) => m.aprobado === false),
  });
}

export async function PATCH(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const payload = await decodeSession(sessionCookie.value);
  if (!payload) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
  if (payload.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Solo superadmin puede modificar el equipo.' }, { status: 403 });
  }

  let email: string;
  let action: string;
  let rol: string | undefined;
  try {
    const body = await request.json();
    email = (body.email ?? '').trim().toLowerCase();
    action = body.action ?? '';
    rol = body.rol;
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  if (!email || !['approve', 'reject', 'set_role'].includes(action)) {
    return NextResponse.json({ error: 'Email y acción válida son requeridos.' }, { status: 400 });
  }

  // Proteger al superadmin de modificarse a sí mismo
  if (email === payload.email && action !== 'approve') {
    return NextResponse.json({ error: 'No puedes modificar tu propia cuenta.' }, { status: 400 });
  }

  if (action === 'approve') {
    const { error } = await insforgeAdmin.database
      .from('admin_users').update({ aprobado: true }).eq('email', email);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'reject') {
    const { error } = await insforgeAdmin.database
      .from('admin_users').delete().eq('email', email);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'set_role') {
    if (!rol || !['superadmin', 'admin', 'viewer'].includes(rol)) {
      return NextResponse.json({ error: 'Rol válido requerido.' }, { status: 400 });
    }
    const { error } = await insforgeAdmin.database
      .from('admin_users').update({ rol }).eq('email', email);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });
}

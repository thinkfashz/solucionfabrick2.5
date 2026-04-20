import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@insforge/sdk';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

async function getInsforgeClient() {
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';
  return createClient({ baseUrl, anonKey });
}

async function checkSuperadmin(sessionEmail: string): Promise<boolean> {
  const insforge = await getInsforgeClient();
  const { data, error } = await insforge.database
    .from('admin_users')
    .select('rol')
    .eq('email', sessionEmail)
    .limit(1);
  
  if (error || !data || data.length === 0) return false;
  return (data[0] as { rol?: string }).rol === 'superadmin';
}

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const payload = await decodeSession(sessionCookie.value);
  if (!payload) {
    return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
  }

  const insforge = await getInsforgeClient();

  try {
    const { data, error } = await insforge.database
      .from('admin_users')
      .select('email, nombre, rol, aprobado, created_at, updated_at');

    if (error) {
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        return NextResponse.json({
          error: 'Tabla no encontrada.',
          hint: 'Crea la tabla `admin_users` en InsForge (ver README o issue-linked SQL).'
        }, { status: 500 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allMembers = data || [];
    const members = allMembers.filter((m: any) => m.aprobado === true);
    const pending = allMembers.filter((m: any) => m.aprobado === false);

    return NextResponse.json({ members, pending });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al listar equipo.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const payload = await decodeSession(sessionCookie.value);
  if (!payload) {
    return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
  }

  // Check if user is superadmin
  const isSuperadmin = await checkSuperadmin(payload.email);
  if (!isSuperadmin) {
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

  const insforge = await getInsforgeClient();

  try {
    if (action === 'approve') {
      const { error } = await insforge.database
        .from('admin_users')
        .update({ aprobado: true })
        .eq('email', email);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    if (action === 'reject') {
      const { error } = await insforge.database
        .from('admin_users')
        .delete()
        .eq('email', email);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    if (action === 'set_role') {
      if (!rol || !['superadmin', 'admin', 'viewer'].includes(rol)) {
        return NextResponse.json({ error: 'Rol válido es requerido.' }, { status: 400 });
      }

      const { error } = await insforge.database
        .from('admin_users')
        .update({ rol })
        .eq('email', email);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al modificar equipo.' }, { status: 500 });
  }
}

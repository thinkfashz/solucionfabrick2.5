import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || 'https://www.solucionesfabrick.com'
).replace(/\/$/, '');

function isMissingTable(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message ?? String(error ?? '');
  return /does not exist|relation|schema cache|could not find/i.test(message);
}

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const payload = await decodeSession(sessionCookie.value);
  if (!payload) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
  if (payload.rol === 'viewer') return NextResponse.json({ tokens: [] });

  const { data, error } = await insforgeAdmin.database
    .from('demo_tokens')
    .select('id, token, label, created_by, expira_at, accesos, ultimo_acceso, locked_ip, locked_at, ultimo_ip, ultimo_user_agent, ultimo_dispositivo, created_at')
    .gt('expira_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ tokens: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tokens = (data || []).map((t: any) => ({
    ...t,
    link: `${APP_URL}/admin/acceso-demo?token=${t.token}`,
  }));

  return NextResponse.json({ tokens });
}

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const payload = await decodeSession(sessionCookie.value);
  if (!payload) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
  if (payload.rol === 'viewer') {
    return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });
  }

  let label: string | undefined;
  try {
    const body = await request.json();
    label = body.label?.trim() || undefined;
  } catch { /* label is optional */ }

  const token = crypto.randomUUID();
  const expira_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const link = `${APP_URL}/admin/acceso-demo?token=${token}`;

  const { error } = await insforgeAdmin.database
    .from('demo_tokens')
    .insert([{ token, label, created_by: payload.email, expira_at, accesos: 0 }]);

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({
        error: 'La tabla demo_tokens no existe. Córrela en el SQL Editor.',
      }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, link, token });
}

export async function DELETE(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const payload = await decodeSession(sessionCookie.value);
  if (!payload) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
  if (payload.rol === 'viewer') {
    return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

  const { error } = await insforgeAdmin.database
    .from('demo_tokens')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

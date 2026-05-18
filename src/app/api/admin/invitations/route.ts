import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { sendAdminInviteEmail } from '@/lib/emailDriver';

export const dynamic = 'force-dynamic';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.solucionesfabrick.com').replace(/\/$/, '');

async function readPayload(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return { error: NextResponse.json({ error: 'No autenticado.' }, { status: 401 }) };
  const payload = await decodeSession(sessionCookie.value);
  if (!payload) return { error: NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 }) };
  return { payload };
}

export async function GET(request: NextRequest) {
  const auth = await readPayload(request);
  if (auth.error) return auth.error;
  if (auth.payload?.rol === 'viewer') return NextResponse.json({ invitations: [] });

  const { data, error } = await insforgeAdmin.database
    .from('admin_invitations')
    .select('id, email, rol, token, codigo, expira_at, created_at')
    .eq('usado', false)
    .gt('expira_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
      return NextResponse.json({ invitations: [], hint: 'Crea la tabla admin_invitations.' });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const invitations = (data || []).map((inv: any) => ({
    id: inv.id,
    email: inv.email,
    rol: inv.rol,
    codigo: inv.codigo,
    link: `${APP_URL}/admin/unirse?token=${inv.token}`,
    expira_at: inv.expira_at,
    created_at: inv.created_at,
  }));

  return NextResponse.json({ invitations });
}

export async function POST(request: NextRequest) {
  const auth = await readPayload(request);
  if (auth.error) return auth.error;
  const payload = auth.payload;
  if (payload?.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });
  if (payload?.rol !== 'superadmin') return NextResponse.json({ error: 'Solo superadmin puede crear invitaciones.' }, { status: 403 });

  let email: string;
  let rol: string;
  try {
    const body = await request.json();
    email = (body.email ?? '').trim().toLowerCase();
    rol = ['admin', 'viewer', 'superadmin'].includes(body.rol) ? body.rol : 'admin';
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  if (!email) return NextResponse.json({ error: 'Email es requerido.' }, { status: 400 });

  const token = crypto.randomUUID();
  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  const expira_at = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  const link = `${APP_URL}/admin/unirse?token=${token}`;

  const { error: insertError } = await insforgeAdmin.database
    .from('admin_invitations')
    .insert([{ email, token, codigo, rol, invitado_por: payload.email, expira_at, usado: false }]);

  if (insertError) {
    if (insertError.message?.includes('does not exist') || insertError.message?.includes('relation')) {
      return NextResponse.json({ error: 'La tabla admin_invitations no existe. Córrela en InsForge SQL Editor.' }, { status: 500 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const emailResult = await sendAdminInviteEmail({
    to: email,
    role: rol,
    inviteLink: link,
    codigo,
    invitedBy: payload?.email,
  });
  const emailSent = emailResult.ok && !emailResult.simulated;

  return NextResponse.json({ ok: true, emailSent, link, codigo });
}

export async function DELETE(request: NextRequest) {
  const auth = await readPayload(request);
  if (auth.error) return auth.error;
  const payload = auth.payload;
  if (payload?.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });
  if (payload?.rol !== 'superadmin') return NextResponse.json({ error: 'Solo superadmin puede eliminar invitaciones.' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

  const { error } = await insforgeAdmin.database.from('admin_invitations').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

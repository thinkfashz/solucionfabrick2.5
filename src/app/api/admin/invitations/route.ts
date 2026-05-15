import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || 'https://www.solucionesfabrick.com'
).replace(/\/$/, '');

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const payload = await decodeSession(sessionCookie.value);
  if (!payload) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });

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
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const payload = await decodeSession(sessionCookie.value);
  if (!payload) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
  if (payload.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Solo superadmin puede crear invitaciones.' }, { status: 403 });
  }

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
  const expira_at = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72 horas
  const link = `${APP_URL}/admin/unirse?token=${token}`;

  const { error: insertError } = await insforgeAdmin.database
    .from('admin_invitations')
    .insert([{ email, token, codigo, rol, invitado_por: payload.email, expira_at, usado: false }]);

  if (insertError) {
    if (insertError.message?.includes('does not exist') || insertError.message?.includes('relation')) {
      return NextResponse.json({
        error: 'La tabla admin_invitations no existe. Córrela en InsForge SQL Editor.',
      }, { status: 500 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Intentar enviar email via Resend
  let emailSent = false;
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const resendFrom = process.env.RESEND_FROM || 'Fabrick Admin <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFrom,
          to: email,
          subject: 'Te invitaron al Panel de Administración',
          html: `
            <!DOCTYPE html>
            <html>
            <body style="background:#0a0a0a;color:#fff;font-family:sans-serif;padding:40px 20px;margin:0;">
              <div style="max-width:480px;margin:0 auto;background:#111;border:1px solid #222;border-radius:20px;padding:40px;">
                <div style="background:#facc15;color:#000;width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:24px;font-weight:900;font-size:14px;letter-spacing:3px;">SF</div>
                <h1 style="font-size:22px;font-weight:900;margin:0 0 8px;">Invitación al Panel Fabrick</h1>
                <p style="color:#888;font-size:13px;margin:0 0 28px;">Has sido invitado como <strong style="color:#facc15;">${rol.toUpperCase()}</strong></p>
                <a href="${link}" style="display:block;background:#facc15;color:#000;font-weight:900;text-decoration:none;border-radius:100px;padding:14px 28px;text-align:center;font-size:14px;letter-spacing:2px;margin-bottom:24px;">
                  CREAR MI CONTRASEÑA →
                </a>
                <p style="color:#555;font-size:11px;margin:0 0 8px;">O copia este enlace en tu navegador:</p>
                <p style="color:#888;font-size:11px;word-break:break-all;background:#1a1a1a;padding:12px;border-radius:8px;">${link}</p>
                <p style="color:#555;font-size:11px;margin:16px 0 0;">Este enlace expira en 72 horas.</p>
              </div>
            </body>
            </html>
          `,
        }),
      });
      if (res.ok) emailSent = true;
    } catch {
      // Email falla — devolvemos el link igual
    }
  }

  return NextResponse.json({ ok: true, emailSent, link, codigo });
}

export async function DELETE(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const payload = await decodeSession(sessionCookie.value);
  if (!payload) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
  if (payload.rol !== 'superadmin') {
    return NextResponse.json({ error: 'Solo superadmin puede eliminar invitaciones.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

  const { error } = await insforgeAdmin.database
    .from('admin_invitations')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

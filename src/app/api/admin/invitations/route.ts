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
      .from('admin_invitations')
      .select('id, email, rol, codigo, expira_at, created_at')
      .eq('usado', false)
      .gt('expira_at', new Date().toISOString());

    if (error) {
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        return NextResponse.json({
          error: 'Tabla no encontrada.',
          hint: 'Crea la tabla `admin_invitations` en InsForge (ver README o issue-linked SQL).'
        }, { status: 500 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const invitations = (data || []).map((inv: any) => ({
      id: inv.id,
      email: inv.email,
      rol: inv.rol,
      codigo: '••••' + inv.codigo.slice(-2),
      expira_at: inv.expira_at,
      created_at: inv.created_at,
    }));

    return NextResponse.json({ invitations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al listar invitaciones.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: 'Solo superadmin puede crear invitaciones.' }, { status: 403 });
  }

  let email: string;
  let rol: string;
  try {
    const body = await request.json();
    email = (body.email ?? '').trim().toLowerCase();
    rol = body.rol ?? 'admin';
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  if (!email || !['admin', 'viewer'].includes(rol)) {
    return NextResponse.json({ error: 'Email y rol válido son requeridos.' }, { status: 400 });
  }

  // Generate 6-digit code
  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  const expira_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const insforge = await getInsforgeClient();

  try {
    const { error: insertError } = await insforge.database
      .from('admin_invitations')
      .insert([{
        email,
        codigo,
        rol,
        invitado_por: payload.email,
        expira_at,
        usado: false,
      }]);

    if (insertError) {
      if (insertError.message?.includes('does not exist') || insertError.message?.includes('relation')) {
        return NextResponse.json({
          error: 'Tabla no encontrada.',
          hint: 'Crea la tabla `admin_invitations` en InsForge (ver README o issue-linked SQL).'
        }, { status: 500 });
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Try to send email via Resend
    let emailSent = false;
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const resendFrom = process.env.RESEND_FROM || 'Fabrick Admin <onboarding@resend.dev>';
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: resendFrom,
            to: email,
            subject: 'Invitación al Panel Fabrick',
            html: `
              <p>Has sido invitado a unirte al panel de administración de Fabrick.</p>
              <p><strong>Tu código de invitación:</strong> ${codigo}</p>
              <p>Este código expira en 24 horas.</p>
              <p>Ve a <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/unirse">/admin/unirse</a> para completar tu registro.</p>
            `,
          }),
        });

        if (response.ok) {
          emailSent = true;
        }
      } catch {
        // Email failed but we still return success with code
      }
    }

    return NextResponse.json({ 
      ok: true, 
      code: emailSent ? undefined : codigo,
      emailSent 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al crear invitación.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    return NextResponse.json({ error: 'Solo superadmin puede eliminar invitaciones.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID de invitación requerido.' }, { status: 400 });
  }

  const insforge = await getInsforgeClient();

  try {
    const { error } = await insforge.database
      .from('admin_invitations')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        return NextResponse.json({
          error: 'Tabla no encontrada.',
          hint: 'Crea la tabla `admin_invitations` en InsForge (ver README o issue-linked SQL).'
        }, { status: 500 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al eliminar invitación.' }, { status: 500 });
  }
}

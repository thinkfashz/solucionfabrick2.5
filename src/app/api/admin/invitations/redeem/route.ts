import { NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';

export const dynamic = 'force-dynamic';

async function getInsforgeClient() {
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';
  return createClient({ baseUrl, anonKey });
}

export async function POST(request: Request) {
  let email: string;
  let codigo: string;
  let password: string;
  let nombre: string | undefined;

  try {
    const body = await request.json();
    email = (body.email ?? '').trim().toLowerCase();
    codigo = (body.codigo ?? '').trim();
    password = body.password ?? '';
    nombre = body.nombre?.trim();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  if (!email || !codigo || !password) {
    return NextResponse.json({ error: 'Email, código y contraseña son requeridos.' }, { status: 400 });
  }

  const insforge = await getInsforgeClient();

  try {
    // Find matching invitation
    const { data: invitations, error: invError } = await insforge.database
      .from('admin_invitations')
      .select('id, email, codigo, rol, usado, expira_at')
      .eq('email', email)
      .eq('codigo', codigo)
      .eq('usado', false)
      .gt('expira_at', new Date().toISOString())
      .limit(1);

    if (invError) {
      if (invError.message?.includes('does not exist') || invError.message?.includes('relation')) {
        return NextResponse.json({
          error: 'Tabla no encontrada.',
          hint: 'Crea la tabla `admin_invitations` en InsForge (ver README o issue-linked SQL).'
        }, { status: 500 });
      }
      return NextResponse.json({ error: invError.message }, { status: 500 });
    }

    if (!invitations || invitations.length === 0) {
      return NextResponse.json({ error: 'Código inválido o expirado.' }, { status: 400 });
    }

    const invitation = invitations[0] as { id: string; rol: string };

    // Try to create the auth account, then ALWAYS verify the password by
    // signing in. This closes a subtle hole: if `signUp` is idempotent for an
    // already-registered email (no error returned), we'd otherwise mark the
    // invitation as used without checking the password, letting an attacker
    // burn valid codes without successful authentication.
    const { error: signUpError } = await insforge.auth.signUp({
      email,
      password,
      name: nombre,
    });

    const { error: signInError } = await insforge.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      const message = signUpError?.message || signInError.message || 'Credenciales inválidas.';
      return NextResponse.json(
        { error: 'No se pudo verificar la cuenta: ' + message },
        { status: 400 },
      );
    }

    // Upsert admin_users row
    const { error: upsertError } = await insforge.database
      .from('admin_users')
      .upsert([{
        email,
        nombre: nombre || email.split('@')[0],
        rol: invitation.rol,
        aprobado: false,
      }], {
        onConflict: 'email',
      });

    if (upsertError) {
      if (upsertError.message?.includes('does not exist') || upsertError.message?.includes('relation')) {
        return NextResponse.json({
          error: 'Tabla no encontrada.',
          hint: 'Crea la tabla `admin_users` en InsForge (ver README o issue-linked SQL).'
        }, { status: 500 });
      }
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    // Mark invitation as used
    const { error: updateError } = await insforge.database
      .from('admin_invitations')
      .update({ usado: true })
      .eq('id', invitation.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, pendingApproval: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al canjear invitación.' }, { status: 500 });
  }
}

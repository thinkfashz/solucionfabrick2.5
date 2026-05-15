import { NextResponse } from 'next/server';
import { insforge, insforgeAdmin } from '@/lib/insforge';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let email: string | undefined;
  let codigo: string | undefined;
  let token: string | undefined;
  let password: string;
  let nombre: string | undefined;

  try {
    const body = await request.json();
    email = body.email ? (body.email as string).trim().toLowerCase() : undefined;
    codigo = body.codigo ? (body.codigo as string).trim() : undefined;
    token = body.token ? (body.token as string).trim() : undefined;
    password = body.password ?? '';
    nombre = body.nombre?.trim();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
  }
  if (!token && (!email || !codigo)) {
    return NextResponse.json({ error: 'Se requiere token o email+código.' }, { status: 400 });
  }

  // Buscar la invitación por token O por email+codigo
  let invQuery = insforgeAdmin.database
    .from('admin_invitations')
    .select('id, email, token, rol, usado, expira_at')
    .eq('usado', false)
    .gt('expira_at', new Date().toISOString())
    .limit(1);

  if (token) {
    invQuery = invQuery.eq('token', token);
  } else {
    invQuery = invQuery.eq('email', email!).eq('codigo', codigo!);
  }

  const { data: invitations, error: invError } = await invQuery;

  if (invError) {
    return NextResponse.json({ error: 'Error en la base de datos: ' + invError.message }, { status: 500 });
  }

  if (!invitations || invitations.length === 0) {
    return NextResponse.json({ error: 'Invitación inválida o expirada.' }, { status: 400 });
  }

  const invitation = invitations[0] as { id: string; email: string; rol: string };
  const inviteeEmail = invitation.email;

  // Crear cuenta en InsForge Auth
  const { error: signUpError } = await insforge.auth.signUp({
    email: inviteeEmail,
    password,
    name: nombre || inviteeEmail.split('@')[0],
  });

  // Verificar que la contraseña funciona
  const { error: signInError } = await insforge.auth.signInWithPassword({
    email: inviteeEmail,
    password,
  });

  if (signInError) {
    const msg = signUpError?.message || signInError.message || 'Credenciales inválidas.';
    return NextResponse.json({ error: 'No se pudo verificar la cuenta: ' + msg }, { status: 400 });
  }

  // Insertar en admin_users — ¡Ahora el SDK tiene permisos gracias a tu PR #170!
  const { error: upsertError } = await insforgeAdmin.database
    .from('admin_users')
    .upsert([{
      email: inviteeEmail,
      nombre: nombre || inviteeEmail.split('@')[0],
      rol: invitation.rol,
      aprobado: true,
    }], { onConflict: 'email' });

  // BLOQUEO DE SEGURIDAD (Corrige el bug de Greptile): 
  // Si el upsert falla, cortamos el proceso para no "quemar" la invitación.
  if (upsertError) {
    return NextResponse.json({ error: 'No se pudo crear el perfil de administrador: ' + upsertError.message }, { status: 500 });
  }

  // Marcar invitación como usada SOLAMENTE si todo lo de arriba fue exitoso
  const { error: updateError } = await insforgeAdmin.database
    .from('admin_invitations')
    .update({ usado: true })
    .eq('id', invitation.id);

  if (updateError) {
    return NextResponse.json({ error: 'Perfil creado, pero error al invalidar token.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

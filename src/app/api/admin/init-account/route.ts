import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'f.eduardomicolta@gmail.com';
const ADMIN_INITIAL_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || '8dediciembre';

export async function POST() {
  // Attempt to create the admin account in InsForge
  const { data: signUpData, error: signUpError } = await insforge.auth.signUp({
    email: ADMIN_EMAIL,
    password: ADMIN_INITIAL_PASSWORD,
    name: 'Admin Fabrick',
  });

  const userAlreadyExists =
    signUpError &&
    (signUpError.message.toLowerCase().includes('already') ||
      signUpError.message.toLowerCase().includes('exists') ||
      signUpError.message.toLowerCase().includes('duplicate') ||
      signUpError.message.toLowerCase().includes('registrado') ||
      (signUpError.statusCode !== undefined && signUpError.statusCode === 409));

  if (signUpError && !userAlreadyExists) {
    return NextResponse.json(
      { error: signUpError.message || 'Error al crear la cuenta.' },
      { status: 400 }
    );
  }

  // Ensure the admin email is in the admin_users table AND approved. Without
  // `aprobado: true` the login route will block this bootstrap account with
  // "Tu cuenta está pendiente de aprobación." once the team/invitations
  // feature is in use (which adds an `aprobado` column defaulting to false).
  const bootstrapRow = {
    email: ADMIN_EMAIL,
    nombre: 'Admin Fabrick',
    rol: 'superadmin',
    aprobado: true,
  };

  const { error: dbError } = await insforge.database
    .from('admin_users')
    .upsert([bootstrapRow], { onConflict: 'email' });

  if (dbError) {
    // Try a plain insert as fallback, then a best-effort update in case the
    // row already exists with aprobado=false from a previous run.
    const { error: insertError } = await insforge.database
      .from('admin_users')
      .insert([bootstrapRow]);

    if (
      insertError &&
      !insertError.message.toLowerCase().includes('duplicate') &&
      !insertError.message.toLowerCase().includes('unique')
    ) {
      console.error('[AdminInit] DB error:', insertError);
    }

    // Row likely exists — force-approve the bootstrap admin.
    const { error: approveError } = await insforge.database
      .from('admin_users')
      .update({ aprobado: true, rol: 'superadmin' })
      .eq('email', ADMIN_EMAIL);
    if (approveError) {
      console.error('[AdminInit] failed to force-approve bootstrap admin:', approveError);
    }
  }

  if (userAlreadyExists) {
    return NextResponse.json({
      ok: false,
      alreadyExists: true,
      message:
        'La cuenta ya existe en InsForge. Si no recuerdas la contraseña, usa la opción de recuperación.',
    });
  }

  void signUpData; // consumed above; included to keep linter happy
  return NextResponse.json({
    ok: true,
    message:
      'Cuenta de administrador creada correctamente. Ya puedes iniciar sesión con la contraseña configurada.',
  });
}

import { NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'feduardomsz@gmail.com';
const ADMIN_INITIAL_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || '8dediciembre';

export async function POST() {
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';

  const insforge = createClient({ baseUrl, anonKey });

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

  // Ensure the admin email is in the admin_users table
  const { error: dbError } = await insforge.database
    .from('admin_users')
    .upsert([{ email: ADMIN_EMAIL }], { onConflict: 'email' });

  if (dbError) {
    // Try a plain insert as fallback
    const { error: insertError } = await insforge.database
      .from('admin_users')
      .insert([{ email: ADMIN_EMAIL }]);

    if (
      insertError &&
      !insertError.message.toLowerCase().includes('duplicate') &&
      !insertError.message.toLowerCase().includes('unique')
    ) {
      console.error('[AdminInit] DB error:', insertError);
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

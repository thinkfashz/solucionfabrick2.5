'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
});

export async function loginAdmin(
  email: string,
  password: string,
): Promise<{ error: string } | void> {
  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos.' };
  }

  const { data, error } = await insforge.database
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .eq('password', password)
    .limit(1);

  if (error) {
    return { error: 'Error al verificar credenciales. Intenta nuevamente.' };
  }

  const user = Array.isArray(data) ? data[0] : null;

  if (!user) {
    return { error: 'Credenciales inválidas.' };
  }

  const cookieStore = await cookies();
  cookieStore.set('admin-token', crypto.randomUUID(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });

  redirect('/admin');
}

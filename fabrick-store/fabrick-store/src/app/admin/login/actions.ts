'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHmac } from 'crypto';
import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
});

/** Creates a signed token: "<payload>.<hmac-sha256-hex>" */
function createSignedToken(payload: string): string {
  const secret = process.env.ADMIN_TOKEN_SECRET;
  if (!secret) throw new Error('ADMIN_TOKEN_SECRET env var is not set');
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export async function loginAdmin(
  email: string,
  password: string,
): Promise<{ error: string } | void> {
  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos.' };
  }

  // NOTE: passwords in admin_users should be stored as hashed values (e.g. bcrypt/argon2).
  // This comparison works for hashed passwords where the client hashes before sending,
  // or for plain-text passwords in development environments.
  const { data, error } = await insforge.database
    .from('admin_users')
    .select('id, email')
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

  const payload = `${user.id}:${user.email}:${Date.now()}`;
  const token = createSignedToken(payload);

  const cookieStore = await cookies();
  cookieStore.set('admin-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });

  redirect('/admin');
}

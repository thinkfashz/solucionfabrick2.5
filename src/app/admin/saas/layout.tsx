import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export default async function AdminSaasLayout({ children }: { children: ReactNode }) {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  const session = token ? await decodeSession(token).catch(() => null) : null;

  if (!session) redirect('/admin/login');
  if (session.rol !== 'superadmin') redirect('/admin?forbidden=root');

  return children;
}

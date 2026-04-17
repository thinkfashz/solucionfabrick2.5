import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import AdminDashboard from './AdminDashboard';

export const metadata = {
  title: 'Panel Admin | Fabrick',
  robots: 'noindex, nofollow',
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME);

  if (!sessionCookie) {
    redirect('/admin/login');
  }

  const session = await decodeSession(sessionCookie.value);
  if (!session) {
    redirect('/admin/login');
  }

  return <AdminDashboard email={session.email} />;
}

'use client';

import dynamic from 'next/dynamic';

const AdminProfileColombiaGlamClient = dynamic(() => import('@/components/admin/profile/AdminProfileColombiaGlamClient'), {
  ssr: false,
  loading: () => <main className="grid min-h-screen place-items-center bg-black text-white">Cargando perfil glamour…</main>,
});

export default function AdminProfilePage() {
  return <AdminProfileColombiaGlamClient />;
}

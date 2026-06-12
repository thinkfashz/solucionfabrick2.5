'use client';

import dynamic from 'next/dynamic';

const AdminProfileUnifiedClient = dynamic(() => import('@/components/admin/profile/AdminProfileUnifiedClient'), {
  ssr: false,
  loading: () => <main className="grid min-h-screen place-items-center text-white">Cargando perfil Fabrick…</main>,
});

export default function AdminProfilePage() {
  return <AdminProfileUnifiedClient />;
}

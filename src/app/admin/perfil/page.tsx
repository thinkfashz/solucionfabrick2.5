'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const AdminProfileUnifiedClient = dynamic(() => import('@/components/admin/profile/AdminProfileUnifiedClient'), {
  ssr: false,
  loading: () => (
    <main className="grid min-h-[55vh] place-items-center text-[#817a6f]">
      <div className="text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#c77a00]" />
        <p className="mt-3 text-sm">Cargando perfil Fabrick…</p>
      </div>
    </main>
  ),
});

export default function AdminProfilePage() {
  return <AdminProfileUnifiedClient />;
}

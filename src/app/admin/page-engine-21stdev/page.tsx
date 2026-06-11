'use client';

import dynamic from 'next/dynamic';

const FabrickPageEngine21stClient = dynamic(() => import('@/components/admin/page-engine/FabrickPageEngine21stClient'), {
  ssr: false,
  loading: () => <main className="min-h-screen bg-[#050505] p-6 text-white">Cargando Fabrick Page Engine…</main>,
});

export default function PageEngine21stDevPage() {
  return <FabrickPageEngine21stClient />;
}

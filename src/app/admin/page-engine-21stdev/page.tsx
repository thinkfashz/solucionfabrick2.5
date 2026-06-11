'use client';

import dynamic from 'next/dynamic';

const PremiumPageEngineClient = dynamic(() => import('@/components/admin/page-engine/PremiumPageEngineClient'), {
  ssr: false,
  loading: () => <main className="min-h-screen bg-[#050403] p-6 text-white">Cargando editor modular premium…</main>,
});

export default function PageEngine21stDevPage() {
  return <PremiumPageEngineClient />;
}

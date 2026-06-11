'use client';

import dynamic from 'next/dynamic';

const AdvancedHtmlPageEngineClient = dynamic(() => import('@/components/admin/page-engine/AdvancedHtmlPageEngineClient'), {
  ssr: false,
  loading: () => <main className="min-h-screen bg-[#050403] p-6 text-white">Cargando editor avanzado HTML / JSON / JS / JTree…</main>,
});

export default function PageEngine21stDevPage() {
  return <AdvancedHtmlPageEngineClient />;
}

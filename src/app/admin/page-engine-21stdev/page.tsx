'use client';

import dynamic from 'next/dynamic';

const AdvancedHtmlPageEngineClientV2 = dynamic(() => import('@/components/admin/page-engine/AdvancedHtmlPageEngineClientV2'), {
  ssr: false,
  loading: () => <main className="min-h-screen bg-[#050403] p-6 text-white">Cargando editor avanzado HTML / JSON / JS / JTree / Cloudinary…</main>,
});

export default function PageEngine21stDevPage() {
  return <AdvancedHtmlPageEngineClientV2 />;
}

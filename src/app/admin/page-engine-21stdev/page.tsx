'use client';

import dynamic from 'next/dynamic';
import PageEngineMobileDrawerEnhancer from '@/components/admin/page-engine/PageEngineMobileDrawerEnhancer';
import PageEngineLiveExpiryBadge from '@/components/admin/page-engine/PageEngineLiveExpiryBadge';
import PageEngineShopifyChrome from '@/components/admin/page-engine/PageEngineShopifyChrome';
import PageEngineLinksHistory from '@/components/admin/page-engine/PageEngineLinksHistory';

const AdvancedHtmlPageEngineClientV2 = dynamic(() => import('@/components/admin/page-engine/AdvancedHtmlPageEngineClientV2'), {
  ssr: false,
  loading: () => <main className="min-h-screen bg-[#050403] p-6 text-white">Cargando editor avanzado HTML / JSON / JS / JTree / Cloudinary…</main>,
});

export default function PageEngine21stDevPage() {
  return <>
    <PageEngineShopifyChrome />
    <PageEngineMobileDrawerEnhancer />
    <AdvancedHtmlPageEngineClientV2 />
    <PageEngineLinksHistory />
    <PageEngineLiveExpiryBadge />
  </>;
}

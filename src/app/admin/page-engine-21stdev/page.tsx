'use client';

import dynamic from 'next/dynamic';

const PageEngineProspectingStudioClient = dynamic(() => import('@/components/admin/page-engine/PageEngineProspectingStudioHybridClient'), {
  ssr: false,
  loading: () => (
    <main className="grid min-h-[70vh] place-items-center bg-[#050403] p-6 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-yellow-300/15 bg-black/70 p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,.45)]">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-yellow-300">Page Engine 21stDev</p>
        <h1 className="mt-3 text-2xl font-black">Cargando motor híbrido de prospección…</h1>
      </section>
    </main>
  ),
});

export default function PageEngine21stDevPage() {
  return <PageEngineProspectingStudioClient />;
}

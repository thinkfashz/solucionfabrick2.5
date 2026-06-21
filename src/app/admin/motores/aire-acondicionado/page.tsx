'use client';

import dynamic from 'next/dynamic';
import BudgetLinksHistory from '@/components/admin/motores/BudgetLinksHistory';

const AireAcondicionado3DViewerClient = dynamic(() => import('@/components/admin/motores/AireAcondicionado3DViewerClient'), {
  ssr: false,
  loading: () => <main className="min-h-screen bg-[#050403] p-6 text-white">Cargando visor 3D de aire acondicionado…</main>,
});

export default function MotorAireAcondicionadoPage() {
  return <>
    <AireAcondicionado3DViewerClient />
    <BudgetLinksHistory />
  </>;
}

'use client';

import dynamic from 'next/dynamic';
import BudgetLinksHistory from '@/components/admin/motores/BudgetLinksHistory';

const FabrickBudgetEnginesPremiumClient = dynamic(() => import('@/components/admin/motores/FabrickBudgetEnginesPremiumClient'), {
  ssr: false,
  loading: () => <main className="min-h-screen bg-[#050403] p-6 text-white">Cargando motor premium de aire acondicionado…</main>,
});

export default function MotorAireAcondicionadoPage() {
  return <>
    <FabrickBudgetEnginesPremiumClient kind="aire" />
    <BudgetLinksHistory />
  </>;
}

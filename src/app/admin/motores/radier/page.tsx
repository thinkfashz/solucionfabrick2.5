'use client';

import dynamic from 'next/dynamic';
import BudgetLinksHistory from '@/components/admin/motores/BudgetLinksHistory';

const FabrickBudgetEnginesPremiumClient = dynamic(() => import('@/components/admin/motores/FabrickBudgetEnginesPremiumClient'), {
  ssr: false,
  loading: () => <main className="min-h-screen bg-[#050403] p-6 text-white">Cargando motor premium de radier…</main>,
});

export default function MotorRadierPage() {
  return <>
    <FabrickBudgetEnginesPremiumClient kind="radier" />
    <BudgetLinksHistory />
  </>;
}

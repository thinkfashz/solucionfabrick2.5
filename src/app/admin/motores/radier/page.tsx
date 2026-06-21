'use client';

import dynamic from 'next/dynamic';
import BudgetLinksHistory from '@/components/admin/motores/BudgetLinksHistory';

const RadierBudgetEngineLite = dynamic(() => import('@/components/admin/motores/RadierBudgetEngineLite'), {
  ssr: false,
  loading: () => <main className="min-h-screen bg-[#050403] p-6 text-white">Cargando motor mejorado de radier…</main>,
});

export default function MotorRadierPage() {
  return <>
    <RadierBudgetEngineLite />
    <BudgetLinksHistory />
  </>;
}

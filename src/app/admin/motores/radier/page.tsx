'use client';

import dynamic from 'next/dynamic';

const FabrickBudgetEnginesClient = dynamic(() => import('@/components/admin/motores/FabrickBudgetEnginesClient'), {
  ssr: false,
  loading: () => <main className="min-h-screen bg-[#090806] p-6 text-white">Cargando motor de radier…</main>,
});

export default function MotorRadierPage() {
  return <FabrickBudgetEnginesClient kind="radier" />;
}

import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import ServiceBudgetShopV2 from '@/components/presupuesto/ServiceBudgetShopV2';
import StoreFooter from '@/components/store/StoreFooter';
import { StoreBottomNav } from '@/components/store/StorefrontChrome';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Calculadora y presupuesto de construcción',
  description: 'Calcula trabajos por medidas y compara mano de obra con trabajo vendido. Reúne las partidas en una boleta referencial clara antes de pedir una cotización real.',
  keywords: ['presupuesto construcción Linares','cotización remodelación Maule','precio mano de obra construcción Chile','precio construcción por m2 Chile','calculadora construcción 2026'],
  alternates: { canonical: 'https://www.solucionesfabrick.com/presupuesto' },
  openGraph: {
    title: 'Calculadora y presupuesto | Soluciones Fabrick',
    description: 'Compara mano de obra y trabajo vendido por partida, calcula tus medidas y arma una referencia clara para tu proyecto.',
    url: 'https://www.solucionesfabrick.com/presupuesto',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Calculadora y presupuesto | Soluciones Fabrick', description: 'Precios separados de mano de obra y trabajo vendido para construir, remodelar e instalar.' },
};

type PresupuestoPageProps = { searchParams: Promise<{ servicio?: string | string[] }> };

export default async function PresupuestoPage({ searchParams }: PresupuestoPageProps) {
  const params = await searchParams;
  const initialServiceId = Array.isArray(params.servicio) ? params.servicio[0] : params.servicio;
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#08090A] pb-[calc(6rem+env(safe-area-inset-bottom))] text-[#FFF9EE] sm:pb-0">
      <Navbar />
      <ServiceBudgetShopV2 initialServiceId={initialServiceId} />
      <div className="bg-[#08090A]"><StoreFooter /></div>
      <StoreBottomNav />
    </main>
  );
}

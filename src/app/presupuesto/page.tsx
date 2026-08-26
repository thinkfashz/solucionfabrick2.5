import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import ServiceBudgetShopV2 from '@/components/presupuesto/ServiceBudgetShopV2';
import StoreFooter from '@/components/store/StoreFooter';
import { StoreBottomNav } from '@/components/store/StorefrontChrome';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Presupuesto por partidas',
  description: 'Calcula cada especialidad con medidas reales, arma un presupuesto preliminar con IVA incluido y comparte el resumen para confirmar alcance y precio final.',
  keywords: [
    'presupuesto construcción Linares',
    'cotización remodelación Maule',
    'carrito de servicios construcción',
    'calculadora metros cuadrados construcción',
    'precio construcción por m2 Chile',
  ],
  alternates: { canonical: 'https://www.solucionesfabrick.com/presupuesto' },
  openGraph: {
    title: 'Presupuesto por partidas | Soluciones Fabrick',
    description: 'Calcula especialidades con medidas reales, reúne las partidas del proyecto y revisa un rango preliminar con IVA incluido antes de confirmar el valor final.',
    url: 'https://www.solucionesfabrick.com/presupuesto',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Presupuesto por partidas | Soluciones Fabrick',
    description: 'Mide cada trabajo, arma tu proyecto por partidas y comparte un presupuesto preliminar para revisión.',
  },
};

type PresupuestoPageProps = {
  searchParams: Promise<{ servicio?: string | string[] }>;
};

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

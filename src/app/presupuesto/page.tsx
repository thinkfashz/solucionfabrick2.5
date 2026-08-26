import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import ServiceBudgetShopV2 from '@/components/presupuesto/ServiceBudgetShopV2';
import StoreFooter from '@/components/store/StoreFooter';
import { StoreBottomNav } from '@/components/store/StorefrontChrome';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Presupuesto por partidas | Soluciones Fabrick',
  description: 'Calcula cada especialidad con medidas reales, arma un presupuesto preliminar con IVA incluido y comparte el resumen para confirmar alcance y precio final.',
  keywords: [
    'presupuesto construcción Linares',
    'cotización remodelación Maule',
    'carrito de servicios construcción',
    'calculadora metros cuadrados construcción',
    'precio construcción por m2 Chile',
  ],
  alternates: { canonical: 'https://www.solucionesfabrick.com/presupuesto' },
};

export default function PresupuestoPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#08090A] pb-[calc(6rem+env(safe-area-inset-bottom))] text-[#FFF9EE] sm:pb-0">
      <Navbar />
      <ServiceBudgetShopV2 />
      <div className="bg-[#08090A]"><StoreFooter /></div>
      <StoreBottomNav />
    </main>
  );
}

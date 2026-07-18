import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import UniversalServiceCalculator from '@/components/presupuesto/UniversalServiceCalculator';
import { StoreBottomNav } from '@/components/store/StorefrontChrome';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Presupuesto guiado de construcción y hogar | Soluciones Fabrick',
  description:
    'Recorre un presupuesto guiado para construcción, remodelación, instalaciones y terminaciones. Obtén un rango orientativo y solicita tu cotización real en Maule.',
  keywords: [
    'presupuesto construcción Linares',
    'cotización remodelación Maule',
    'calculadora de servicios hogar',
    'instalación aire acondicionado Linares',
    'precio construcción por m2 Chile',
  ],
  alternates: { canonical: 'https://www.solucionesfabrick.com/presupuesto' },
};

export default function PresupuestoPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070706] pb-[calc(6rem+env(safe-area-inset-bottom))] text-white sm:pb-0">
      <Navbar />
      <UniversalServiceCalculator />
      <StoreBottomNav />
    </main>
  );
}

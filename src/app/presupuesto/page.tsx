import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import ServiceBudgetShop from '@/components/presupuesto/ServiceBudgetShop';
import { StoreBottomNav } from '@/components/store/StorefrontChrome';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Calculadoras y carrito de servicios | Soluciones Fabrick',
  description:
    'Calcula cada especialidad por largo, ancho, alto, volumen, metros lineales o unidades. Añade servicios al carrito y envía el rango total por WhatsApp.',
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
      <ServiceBudgetShop />
      <StoreBottomNav />
    </main>
  );
}

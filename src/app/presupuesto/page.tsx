import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import ServiceBudgetShop from '@/components/presupuesto/ServiceBudgetShop';
import { StoreBottomNav } from '@/components/store/StorefrontChrome';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Carrito de servicios y presupuesto aproximado | Soluciones Fabrick',
  description:
    'Calcula construcción, obra base, instalaciones, terminaciones y equipamiento por separado. Añade servicios al carrito y envía el rango total por WhatsApp.',
  keywords: [
    'presupuesto construcción Linares',
    'cotización remodelación Maule',
    'carrito de servicios construcción',
    'calculadora de servicios hogar',
    'precio construcción por m2 Chile',
  ],
  alternates: { canonical: 'https://www.solucionesfabrick.com/presupuesto' },
};

export default function PresupuestoPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070706] pb-[calc(6rem+env(safe-area-inset-bottom))] text-white sm:pb-0">
      <Navbar />
      {/* Configurador central: calcula cada especialidad y conserva el carrito entre páginas. */}
      <ServiceBudgetShop />
      <StoreBottomNav />
    </main>
  );
}

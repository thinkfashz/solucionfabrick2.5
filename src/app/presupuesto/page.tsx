import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import BudgetDirectWhatsApp from '@/components/presupuesto/BudgetDirectWhatsApp';
import BudgetPageGuide from '@/components/presupuesto/BudgetPageGuide';
import ServiceBudgetShopV2 from '@/components/presupuesto/ServiceBudgetShopV2';
import StoreFooter from '@/components/store/StoreFooter';
import { StoreBottomNav } from '@/components/store/StorefrontChrome';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Calculadora y presupuesto de construcción',
  description: 'Elige un servicio, ingresa medidas, compara mano de obra con trabajo vendido y recibe una referencia clara por correo o WhatsApp.',
  keywords: ['presupuesto construcción Linares','cotización remodelación Maule','precio mano de obra construcción Chile','precio construcción por m2 Chile','calculadora construcción 2026'],
  alternates: { canonical: 'https://www.solucionesfabrick.com/presupuesto' },
  openGraph: {
    title: 'Presupuesto guiado | Soluciones Fabrick',
    description: 'Selecciona servicios, revisa precios de referencia, calcula tus medidas y continúa por correo o WhatsApp.',
    url: 'https://www.solucionesfabrick.com/presupuesto',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Presupuesto guiado | Soluciones Fabrick', description: 'Servicios, medidas, rangos y envío del detalle en un solo proceso.' },
};

type PresupuestoPageProps = { searchParams: Promise<{ servicio?: string | string[] }> };

export default async function PresupuestoPage({ searchParams }: PresupuestoPageProps) {
  const params = await searchParams;
  const initialServiceId = Array.isArray(params.servicio) ? params.servicio[0] : params.servicio;
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#08090A] pb-[calc(6rem+env(safe-area-inset-bottom))] text-[#FFF9EE] sm:pb-0">
      <Navbar />
      <BudgetPageGuide selectedServiceId={initialServiceId} />
      <div id="budget-core" className="sf-budget-core scroll-mt-20">
        <style>{`
          .sf-budget-core > div > section:first-of-type{display:none!important}
          .sf-budget-core > div{background:#f7f6f2}
          .sf-budget-core > div > section:nth-of-type(2){border-top:0!important}
          @media(max-width:767px){.sf-budget-core{scroll-margin-top:64px}}
        `}</style>
        <ServiceBudgetShopV2 initialServiceId={initialServiceId} />
      </div>
      <BudgetDirectWhatsApp />
      <div className="bg-[#08090A]"><StoreFooter /></div>
      <StoreBottomNav />
    </main>
  );
}

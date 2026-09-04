import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import SolucionesGuidePage from '@/components/soluciones/SolucionesGuidePage';
import StoreFooter from '@/components/store/StoreFooter';
import { StoreBottomNav } from '@/components/store/StorefrontChrome';

export const metadata: Metadata = {
  title: 'Guía de soluciones para construcción y remodelación',
  description: 'Explora soluciones de construcción, instalaciones, terminaciones, climatización, exterior y carpintería. Entiende qué se revisa, cómo se mide y lleva cada trabajo al presupuesto.',
  keywords: [
    'soluciones construcción Chile',
    'guía remodelación hogar',
    'servicios construcción Maule',
    'cómo cotizar construcción',
    'Soluciones Fabrick',
  ],
  alternates: { canonical: 'https://www.solucionesfabrick.com/soluciones' },
  openGraph: {
    title: 'Guía de soluciones | Soluciones Fabrick',
    description: 'Una mini guía visual para comprender cada trabajo antes de llevarlo a la calculadora y al presupuesto.',
    url: 'https://www.solucionesfabrick.com/soluciones',
    type: 'website',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Guía de soluciones Soluciones Fabrick' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Guía de soluciones | Soluciones Fabrick',
    description: 'Comprende el trabajo, su unidad de medición y el siguiente paso antes de cotizar.',
  },
};

export default function SolucionesPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#10110F] pb-[calc(6rem+env(safe-area-inset-bottom))] text-[#F7F4EE] sm:pb-0">
      <Navbar />
      <SolucionesGuidePage />
      <div className="bg-[#08090A]"><StoreFooter /></div>
      <StoreBottomNav />
    </main>
  );
}

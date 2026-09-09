import type { Metadata } from 'next';
import AirCalculatorFunnelV8 from '@/components/store/AirCalculatorFunnelV8';
import { preloadAirCatalogProducts } from '@/lib/airCatalogServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Calculadora BTU y aire acondicionado | Soluciones Fabrick',
  description: 'Calcula la capacidad BTU según medidas, altura, personas, ventanas, exposición solar y aislación, y compara equipos reales con stock disponible.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/herramientas/aire-acondicionado' },
  openGraph: {
    title: 'Calculadora BTU y recomendador de aire acondicionado | Soluciones Fabrick',
    description: 'Obtén una recomendación personalizada y elige equipos compatibles del catálogo real de Soluciones Fabrick.',
    url: 'https://www.solucionesfabrick.com/herramientas/aire-acondicionado',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Calculadora BTU Soluciones Fabrick' }],
  },
};

export default async function Page() {
  const initialProducts = await preloadAirCatalogProducts();
  return <AirCalculatorFunnelV8 initialProducts={initialProducts} />;
}

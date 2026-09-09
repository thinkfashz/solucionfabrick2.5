import type { Metadata } from 'next';
import AirSimulatorFunnelV9 from '@/components/store/AirSimulatorFunnelV9';
import { preloadAirCatalogProducts } from '@/lib/airCatalogServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: { absolute: 'Calculadora BTU y simulador de aire acondicionado | Soluciones Fabrick' },
  description: 'Calcula la capacidad BTU por tipo de ambiente, simula temperatura, consumo y costo eléctrico, y compara equipos reales con stock disponible.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/herramientas/aire-acondicionado' },
  openGraph: {
    title: 'Calculadora BTU, consumo y recomendador de aire acondicionado | Soluciones Fabrick',
    description: 'Simula tu habitación, living, oficina o cocina, calcula BTU y consumo estimado, y elige equipos compatibles del catálogo real.',
    url: 'https://www.solucionesfabrick.com/herramientas/aire-acondicionado',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Calculadora BTU Soluciones Fabrick' }],
  },
};

export default async function Page() {
  const initialProducts = await preloadAirCatalogProducts();
  return <AirSimulatorFunnelV9 initialProducts={initialProducts} />;
}

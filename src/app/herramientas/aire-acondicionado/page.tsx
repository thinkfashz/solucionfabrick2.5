import type { Metadata } from 'next';
import AirCatalogExperienceV6 from '@/components/store/AirCatalogExperienceV6';

export const metadata: Metadata = {
  title: 'Catálogo 3D de aire acondicionado | Soluciones Fabrick',
  description: 'Calcula BTU, compara aires acondicionados, cobertura, personas, consumo, ruido y eficiencia en un catálogo 3D visual rápido para móvil y PC.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/herramientas/aire-acondicionado' },
  openGraph: {
    title: 'Catálogo 3D de aire acondicionado | Soluciones Fabrick',
    description: 'Compara capacidad, cobertura y gasto energético con una simulación visual optimizada para móvil y PC.',
    url: 'https://www.solucionesfabrick.com/herramientas/aire-acondicionado',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Catálogo 3D de aire acondicionado Soluciones Fabrick' }],
  },
};

export default function Page() {
  return <AirCatalogExperienceV6 />;
}

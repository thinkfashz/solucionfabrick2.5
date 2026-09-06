import type { Metadata } from 'next';
import AirCatalogExperienceV7 from '@/components/store/AirCatalogExperienceV7';

// V7: visor universal rápido conectado únicamente a productos reales del catálogo.
export const metadata: Metadata = {
  title: 'Catálogo 3D de aire acondicionado | Soluciones Fabrick',
  description: 'Calcula BTU, compara aires acondicionados, cobertura, personas, consumo, ruido y eficiencia en un catálogo 3D visual rápido para móvil y PC.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/herramientas/aire-acondicionado' },
  openGraph: {
    title: 'Catálogo 3D de aire acondicionado | Soluciones Fabrick',
    description: 'Compara capacidad, cobertura y gasto energético y compra el equipo disponible desde el checkout seguro de Soluciones Fabrick.',
    url: 'https://www.solucionesfabrick.com/herramientas/aire-acondicionado',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Catálogo 3D de aire acondicionado Soluciones Fabrick' }],
  },
};

export default function Page() {
  return <AirCatalogExperienceV7 />;
}

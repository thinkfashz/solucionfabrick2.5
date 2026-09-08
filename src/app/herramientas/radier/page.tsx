import type { Metadata } from 'next';
import PublicBudgetCalculatorV2 from '@/components/store/PublicBudgetCalculatorV2';

export const metadata: Metadata = {
  title: 'Calculadora de radier | m², metros lineales y materiales',
  description: 'Calcula superficie, metros lineales de perímetro, espesores, hormigón, capas, mallas y una referencia de presupuesto para distintos tipos de radier.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/herramientas/radier' },
  openGraph: {
    title: 'Calculadora de radier | Soluciones Fabrick',
    description: 'Mide largo, ancho, forma y espesor. Revisa m², perímetro, volumen, materiales y visor 3D.',
    url: 'https://www.solucionesfabrick.com/herramientas/radier',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Calculadora de radier Soluciones Fabrick' }],
  },
};

export default function Page() {
  return <PublicBudgetCalculatorV2 kind="radier" />;
}

import type { Metadata } from 'next';
import RadierCalculatorPremium from '@/components/store/RadierCalculatorPremium';

export const metadata: Metadata = {
  title: 'Calculadora de radier | m², materiales y referencia de costo',
  description: 'Calcula superficie, perímetro, espesores, hormigón, capas, mallas, moldaje, estacas de 43 cm y referencias de costo para distintos alcances de radier.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/herramientas/radier' },
  openGraph: {
    title: 'Calculadora de radier | Soluciones Fabrick',
    description: 'Mide largo, ancho, forma y espesor. Revisa capas, cubicación, materiales, estacas de 43 cm y tres referencias de alcance antes de cotizar.',
    url: 'https://www.solucionesfabrick.com/herramientas/radier',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Calculadora de radier Soluciones Fabrick' }],
  },
};

export default function Page() {
  return <RadierCalculatorPremium />;
}

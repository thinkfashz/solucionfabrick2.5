import type { Metadata } from 'next';
import PublicBudgetCalculatorV2 from '@/components/store/PublicBudgetCalculatorV2';

export const metadata: Metadata = {
  title: 'Calculadora BTU de aire acondicionado | Soluciones Fabrick',
  description: 'Calcula BTU, compara capacidades, estima consumo mensual y revisa un visor 3D antes de cotizar la instalación de aire acondicionado.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/herramientas/aire-acondicionado' },
  openGraph: {
    title: 'Calculadora BTU de aire acondicionado | Soluciones Fabrick',
    description: 'Mide tu espacio, compara 9.000 a 24.000 BTU, estima consumo y revisa el espacio en 3D.',
    url: 'https://www.solucionesfabrick.com/herramientas/aire-acondicionado',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Calculadora BTU de aire acondicionado Soluciones Fabrick' }],
  },
};

export default function Page() {
  return <PublicBudgetCalculatorV2 kind="aire" />;
}

import type { Metadata } from 'next';
import PublicBudgetCalculatorClient from '@/components/store/PublicBudgetCalculatorClient';

export const metadata: Metadata = {
  title: 'Calculadora de Radier | Estima materiales y presupuesto',
  description: 'Estima el volumen y los materiales base para tu radier. Úsalo como orientación inicial y solicita una evaluación técnica para tu proyecto en Maule, Linares o Talca.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/herramientas/radier' },
  openGraph: {
    title: 'Calculadora de radier | Soluciones Fabrick',
    description: 'Planifica tu radier con una estimación inicial de materiales y una ruta clara para cotizar.',
    url: 'https://www.solucionesfabrick.com/herramientas/radier',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Calculadora de radier Soluciones Fabrick' }],
  },
};

export default function Page() {
  return <PublicBudgetCalculatorClient kind="radier" />;
}

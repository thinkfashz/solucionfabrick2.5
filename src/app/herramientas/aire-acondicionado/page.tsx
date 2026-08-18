import type { Metadata } from 'next';
import PublicBudgetCalculatorClient from '@/components/store/PublicBudgetCalculatorClient';

export const metadata: Metadata = {
  title: 'Calculadora de aire acondicionado | Orientación de capacidad',
  description: 'Obtén una orientación inicial de capacidad para aire acondicionado y solicita una evaluación técnica de instalación y climatización en Maule, Linares y Talca.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/herramientas/aire-acondicionado' },
  openGraph: {
    title: 'Calculadora de aire acondicionado | Soluciones Fabrick',
    description: 'Una orientación inicial para planificar la climatización de tu hogar o espacio.',
    url: 'https://www.solucionesfabrick.com/herramientas/aire-acondicionado',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Calculadora de aire acondicionado Soluciones Fabrick' }],
  },
};

export default function Page() {
  return <PublicBudgetCalculatorClient kind="aire" />;
}

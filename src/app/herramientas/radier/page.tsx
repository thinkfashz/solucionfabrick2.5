import type { Metadata } from 'next';
import RadierEstimatorClient from '@/components/herramientas/RadierEstimatorClient';

export const metadata: Metadata = {
  title: 'Calculadora de radier: materiales, capas y costo referencial | Soluciones Fabrick',
  description: 'Calcula m², volumen de concreto, sacos de cemento, base estabilizada, gravilla, malla y costo referencial para tu radier en Chile.',
  keywords: [
    'calculadora radier Chile',
    'cuántos sacos de cemento para radier',
    'precio radier por metro cuadrado',
    'cálculo hormigón H20',
    'malla acma C92 radier',
    'base estabilizada radier',
  ],
  alternates: { canonical: 'https://www.solucionesfabrick.com/herramientas/radier' },
};

export default function Page() {
  return <RadierEstimatorClient />;
}

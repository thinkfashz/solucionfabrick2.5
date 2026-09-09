import type { Metadata } from 'next';
import { MetalconCalculator } from '@/components/store/MetalconCalculator';

export const metadata: Metadata = {
  title: 'Calculadora y simulador Metalcon | Soluciones Fabrick',
  description: 'Simula un panel Metalcon, revisa modulación de montantes, planchas OSB y refuerzos de puertas y ventanas.',
};

export default function MetalconPage(){return <MetalconCalculator/>;}

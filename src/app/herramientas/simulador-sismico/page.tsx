import type { Metadata } from 'next';
import SeismicSimulator from '@/components/simulador-sismico/SeismicSimulator';

export const metadata: Metadata = {
  title: 'Simulador sísmico 3D | Soluciones Fabrick',
  description: 'Simulación educativa 3D de movimiento telúrico y daño potencial relativo en una vivienda.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/herramientas/simulador-sismico' },
};

export default function Page() {
  return <SeismicSimulator />;
}

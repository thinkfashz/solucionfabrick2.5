import type { Metadata } from 'next';
import { ServiciosPageContent } from '@/components/servicios/ServiciosPageContent';

export const metadata: Metadata = {
  title: 'Servicios de Construcción, Reparación y Terminaciones',
  description:
    'Explora albañilería, carpintería, gasfitería, electricidad, fundaciones, estructuras Metalcon, techumbre y terminaciones. Conoce qué resuelve cada especialidad y solicita una evaluación para tu proyecto en Chile.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/servicios' },
  openGraph: {
    title: 'Servicios Soluciones Fabrick | Del terreno a la terminación',
    description:
      'Una experiencia interactiva para comprender cada especialidad, sus funciones y el alcance que debe revisarse antes de cotizar.',
    url: 'https://www.solucionesfabrick.com/servicios',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Servicios de construcción Soluciones Fabrick' }],
  },
};

export default function ServiciosPage() {
  return <ServiciosPageContent />;
}

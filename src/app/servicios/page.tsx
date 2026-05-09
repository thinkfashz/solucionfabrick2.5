import type { Metadata } from 'next';
import { ServiciosPageContent } from '@/components/servicios/ServiciosPageContent';

export const metadata: Metadata = {
  title: 'Servicios y Soluciones de Construcción',
  description:
    'Servicios profesionales y soluciones técnicas por m²: cimientos, Metalcon, gasfitería, electricidad, revestimientos y más. Calcula tu obra y cotiza al instante en la Región del Maule, Chile.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/servicios' },
};

export default function ServiciosPage() {
  return <ServiciosPageContent />;
}

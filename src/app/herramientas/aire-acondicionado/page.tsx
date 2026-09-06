import type { Metadata } from 'next';
import AirImmersiveExperience from '@/components/store/AirImmersiveExperience';

export const metadata: Metadata = {
  title: 'Experiencia inmersiva de aire acondicionado | Soluciones Fabrick',
  description: 'Recorre una habitación en primera persona, calcula BTU y compara capacidades dentro de una interfaz inmersiva.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/herramientas/aire-acondicionado' },
  openGraph: {
    title: 'Experiencia inmersiva de aire acondicionado | Soluciones Fabrick',
    description: 'Calcula BTU y selecciona tu aire acondicionado dentro de una habitación 3D interactiva.',
    url: 'https://www.solucionesfabrick.com/herramientas/aire-acondicionado',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Experiencia 3D de aire acondicionado Soluciones Fabrick' }],
  },
};

export default function Page() {
  return <AirImmersiveExperience />;
}

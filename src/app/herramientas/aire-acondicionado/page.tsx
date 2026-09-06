import type { Metadata } from 'next';
import AirGameExperienceV3 from '@/components/store/AirGameExperienceV3';

export const metadata: Metadata = {
  title: 'Experiencia inmersiva de aire acondicionado | Soluciones Fabrick',
  description: 'Recorre una habitación 3D en tercera persona, cambia sus medidas, calcula BTU y compara equipos con controles de clima en tiempo real.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/herramientas/aire-acondicionado' },
  openGraph: {
    title: 'Experiencia 3D tipo juego de aire acondicionado | Soluciones Fabrick',
    description: 'Explora tu espacio como un recorrido real, compara capacidades y controla el clima dentro de una habitación 3D interactiva.',
    url: 'https://www.solucionesfabrick.com/herramientas/aire-acondicionado',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Experiencia 3D de aire acondicionado Soluciones Fabrick' }],
  },
};

export default function Page() {
  return <AirGameExperienceV3 />;
}

import type { Metadata } from 'next';
import AirImmersiveExperienceV2 from '@/components/store/AirImmersiveExperienceV2';

export const metadata: Metadata = {
  title: 'Experiencia inmersiva de aire acondicionado | Soluciones Fabrick',
  description: 'Recorre una habitación que cambia con tus medidas, calcula BTU, compara eficiencia y simula el clima en una experiencia 3D interactiva.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/herramientas/aire-acondicionado' },
  openGraph: {
    title: 'Experiencia inmersiva de aire acondicionado | Soluciones Fabrick',
    description: 'Mide tu habitación, compara capacidades y controla temperatura, ventilación y ahorro dentro de un mundo 3D interactivo.',
    url: 'https://www.solucionesfabrick.com/herramientas/aire-acondicionado',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Experiencia 3D de aire acondicionado Soluciones Fabrick' }],
  },
};

export default function Page() {
  return <AirImmersiveExperienceV2 />;
}

import type { Metadata } from 'next';
import RadierConstructionLab from '@/components/store/RadierConstructionLab';
import { SITE_URL } from '@/lib/seo';

const CANONICAL = `${SITE_URL}/herramientas/radier/lab`;

export const metadata: Metadata = {
  title: 'Laboratorio de radier 4D | Soluciones Fabrick',
  description: 'Visualiza excavación, plataforma elevada aproximadamente 30 cm, base, gravilla, barrera, malla, hormigón, moldaje, vegetación y cubicación en pantalla completa.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Laboratorio de radier 4D | Soluciones Fabrick',
    description: 'Excavación, capas, entorno y proceso constructivo en un visor 3D/4D inmersivo.',
    url: CANONICAL,
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Laboratorio de radier Soluciones Fabrick' }],
  },
};

export default function RadierLabPage() {
  return <RadierConstructionLab />;
}

import type { Metadata } from 'next';
import MetalconConstructionLab from '@/components/store/MetalconConstructionLab';
import { SITE_URL } from '@/lib/seo';

const CANONICAL = `${SITE_URL}/herramientas/metalcon/lab`;

export const metadata: Metadata = {
  title: 'Laboratorio constructivo Metalcon 4D | Soluciones Fabrick',
  description: 'Recorre una vivienda Metalcon en pantalla completa, reproduce el montaje por etapas y explora OSB, aislación, vulcanita, cielo, cerámica, baño, cocina y sistema sanitario de referencia.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Laboratorio constructivo Metalcon 4D | Soluciones Fabrick',
    description: 'Estructura, capas, terminaciones e instalaciones en un visor 3D/4D inmersivo y educativo.',
    url: CANONICAL,
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Laboratorio constructivo Metalcon Soluciones Fabrick' }],
  },
};

export default function MetalconLabPage() {
  return <MetalconConstructionLab />;
}

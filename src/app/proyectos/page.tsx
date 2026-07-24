import type { Metadata } from 'next';
import CloudinaryProjectsGallery from '@/components/proyectos/CloudinaryProjectsGallery';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Inspiraciones para casas, cocinas y remodelaciones',
  description: 'Explora álbumes de cocinas, casas, planos, baños, muebles, piscinas, terrazas y quinchos. Guarda una referencia y solicita una propuesta adaptada a tu espacio.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/proyectos' },
  openGraph: {
    title: 'Inspiraciones Soluciones Fabrick | Ideas para tu próximo espacio',
    description: 'Catálogo visual por álbumes para comparar estilos, materiales, distribución y terminaciones antes de cotizar.',
    type: 'website',
    url: 'https://www.solucionesfabrick.com/proyectos',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Inspiraciones Soluciones Fabrick' }],
  },
};

export default function InspiracionesPage() {
  return <CloudinaryProjectsGallery />;
}

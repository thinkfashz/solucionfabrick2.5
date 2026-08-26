import type { Metadata } from 'next';
import CloudinaryProjectsGallery from '@/components/proyectos/CloudinaryProjectsGallery';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ideas de construcción y remodelación por álbum',
  description: 'Explora álbumes de cocinas, casas, planos, baños, muebles, piscinas, terrazas y quinchos con descripciones, palabras clave y galerías visuales.',
  keywords: [
    'ideas de construcción',
    'ideas de remodelación',
    'diseño de cocinas',
    'ideas para casas',
    'quinchos y terrazas',
    'inspiración para el hogar Chile',
    'Soluciones Fabrick',
  ],
  alternates: { canonical: 'https://www.solucionesfabrick.com/proyectos' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  openGraph: {
    title: 'Inspiraciones Soluciones Fabrick | Álbumes de ideas para el hogar',
    description: 'Catálogo visual organizado por álbumes para comparar estilos, distribución, materiales visibles y terminaciones antes de cotizar.',
    type: 'website',
    url: 'https://www.solucionesfabrick.com/proyectos',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Álbumes de inspiración Soluciones Fabrick' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ideas de construcción y remodelación | Soluciones Fabrick',
    description: 'Explora álbumes visuales organizados por espacio, estilo y palabras clave.',
    images: ['/brand/soluciones-fabrick-social.png'],
  },
};

export default function InspiracionesPage() {
  return <CloudinaryProjectsGallery />;
}

import type { Metadata } from 'next';
import CloudinaryProjectsGallery from '@/components/proyectos/CloudinaryProjectsGallery';
import InspirationSeoIndex from '@/components/proyectos/InspirationSeoIndex';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ideas para casas, cocinas, baños y remodelaciones en Chile',
  description: 'Explora álbumes visuales de casas, cocinas, planos, baños, muebles, piscinas, terrazas, quinchos y remodelaciones. Compara estilos, materiales visibles y terminaciones antes de cotizar tu proyecto.',
  keywords: [
    'ideas para casas en Chile',
    'ideas de cocinas modernas',
    'diseños de baños',
    'ideas para quinchos',
    'terrazas y patios',
    'piscinas para casas',
    'muebles a medida',
    'planos de casas',
    'ideas de remodelación',
    'inspiración construcción Chile',
    'Soluciones Fabrick',
  ],
  alternates: { canonical: 'https://www.solucionesfabrick.com/proyectos' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  openGraph: {
    title: 'Inspiraciones para construir y remodelar | Soluciones Fabrick',
    description: 'Álbumes organizados por tema, estilo e intención para descubrir ideas de casas, cocinas, baños, terrazas, quinchos, piscinas y muebles.',
    type: 'website',
    url: 'https://www.solucionesfabrick.com/proyectos',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Ideas para construcción, diseño y remodelación en Chile' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ideas para construir y remodelar en Chile',
    description: 'Explora colecciones visuales organizadas por espacio, estilo, palabras clave e intención de proyecto.',
    images: ['/brand/soluciones-fabrick-social.png'],
  },
};

export default function InspiracionesPage() {
  return (
    <>
      <CloudinaryProjectsGallery />
      <InspirationSeoIndex />
    </>
  );
}

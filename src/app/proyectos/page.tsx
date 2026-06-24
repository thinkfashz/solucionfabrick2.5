import type { Metadata } from 'next';
import CloudinaryProjectsGallery from '@/components/proyectos/CloudinaryProjectsGallery';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Proyectos e ideas de remodelación | Soluciones Fabrick',
  description: 'Catálogo visual de ideas para remodelación, materiales, puertas, muebles, terminaciones, baños, cocinas y proyectos de Soluciones Fabrick.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/proyectos' },
  openGraph: {
    title: 'Proyectos e ideas de remodelación | Soluciones Fabrick',
    description: 'Explora referencias visuales y cotiza algo parecido para tu espacio.',
    type: 'website',
    url: 'https://www.solucionesfabrick.com/proyectos',
  },
};

export default function ProyectosPage() {
  return <CloudinaryProjectsGallery />;
}

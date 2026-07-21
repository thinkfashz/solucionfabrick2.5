import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import CloudinaryProjectsGallery from '@/components/proyectos/CloudinaryProjectsGallery';
import { StoreBottomNav } from '@/components/store/StorefrontChrome';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Proyectos e ideas de remodelación | Soluciones Fabrick',
  description: 'Explora referencias visuales de construcción, remodelación y hogar. Filtra ideas, guarda inspiración y cotiza un proyecto parecido con Soluciones Fabrick.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/proyectos' },
  openGraph: {
    title: 'Proyectos e ideas de remodelación | Soluciones Fabrick',
    description: 'Explora referencias visuales y cotiza algo parecido para tu espacio.',
    type: 'website',
    url: 'https://www.solucionesfabrick.com/proyectos',
  },
};

export default function ProyectosPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070604] text-white">
      <Navbar />
      <CloudinaryProjectsGallery />
      <StoreBottomNav />
    </main>
  );
}

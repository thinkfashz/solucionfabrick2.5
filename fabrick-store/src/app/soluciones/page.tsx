import type { Metadata } from 'next';
import Hero from '@/components/Hero';
import LandingSections from '@/components/LandingSections';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Soluciones Fabrick — Experiencia Inmersiva',
  description: 'Soluciones completas para el hogar, desde el inicio hasta el final. Materiales, mano de obra y diseño centralizado.',
};

export default function SolucionesPage() {
  return (
    <div className="bg-gradient-to-b from-black via-zinc-950 to-black min-h-screen overflow-x-hidden">
      <Navbar />
      <Hero />
      <LandingSections />
    </div>
  );
}

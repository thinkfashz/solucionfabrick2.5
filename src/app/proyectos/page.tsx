import type { Metadata } from 'next';
import ProyectosClient from './ProyectosClient';

export const metadata: Metadata = {
  title: 'Proyectos Ejecutados',
  description:
    'Obras terminadas por Soluciones Fabrick en la Región del Maule, Chile: ampliaciones, remodelaciones, estructura Metalcon, instalaciones y obras llave en mano.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/proyectos' },
};

export default function ProyectosPage() {
  return <ProyectosClient />;
}


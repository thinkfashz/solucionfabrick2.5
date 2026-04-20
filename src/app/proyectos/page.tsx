import type { Metadata } from 'next';
import ProyectosClient from './ProyectosClient';

export const metadata: Metadata = {
  title: 'Proyectos | Fabrick',
  description:
    'Obras terminadas por Soluciones Fabrick: vivienda, remodelación, ampliación y estructuras Metalcon con detalles técnicos, materiales y superficie intervenida.',
};

export default function ProyectosPage() {
  return <ProyectosClient />;
}


import type { Metadata } from 'next';
import SolucionesContent from '@/components/SolucionesContent';

export const metadata: Metadata = {
  title: 'Servicios de Construcción y Remodelación',
  description:
    'Paquetes llave en mano: piso industrializado, paneles Metalcon 60/90, estructura, revestimientos, gasfitería y electricidad. Ejecutado por el equipo Fabrick en la Región del Maule, Chile.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/soluciones' },
};

export default function SolucionesPage() {
  return <SolucionesContent />;
}


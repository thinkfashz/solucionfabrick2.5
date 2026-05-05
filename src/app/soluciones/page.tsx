import type { Metadata } from 'next';
import { SolucionesPageContent } from '@/components/soluciones/SolucionesPageContent';

export const metadata: Metadata = {
  title: 'Soluciones Técnicas y Servicios',
  description:
    'Paquetes llave en mano y servicios profesionales: piso industrializado, paneles Metalcon 60/90, estructura, revestimientos, gasfitería y electricidad. Ejecutado por el equipo Fabrick en la Región del Maule, Chile.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/soluciones' },
};

export default function SolucionesPage() {
  return <SolucionesPageContent />;
}

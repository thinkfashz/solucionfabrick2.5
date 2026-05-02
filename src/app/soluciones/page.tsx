import type { Metadata } from 'next';
import SolucionesContent from '@/components/SolucionesContent';

export const metadata: Metadata = {
  title: 'Soluciones Técnicas y Servicios',
  description:
    'Paquetes llave en mano y servicios profesionales: piso industrializado, paneles Metalcon 60/90, estructura, revestimientos, gasfitería y electricidad. Ejecutado por el equipo Fabrick en la Región del Maule, Chile.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/soluciones' },
};

export default function SolucionesPage() {
  return (
    <SolucionesContent
      initialTab="soluciones"
      hero={{
        eyebrow: 'Soluciones y servicios',
        title: 'Cinco bloques para armar tu obra completa',
        description:
          'Cada bloque se puede comprar por separado o combinar en un paquete llave en mano. Calcula los m² que necesitas, agrega servicios profesionales y arma la cotización integral.',
      }}
    />
  );
}

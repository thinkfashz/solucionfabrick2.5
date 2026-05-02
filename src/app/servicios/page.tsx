import type { Metadata } from 'next';
import SolucionesContent from '@/components/SolucionesContent';

export const metadata: Metadata = {
  title: 'Servicios y Soluciones de Construcción',
  description:
    'Servicios profesionales y soluciones técnicas por m²: cimientos, Metalcon, gasfitería, electricidad, revestimientos y más. Calcula tu obra y cotiza al instante en la Región del Maule, Chile.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/servicios' },
};

export default function ServiciosPage() {
  return (
    <SolucionesContent
      initialTab="servicios"
      hero={{
        eyebrow: 'Servicios y soluciones',
        title: 'Un equipo para todo el proyecto',
        description:
          'Servicios profesionales ejecutados por nuestro equipo y bloques técnicos cotizados por m². Calcula tu obra, agrega lo que necesitas a la cotización y recibe respuesta en menos de 24 horas — sin precios sorpresa.',
      }}
    />
  );
}

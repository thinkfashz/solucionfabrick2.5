import type { Metadata } from 'next';
import ResumenClient from './ResumenClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Resumen de Cotización',
  description:
    'Resumen consolidado de tu cotización: servicios, paneles del diseño 3D y materiales. Lista para imprimir o guardar como PDF.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/cotizaciones/resumen' },
};

export default function ResumenPage() {
  return <ResumenClient />;
}

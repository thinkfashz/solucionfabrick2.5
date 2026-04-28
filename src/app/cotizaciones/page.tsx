import type { Metadata } from 'next';
import CotizacionesClient from './CotizacionesClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mi Cotización',
  description:
    'Tu carrito de servicios y materiales para armar tu casa con Soluciones Fabrick. Edita cantidades, agrega notas y solicita tu cotización personalizada.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/cotizaciones' },
};

export default function CotizacionesPage() {
  return <CotizacionesClient />;
}

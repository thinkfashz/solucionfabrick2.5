import type { Metadata } from 'next';
import CatalogoClient from './CatalogoClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Catálogo completo · Soluciones Fabrick',
  description:
    'Explora el catálogo completo de Soluciones Fabrick: pisos, puertas, ventanas, cerraduras, iluminación y más. Búsqueda en tiempo real sobre nuestra base de datos de productos.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/tienda/catalogo' },
};

export default function CatalogoPage() {
  return <CatalogoClient />;
}

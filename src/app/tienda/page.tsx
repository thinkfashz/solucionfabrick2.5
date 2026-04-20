import type { Metadata } from 'next';
import TiendaClientPage from '@/tienda/page';

export const metadata: Metadata = {
  title: 'Catálogo de Materiales',
  description:
    'Catálogo Fabrick: materiales premium que instalamos directamente en tu obra. Cada producto es seleccionado, adquirido e instalado por nuestro equipo certificado en la Región del Maule, Chile.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/tienda' },
};

export default function TiendaPage() {
  return <TiendaClientPage />;
}

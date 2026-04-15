import type { Metadata } from 'next';
import TiendaClientPage from '@/tienda/TiendaClientPage';

export const metadata: Metadata = {
  title: 'Tienda | Fabrick',
  description: 'Boutique de componentes premium para proyectos residenciales de alto estándar.',
};

export default function TiendaPage() {
  return <TiendaClientPage />;
}

import type { Metadata } from 'next';
import TiendaClientPage from '@/tienda/page';

export const metadata: Metadata = {
  title: 'Tienda | Fabrick',
  description: 'Boutique de componentes premium para proyectos residenciales de alto estándar.',
};

export default function TiendaPage() {
  return <TiendaClientPage />;
}

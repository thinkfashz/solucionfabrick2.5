import type { Metadata } from 'next';
import FavoritosClient from './FavoritosClient';

export const metadata: Metadata = {
  title: 'Mis Favoritos | Fabrick',
  description: 'Productos guardados por el cliente registrado.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function FavoritosPage() {
  return <FavoritosClient />;
}

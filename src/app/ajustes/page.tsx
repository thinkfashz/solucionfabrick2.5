import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Perfil y ajustes | Fabrick',
  description: 'Gestiona tu perfil, datos de entrega, foto, favoritos y pedidos desde Mi cuenta.',
  robots: { index: false, follow: false },
};

export default function AjustesPage() {
  redirect('/mi-cuenta');
}

import type { Metadata } from 'next';
import { TiendaAdmin } from './TiendaAdmin';

export const metadata: Metadata = { title: 'Tienda · Admin' };

export default function TiendaAdminPage() {
  return <TiendaAdmin />;
}

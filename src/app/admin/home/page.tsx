import type { Metadata } from 'next';
import { HomeAdmin } from './HomeAdmin';

export const metadata: Metadata = { title: 'Pantalla principal · Admin' };

export default function HomeAdminPage() {
  return <HomeAdmin />;
}

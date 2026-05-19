import type { Metadata } from 'next';
import AdminInterfaceMount from '@/components/admin-interface/AdminInterfaceMount';
import './studio-theme.css';

export const metadata: Metadata = {
  title: 'Admin | Fabrick',
  description: 'Panel de administración Fabrick',
};

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminInterfaceMount>{children}</AdminInterfaceMount>;
}

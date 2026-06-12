import type { Metadata } from 'next';
import { AdminShellSwitcher } from '@/components/admin/AdminShellSwitcher';
import Presupuesto3DAdminWidget from '@/components/presupuestos/Presupuesto3DAdminWidget';
import AdminColombiaGradientBackground from '@/components/admin/visual/AdminColombiaGradientBackground';
import AdminFabrickTransition from '@/components/admin/visual/AdminFabrickTransition';
import './fabrick-admin-theme.css';

export const metadata: Metadata = {
  title: 'Admin | Fabrick',
  description: 'Panel de administración Fabrick',
};

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminColombiaGradientBackground>
      <AdminFabrickTransition />
      <AdminShellSwitcher>{children}</AdminShellSwitcher>
      <Presupuesto3DAdminWidget />
    </AdminColombiaGradientBackground>
  );
}

import type { Metadata } from 'next';
import { AdminShellSwitcher } from '@/components/admin/AdminShellSwitcher';
import AdminColombiaGradientBackground from '@/components/admin/visual/AdminColombiaGradientBackground';
import './fabrick-admin-theme.css';
import './admin-professional-stage2.css';

export const metadata: Metadata = {
  title: 'Admin | Fabrick',
  description: 'Panel de administración Fabrick',
};

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminColombiaGradientBackground>
      <AdminShellSwitcher>{children}</AdminShellSwitcher>
    </AdminColombiaGradientBackground>
  );
}

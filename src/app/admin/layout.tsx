import type { Metadata } from 'next';
import { AdminShellSwitcher } from '@/components/admin/AdminShellSwitcher';
import AdminColombiaGradientBackground from '@/components/admin/visual/AdminColombiaGradientBackground';
import AdminRouteStyler from '@/components/admin/AdminRouteStyler';
import './fabrick-admin-theme.css';
import './admin-professional-stage2.css';
import './admin-professional-stage3.css';
import './admin-professional-stage4.css';
import './admin-professional-stage5.css';
import './admin-professional-stage6.css';
import './admin-professional-stage7.css';

export const metadata: Metadata = {
  title: 'Admin | Fabrick',
  description: 'Panel de administración Fabrick',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminColombiaGradientBackground>
      <AdminRouteStyler />
      <AdminShellSwitcher>{children}</AdminShellSwitcher>
    </AdminColombiaGradientBackground>
  );
}

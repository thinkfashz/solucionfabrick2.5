import type { ReactNode } from 'react';
import AdminResponsiveGlamFrame from '@/components/admin/visual/AdminResponsiveGlamFrame';

export default function PresupuestosLayout({ children }: { children: ReactNode }) {
  return <AdminResponsiveGlamFrame variant="fabrick">{children}</AdminResponsiveGlamFrame>;
}

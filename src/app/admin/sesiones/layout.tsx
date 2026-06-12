import type { ReactNode } from 'react';
import AdminResponsiveGlamFrame from '@/components/admin/visual/AdminResponsiveGlamFrame';

export default function SesionesLayout({ children }: { children: ReactNode }) {
  return <AdminResponsiveGlamFrame variant="sessions">{children}</AdminResponsiveGlamFrame>;
}

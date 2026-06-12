import type { ReactNode } from 'react';
import AdminBaseThemeFrame from '@/components/admin/AdminBaseThemeFrame';
import { AdminShell } from '@/components/admin/AdminShell';

export function AdminShellSwitcher({ children }: { children: ReactNode }) {
  return (
    <div id="shell-fabrick" className="fabrick-shell" data-admin-shell="fabrick">
      <AdminBaseThemeFrame>
        <AdminShell>{children}</AdminShell>
      </AdminBaseThemeFrame>
    </div>
  );
}

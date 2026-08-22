import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';

export function AdminShellSwitcher({ children }: { children: ReactNode }) {
  return (
    <div id="shell-fabrick" className="fabrick-shell" data-admin-shell="fabrick">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}

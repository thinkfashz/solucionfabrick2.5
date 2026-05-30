'use client';

/**
 * Renders ONLY the active shell (Fabrick or Studio).
 * Previously layout.tsx mounted both shells always — causing 2× API calls,
 * 2× timers, and 2× page component renders. This switcher fixes that.
 */

import dynamic from 'next/dynamic';
import { useEffect, useState, type ReactNode } from 'react';
import AdminBaseThemeFrame from '@/components/admin/AdminBaseThemeFrame';
import { AdminShell } from '@/components/admin/AdminShell';

// Only load StudioShell when the user actually switches to Studio
const LazyStudioShell = dynamic(
  () => import('@/components/admin-studio').then((m) => ({ default: m.StudioShell })),
  { ssr: false },
);

const LS_KEY = 'admin-ui-theme';

export function AdminShellSwitcher({ children }: { children: ReactNode }) {
  const [isStudio, setIsStudio] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    const studio = saved === 'studio';
    setIsStudio(studio);
    if (studio) document.body.dataset.adminTheme = 'studio';
    else delete document.body.dataset.adminTheme;
    setMounted(true);

    function onThemeChange() {
      const current = localStorage.getItem(LS_KEY);
      const next = current === 'studio';
      setIsStudio(next);
      if (next) document.body.dataset.adminTheme = 'studio';
      else delete document.body.dataset.adminTheme;
    }
    window.addEventListener('admin-theme-changed', onThemeChange);
    return () => window.removeEventListener('admin-theme-changed', onThemeChange);
  }, []);

  if (mounted && isStudio) {
    return (
      <div id="shell-studio" className="studio-shell">
        <LazyStudioShell>{children}</LazyStudioShell>
      </div>
    );
  }

  return (
    <div id="shell-fabrick" className="fabrick-shell">
      <AdminBaseThemeFrame>
        <AdminShell>{children}</AdminShell>
      </AdminBaseThemeFrame>
    </div>
  );
}

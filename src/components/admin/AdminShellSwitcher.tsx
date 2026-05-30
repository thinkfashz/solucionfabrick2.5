'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, type ReactNode } from 'react';
import AdminBaseThemeFrame from '@/components/admin/AdminBaseThemeFrame';
import { AdminShell } from '@/components/admin/AdminShell';

const LazyStudioShell = dynamic(
  () => import('@/components/admin-studio').then((m) => ({ default: m.StudioShell })),
  { ssr: false },
);

const LS_KEY = 'admin-ui-theme';

function readTheme(): 'studio' | 'fabrick' {
  try { return localStorage.getItem(LS_KEY) === 'studio' ? 'studio' : 'fabrick'; } catch { return 'fabrick'; }
}

export function AdminShellSwitcher({ children }: { children: ReactNode }) {
  // Initialise synchronously from localStorage to avoid Fabrick→Studio flash
  const [theme, setTheme] = useState<'studio' | 'fabrick' | null>(null);

  useEffect(() => {
    const initial = readTheme();
    setTheme(initial);
    if (initial === 'studio') document.body.dataset.adminTheme = 'studio';
    else delete document.body.dataset.adminTheme;

    function onThemeChange() {
      const next = readTheme();
      setTheme(next);
      if (next === 'studio') document.body.dataset.adminTheme = 'studio';
      else delete document.body.dataset.adminTheme;
    }
    window.addEventListener('admin-theme-changed', onThemeChange);
    return () => window.removeEventListener('admin-theme-changed', onThemeChange);
  }, []);

  // Before client mount: render nothing (avoids wrong-theme flash on SSR hydration)
  if (theme === null) return null;

  if (theme === 'studio') {
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

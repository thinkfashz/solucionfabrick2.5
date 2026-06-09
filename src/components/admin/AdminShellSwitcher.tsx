'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState, type ReactNode } from 'react';
import AdminBaseThemeFrame from '@/components/admin/AdminBaseThemeFrame';
import { AdminShell } from '@/components/admin/AdminShell';

const LazyStudioShell = dynamic(
  () => import('@/components/admin-studio').then((m) => ({ default: m.StudioShell })),
  { ssr: false },
);

const LazyNeoShell = dynamic(
  () => import('@/components/admin-neo/NeoShell').then((m) => ({ default: m.NeoShell })),
  { ssr: false },
);

const LS_KEY = 'admin-ui-theme';

function readTheme(): 'neo' | 'studio' | 'fabrick' {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === 'neo') return 'neo';
    if (v === 'studio') return 'studio';
    return 'fabrick';
  } catch { return 'fabrick'; }
}

export function AdminShellSwitcher({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'neo' | 'studio' | 'fabrick' | null>(null);

  useEffect(() => {
    const initial = readTheme();
    setTheme(initial);
    applyBodyAttr(initial);

    function onThemeChange() {
      const next = readTheme();
      setTheme(next);
      applyBodyAttr(next);
    }
    window.addEventListener('admin-theme-changed', onThemeChange);
    return () => window.removeEventListener('admin-theme-changed', onThemeChange);
  }, []);

  if (theme === null) return null;

  if (theme === 'neo') {
    return (
      <div id="shell-neo" className="neo-shell">
        <LazyNeoShell>{children}</LazyNeoShell>
      </div>
    );
  }

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

function applyBodyAttr(theme: 'neo' | 'studio' | 'fabrick') {
  if (theme === 'neo') document.body.dataset.adminTheme = 'neo';
  else if (theme === 'studio') document.body.dataset.adminTheme = 'studio';
  else delete document.body.dataset.adminTheme;
}

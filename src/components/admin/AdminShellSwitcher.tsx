'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, type ReactNode } from 'react';

const LazyStudioShell = dynamic(
  () => import('@/components/admin-studio').then((m) => ({ default: m.StudioShell })),
  { ssr: false },
);

export function AdminShellSwitcher({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    document.body.dataset.adminTheme = 'studio';
    localStorage.setItem('admin-ui-theme', 'studio');
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div id="shell-studio" className="studio-shell">
      <LazyStudioShell>{children}</LazyStudioShell>
    </div>
  );
}

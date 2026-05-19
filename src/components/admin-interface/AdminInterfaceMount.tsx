'use client';

import { useEffect, useState, type ReactNode } from 'react';
import AdminBaseThemeFrame from '@/components/admin/AdminBaseThemeFrame';
import { AdminShell } from '@/components/admin/AdminShell';
import { StudioShell } from '@/components/admin-studio';

export type AdminInterfaceMode = 'studio' | 'classic';

export const ADMIN_INTERFACE_STORAGE_KEY = 'fabrick.admin.interface.v1';

export function getStoredAdminInterfaceMode(): AdminInterfaceMode {
  if (typeof window === 'undefined') return 'studio';
  try {
    return localStorage.getItem(ADMIN_INTERFACE_STORAGE_KEY) === 'classic' ? 'classic' : 'studio';
  } catch {
    return 'studio';
  }
}

export function setStoredAdminInterfaceMode(mode: AdminInterfaceMode) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADMIN_INTERFACE_STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent('fabrick-admin-interface-change', { detail: { mode } }));
}

export default function AdminInterfaceMount({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<AdminInterfaceMode>('studio');

  useEffect(() => {
    setMode(getStoredAdminInterfaceMode());
    setReady(true);

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: AdminInterfaceMode }>).detail;
      setMode(detail?.mode === 'classic' ? 'classic' : 'studio');
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === ADMIN_INTERFACE_STORAGE_KEY) setMode(getStoredAdminInterfaceMode());
    };

    window.addEventListener('fabrick-admin-interface-change', onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('fabrick-admin-interface-change', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  if (!ready) return <div className="min-h-screen bg-[#09090b]" />;

  if (mode === 'classic') {
    return (
      <AdminBaseThemeFrame>
        <AdminShell>{children}</AdminShell>
      </AdminBaseThemeFrame>
    );
  }

  return <StudioShell>{children}</StudioShell>;
}

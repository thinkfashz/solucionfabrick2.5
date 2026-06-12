import type { ReactNode } from 'react';

export default function AdminBaseThemeFrame({ children }: { children: ReactNode }) {
  return <div data-admin-frame="" className="min-h-screen text-zinc-100">{children}</div>;
}

'use client';

import type { ReactNode } from 'react';

export default function AdminBaseThemeFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_30%),linear-gradient(180deg,#050505,#09090b_42%,#000)] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:42px_42px] opacity-40" />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-64 bg-gradient-to-b from-yellow-300/10 to-transparent" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

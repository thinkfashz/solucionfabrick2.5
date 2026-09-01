'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

export default function WhatsNewBanner() {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await fetch('/api/admin/mcp/governance', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json() as { summary?: { pendingApprovals?: number } };
        if (!cancelled) setPending(Math.max(0, Number(data.summary?.pendingApprovals ?? 0)));
      } catch { /* no global notice when the endpoint is unavailable */ }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    const onVisibility = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  if (pending <= 0) return null;
  return (
    <Link href="/admin/mcp/gobernanza" className="mx-3 mt-3 flex items-center gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-amber-100 shadow-lg shadow-black/10 transition hover:border-amber-300/40 sm:mx-5">
      <ShieldAlert className="h-5 w-5 shrink-0 text-amber-300" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black">{pending} aprobación{pending === 1 ? '' : 'es'} MCP pendiente{pending === 1 ? '' : 's'}</p>
        <p className="mt-0.5 text-xs text-amber-100/65">Revisa la operación antes de permitir publicación o cambios de inventario.</p>
      </div>
      <span className="rounded-full bg-amber-300 px-2 py-1 text-[10px] font-black text-black">REVISAR</span>
    </Link>
  );
}

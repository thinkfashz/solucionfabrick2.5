'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { KeyRound, Link2, SearchCheck, ShieldCheck } from 'lucide-react';

const tabs = [
  { href: '/admin/mcp', label: 'Conectores', icon: Link2, exact: true },
  { href: '/admin/mcp/gobernanza', label: 'Gobernanza', icon: ShieldCheck },
  { href: '/admin/mcp/oauth', label: 'OAuth 2.1', icon: KeyRound, exact: true },
  { href: '/admin/mcp/oauth/diagnostico', label: 'Diagnóstico OAuth', icon: SearchCheck },
];

export default function McpLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/admin/mcp';
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await fetch('/api/admin/mcp/governance', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json() as { summary?: { pendingApprovals?: number } };
        if (!cancelled) setPending(Math.max(0, Number(data.summary?.pendingApprovals ?? 0)));
      } catch { /* admin can continue without badge */ }
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

  return (
    <>
      <div className="border-b border-white/10 bg-black/20 px-4 py-2.5 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const active = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;
            return (
              <Link key={tab.href} href={tab.href} className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition ${active ? 'border-amber-300/30 bg-amber-300/10 text-amber-200' : 'border-white/10 bg-black/20 text-zinc-400 hover:border-white/20 hover:text-white'}`}>
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.href.includes('gobernanza') && pending > 0 && <span className="min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] text-white">{pending > 99 ? '99+' : pending}</span>}
              </Link>
            );
          })}
        </div>
      </div>
      {children}
    </>
  );
}

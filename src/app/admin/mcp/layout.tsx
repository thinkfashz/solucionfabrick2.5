'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Bot, Cable, KeyRound, Link2, SearchCheck, ShieldCheck, Wrench } from 'lucide-react';

const tabs = [
  { href: '/admin/mcp', label: 'Conectar ChatGPT', icon: Link2, exact: true },
  { href: '/admin/mcp/harness', label: 'AI Harness', icon: Bot, exact: true },
  { href: '/admin/mcp/harness/agent', label: 'Fabrick Agent', icon: Wrench },
  { href: '/admin/mcp/gobernanza', label: 'Gobernanza', icon: ShieldCheck },
  { href: '/admin/mcp/oauth', label: 'OAuth avanzado', icon: KeyRound, exact: true },
  { href: '/admin/mcp/oauth/diagnostico', label: 'Diagnóstico', icon: SearchCheck },
  { href: '/admin/mcp/oauth/conexion', label: 'Kit técnico', icon: Cable },
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
      } catch { /* the admin remains usable if governance is temporarily unavailable */ }
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
      <div className="mb-5 border-b border-black/10 pb-4">
        <div className="flex snap-x gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const active = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex min-h-9 shrink-0 snap-start items-center gap-2 rounded-full px-3.5 text-[10px] font-black uppercase tracking-[.12em] transition ${
                  active
                    ? 'bg-[#171612] text-white shadow-sm'
                    : 'border border-black/10 bg-white/55 text-[#716b60] hover:bg-white hover:text-[#171612]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                {tab.label}
                {tab.href.includes('gobernanza') && pending > 0 ? (
                  <span className="min-w-5 rounded-full bg-[#F5871F] px-1.5 py-0.5 text-center text-[9px] text-white">
                    {pending > 99 ? '99+' : pending}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
      {children}
    </>
  );
}

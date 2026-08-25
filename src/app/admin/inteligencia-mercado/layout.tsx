'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BarChart3, Package, Search, ShieldAlert, Sparkles } from 'lucide-react';

const items = [
  { href: '/admin/inteligencia-mercado', label: 'Radar', icon: Search, exact: true },
  { href: '/admin/inteligencia-mercado/oportunidades', label: 'Bandeja', icon: Sparkles, exact: false },
  { href: '/admin/inteligencia-mercado/monitoreo', label: 'Monitoreo', icon: Activity, exact: false },
  { href: '/admin/inteligencia-mercado/alertas', label: 'Alertas', icon: ShieldAlert, exact: false },
  { href: '/admin/productos', label: 'Product Studio', icon: Package, exact: false },
] as const;

export default function InteligenciaMercadoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <div className="px-2 pt-2 sm:px-3">
        <section className="mx-auto flex max-w-[1600px] flex-col gap-3 rounded-2xl border border-black/7 bg-[#fffaf0]/95 p-3 shadow-sm backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#111214] text-[#f5c75d]"><BarChart3 className="h-4 w-4" /></div>
            <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.16em] text-black/30">Fabrick Market Intelligence</p><p className="truncate text-sm font-black text-[#111214]">Radar → Bandeja → Monitoreo → Alertas → Product Studio</p></div>
          </div>
          <nav className="flex gap-1 overflow-x-auto rounded-xl bg-[#efe6d6] p-1">
            {items.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
              return <Link key={href} href={href} className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[11px] font-black transition ${active ? 'bg-[#111214] text-white shadow-sm' : 'text-black/45 hover:bg-white/70 hover:text-black'}`}><Icon className={`h-3.5 w-3.5 ${active ? 'text-[#f5c75d]' : ''}`} />{label}</Link>;
            })}
          </nav>
        </section>
      </div>
      {children}
    </>
  );
}

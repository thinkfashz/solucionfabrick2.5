'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowUpRight, BarChart3, ChevronRight, ExternalLink,
  Megaphone, Package, Radio, Settings, ShoppingCart, Truck, Users,
} from 'lucide-react';

const navSections = [
  {
    title: 'Visión general',
    links: [
      { href: '/admin', label: 'Centro de control', description: 'KPIs y salud operativa', icon: BarChart3 },
    ],
  },
  {
    title: 'Operación',
    links: [
      { href: '/admin/productos', label: 'Productos', description: 'Catálogo y stock', icon: Package },
      { href: '/admin/pedidos', label: 'Pedidos', description: 'Cobros y estados', icon: ShoppingCart },
      { href: '/admin/entregas', label: 'Entregas', description: 'Seguimiento logístico', icon: Truck },
      { href: '/admin/clientes', label: 'Clientes', description: 'Historial y recurrencia', icon: Users },
      { href: '/admin/reportes', label: 'Reportes', description: 'Ventas y métricas', icon: BarChart3 },
    ],
  },
  {
    title: 'Expansión',
    links: [
      { href: '/admin/publicidad', label: 'Publicidad', description: 'Meta Ads', icon: Megaphone },
      { href: '/admin/configuracion', label: 'Configuración', description: 'Parámetros y seguridad', icon: Settings },
    ],
  },
  {
    title: 'Sistema',
    links: [
      { href: '/admin/observatory', label: 'Observatory', description: 'Red en tiempo real', icon: Radio },
    ],
  },
];

function NavItem({ href, label, description, icon: Icon, active }: {
  href: string; label: string; description: string; icon: typeof Package; active: boolean;
}) {
  return (
    <Link href={href} className={`group relative flex items-center gap-3 rounded-[1.15rem] px-3.5 py-3 transition-all duration-200 ${
      active
        ? 'bg-[linear-gradient(135deg,rgba(201,169,110,0.15),rgba(201,169,110,0.06))] border border-[#c9a96e]/25 shadow-[inset_0_1px_0_rgba(201,169,110,0.2)]'
        : 'border border-transparent hover:border-white/8 hover:bg-white/[0.04]'
    }`}>
      {/* Icon */}
      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
        active ? 'bg-[#c9a96e] text-black shadow-[0_2px_8px_rgba(201,169,110,0.45)]' : 'bg-white/6 text-[#c9a96e]'
      }`}>
        <Icon className="h-3.5 w-3.5" />
      </span>

      {/* Text */}
      <span className="flex-1 min-w-0">
        <span className={`block text-[12.5px] font-semibold leading-tight ${active ? 'text-[#c9a96e]' : 'text-zinc-300 group-hover:text-white'} transition-colors`}>
          {label}
        </span>
        <span className="block text-[10.5px] text-zinc-600 leading-tight mt-0.5">{description}</span>
      </span>

      {/* Active arrow */}
      {active && <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0 text-[#c9a96e]" />}
      {!active && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />}
    </Link>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-0 h-[500px] w-[500px] rounded-full bg-[#c9a96e]/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-yellow-400/3 blur-[100px]" />
      </div>

      {/* Top header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-[#080808]/90 backdrop-blur-2xl" />
        <div className="relative mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-3.5">
          {/* Brand */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <Link href="/" className="font-playfair text-[22px] font-black tracking-[0.22em] text-[#c9a96e] hover:text-white transition-colors leading-none">
                FABRICK
              </Link>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
                <p className="text-[9px] uppercase tracking-[0.35em] text-zinc-600">Admin · Control room</p>
              </div>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/tienda"
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400 hover:border-[#c9a96e]/40 hover:text-[#c9a96e] transition-all"
            >
              Ver tienda <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="relative z-10 mx-auto grid max-w-[1600px] gap-6 px-4 md:px-6 py-6 lg:grid-cols-[280px_minmax(0,1fr)]">

        {/* ── Sidebar ── */}
        <aside className="lg:sticky lg:top-[65px] lg:h-[calc(100vh-90px)] lg:overflow-y-auto space-y-4 scrollbar-hide">

          {/* Navigation card */}
          <div className="rounded-[1.75rem] border border-white/[0.07] bg-[linear-gradient(180deg,#0e0e10,#0a0a0b)] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
            {navSections.map((section) => (
              <div key={section.title} className="mb-4 last:mb-0">
                <p className="mb-2.5 ml-1 text-[9.5px] font-bold uppercase tracking-[0.32em] text-zinc-600">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.links.map((link) => (
                    <NavItem
                      key={link.href}
                      href={link.href}
                      label={link.label}
                      description={link.description}
                      icon={link.icon}
                      active={pathname === link.href}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Status card */}
          <div className="rounded-[1.75rem] border border-white/[0.06] bg-[#0a0a0b]/80 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[9.5px] uppercase tracking-[0.28em] text-zinc-500 font-semibold">Sistema activo</p>
            </div>
            <p className="text-xs leading-relaxed text-zinc-500">
              Datos en tiempo real. InsForge conectado y sincronizado.
            </p>
            <div className="mt-3 h-px bg-gradient-to-r from-[#c9a96e]/20 via-[#c9a96e]/40 to-transparent" />
            <p className="mt-3 text-[10px] text-zinc-600">
              © {new Date().getFullYear()} Fabrick · Admin
            </p>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

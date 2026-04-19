'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, BarChart3, Megaphone, Package, Settings, ShoppingCart, Truck, Users } from 'lucide-react';

const navSections = [
  {
    title: 'Visión general',
    links: [
      { href: '/admin', label: 'Centro de control', description: 'KPIs, actividad reciente y salud operativa.', icon: BarChart3 },
    ],
  },
  {
    title: 'Operación',
    links: [
      { href: '/admin/productos', label: 'Productos', description: 'Catálogo, visibilidad y stock.', icon: Package },
      { href: '/admin/pedidos', label: 'Pedidos', description: 'Cobros, estados y detalle comercial.', icon: ShoppingCart },
      { href: '/admin/entregas', label: 'Entregas', description: 'Seguimiento logístico y responsables.', icon: Truck },
      { href: '/admin/clientes', label: 'Clientes', description: 'Historial y recurrencia por contacto.', icon: Users },
      { href: '/admin/reportes', label: 'Reportes', description: 'Ventas, ritmo semanal y top productos.', icon: BarChart3 },
    ],
  },
  {
    title: 'Expansión',
    links: [
      { href: '/admin/publicidad', label: 'Publicidad', description: 'Meta Ads y adquisición pagada.', icon: Megaphone },
      { href: '/admin/configuracion', label: 'Configuración', description: 'Parámetros del negocio y seguridad.', icon: Settings },
    ],
  },
];

function NavLink({ href, label, description, icon: Icon, active }: { href: string; label: string; description: string; icon: typeof Package; active: boolean }) {
  return (
    <Link
      href={href}
      className={`group flex items-start gap-3 rounded-[1.35rem] border px-4 py-3 transition ${
        active
          ? 'border-[#c9a96e]/50 bg-[#c9a96e]/10'
          : 'border-white/8 bg-black/20 hover:border-white/20 hover:bg-white/[0.03]'
      }`}
    >
      <span className={`mt-0.5 rounded-xl p-2 ${active ? 'bg-[#c9a96e] text-black' : 'bg-white/5 text-[#c9a96e]'}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          {label}
          {active && <ArrowUpRight className="h-3.5 w-3.5 text-[#c9a96e]" />}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-zinc-500">{description}</span>
      </span>
    </Link>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(201,169,110,0.10),transparent_28%),linear-gradient(180deg,#050505_0%,#09090b_100%)] text-white">
      <header className="sticky top-0 z-50 border-b border-white/8 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-6 py-4">
          <div>
            <Link href="/" className="font-playfair text-xl font-black tracking-[0.24em] text-[#c9a96e] transition hover:text-white">
              FABRICK
            </Link>
            <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-zinc-500">Admin control room</p>
          </div>
          <Link
            href="/tienda"
            className="rounded-full border border-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-300 transition hover:border-[#c9a96e]/40 hover:text-[#c9a96e]"
          >
            Ver tienda
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-8 px-6 py-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
          <section className="rounded-[2rem] border border-white/8 bg-zinc-950/70 p-5">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#c9a96e]">Navegación</p>
            <div className="mt-5 space-y-5">
              {navSections.map((section) => (
                <div key={section.title}>
                  <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">{section.title}</p>
                  <div className="space-y-2.5">
                    {section.links.map((link) => (
                      <NavLink
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
          </section>

          <section className="rounded-[2rem] border border-white/8 bg-zinc-950/70 p-5">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#c9a96e]">Lectura rápida</p>
            <div className="mt-4 space-y-3 text-sm text-zinc-400">
              <p>Productos y pedidos ya quedan conectados al esquema real de Insforge.</p>
              <p>Si algo cambia en base de datos, el panel prioriza refresco inmediato y fallback seguro.</p>
            </div>
          </section>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
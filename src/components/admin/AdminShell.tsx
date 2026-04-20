'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowUpRight, BarChart3, ChevronRight, ExternalLink, Hammer, Home, LogOut, Menu,
  Megaphone, MoreHorizontal, Package, Radio, Send, Settings, ShieldCheck, ShoppingCart,
  Truck, Users, X,
} from 'lucide-react';
import { useAdminIdleLogout } from '@/hooks/useAdminIdleLogout';

type NavLink = { href: string; label: string; description: string; icon: typeof Package; superadminOnly?: boolean };

const navSections: { title: string; links: NavLink[] }[] = [
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
      { href: '/admin/proyectos', label: 'Proyectos', description: 'Obras terminadas visibles al cliente', icon: Hammer },
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
      { href: '/admin/publicar', label: 'Publicar', description: 'Posts para redes sociales', icon: Send },
      { href: '/admin/configuracion', label: 'Configuración', description: 'Parámetros e integraciones', icon: Settings },
    ],
  },
  {
    title: 'Sistema',
    links: [
      { href: '/admin/observatory', label: 'Observatory', description: 'Red en tiempo real', icon: Radio },
      { href: '/admin/equipo', label: 'Equipo', description: 'Roles, invitaciones y aprobaciones', icon: ShieldCheck, superadminOnly: true },
    ],
  },
];

/** Human labels for breadcrumb segments. Keep in sync with the nav links above. */
const PATH_LABELS: Record<string, string> = {
  '/admin': 'Centro de control',
  '/admin/productos': 'Productos',
  '/admin/productos/nuevo': 'Nuevo producto',
  '/admin/proyectos': 'Proyectos',
  '/admin/pedidos': 'Pedidos',
  '/admin/entregas': 'Entregas',
  '/admin/clientes': 'Clientes',
  '/admin/reportes': 'Reportes',
  '/admin/publicidad': 'Publicidad',
  '/admin/publicidad/nuevo': 'Nueva campaña',
  '/admin/publicar': 'Publicar',
  '/admin/configuracion': 'Configuración',
  '/admin/observatory': 'Observatory',
  '/admin/equipo': 'Equipo',
};

function NavItem({ href, label, description, icon: Icon, active, onNavigate }: {
  href: string; label: string; description: string; icon: typeof Package; active: boolean; onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 transition-all duration-200 ${
        active
          ? 'bg-yellow-400/15 border border-yellow-400/40 shadow-[inset_0_1px_0_rgba(250,204,21,0.25)]'
          : 'border border-transparent hover:border-white/10 hover:bg-white/[0.04]'
      }`}
    >
      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
        active ? 'bg-yellow-400 text-black shadow-[0_2px_10px_rgba(250,204,21,0.55)]' : 'bg-white/5 text-yellow-400'
      }`}>
        <Icon className="h-3.5 w-3.5" />
      </span>

      <span className="flex-1 min-w-0">
        <span className={`block text-[13px] font-semibold leading-tight ${active ? 'text-yellow-400' : 'text-zinc-200 group-hover:text-white'} transition-colors`}>
          {label}
        </span>
        <span className="block text-[10.5px] text-zinc-500 leading-tight mt-0.5">{description}</span>
      </span>

      {active && <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0 text-yellow-400" />}
      {!active && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />}
    </Link>
  );
}

function SidebarContent({ pathname, onNavigate, onLogout, role }: {
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
  role: string | null;
}) {
  const sections = navSections.map((section) => ({
    ...section,
    links: section.links.filter((l) => !l.superadminOnly || role === 'superadmin'),
  })).filter((s) => s.links.length > 0);

  return (
    <div className="space-y-4">
      {/* Brand block with logo inside the panel */}
      <div className="rounded-3xl border border-yellow-400/20 bg-[linear-gradient(180deg,rgba(24,24,27,0.95),rgba(0,0,0,0.9))] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <Link href="/admin" onClick={onNavigate} className="flex items-center gap-3">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-yellow-400 p-1.5 shadow-[0_4px_12px_rgba(250,204,21,0.35)]">
            <Image
              src="/logo-soluciones-fabrick-monocromo-claro.svg"
              alt="Soluciones Fabrick"
              width={96}
              height={24}
              className="h-auto w-full"
              priority
            />
          </span>
          <div className="min-w-0">
            <p className="font-playfair text-lg font-black tracking-[0.18em] text-yellow-400 leading-none">FABRICK</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-500">Admin control</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation card */}
      <nav className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#0e0e10,#0a0a0b)] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        {sections.map((section) => (
          <div key={section.title} className="mb-4 last:mb-0">
            <p className="mb-2.5 ml-1 text-[9.5px] font-bold uppercase tracking-[0.32em] text-zinc-500">
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
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout + status */}
      <div className="rounded-3xl border border-white/10 bg-[#0a0a0b]/80 p-4 space-y-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-300 transition hover:border-red-500/50 hover:text-red-400"
        >
          <LogOut className="h-3.5 w-3.5" />
          Cerrar sesión
        </button>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          <p className="text-[9.5px] uppercase tracking-[0.28em] text-zinc-500 font-semibold">Sistema activo</p>
        </div>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Datos en tiempo real. InsForge sincronizado. Cierre de sesión automático tras 10 min de inactividad.
        </p>
        <p className="text-[10px] text-zinc-600">
          © {new Date().getFullYear()} Fabrick · Admin
        </p>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  // Ten-minute inactivity auto-logout.
  useAdminIdleLogout(10 * 60 * 1000);

  // Close drawer on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent background scroll while mobile drawer is open.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileOpen]);

  // Fetch current admin role once so we can toggle superadmin-only links.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/me', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { rol?: string };
        if (!cancelled) setRole(json.rol ?? null);
      } catch {
        // best-effort: leave role null → superadmin links hidden.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Live clock (updates every second). We hydrate with null + set on mount to
  // avoid SSR/CSR text mismatches around the seconds field.
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Breadcrumb derived from pathname. Falls back to the last segment, prettified.
  const breadcrumb = useMemo(() => {
    if (!pathname) return 'Panel';
    if (PATH_LABELS[pathname]) return PATH_LABELS[pathname];
    // Match deepest known prefix, e.g. /admin/pedidos/abc123 → "Pedidos".
    const segs = pathname.split('/').filter(Boolean);
    for (let i = segs.length; i > 0; i--) {
      const candidate = '/' + segs.slice(0, i).join('/');
      if (PATH_LABELS[candidate]) return PATH_LABELS[candidate];
    }
    return 'Panel';
  }, [pathname]);

  async function handleLogout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    router.replace('/admin/login');
  }

  // Observatory renders full-screen; skip the shell chrome while on it.
  const isObservatory = pathname?.startsWith('/admin/observatory');

  if (isObservatory) {
    return <>{children}</>;
  }

  /* ── Bottom nav (móvil) — 4 prioritarios + Más ───────────────────────── */
  const bottomItems: { href: string; label: string; icon: typeof Home }[] = [
    { href: '/admin',             label: 'Home', icon: Home },
    { href: '/admin/productos',   label: 'Prod', icon: Package },
    { href: '/admin/pedidos',     label: 'Ped',  icon: ShoppingCart },
    { href: '/admin/observatory', label: 'Obs',  icon: Radio },
  ];
  const isBottomActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-0 h-[500px] w-[500px] rounded-full bg-yellow-400/[0.06] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-yellow-300/[0.04] blur-[100px]" />
      </div>

      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08]">
        <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" />
        <div className="relative mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 md:px-6">
          {/* Brand + mobile menu toggle */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-yellow-400 transition hover:border-yellow-400/40 hover:bg-white/5 lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-400 p-1.5 shadow-[0_4px_12px_rgba(250,204,21,0.35)]">
                <Image
                  src="/logo-soluciones-fabrick-monocromo-claro.svg"
                  alt="Soluciones Fabrick"
                  width={80}
                  height={20}
                  className="h-auto w-full"
                  priority
                />
              </span>
              <span className="hidden flex-col leading-none sm:flex">
                <span className="font-playfair text-lg font-black tracking-[0.2em] text-yellow-400">FABRICK</span>
                <span className="mt-0.5 text-[9px] uppercase tracking-[0.3em] text-zinc-500">Admin · Control room</span>
              </span>
            </Link>

            {/* Breadcrumb (hidden on small screens) */}
            <div className="hidden min-w-0 items-center gap-2 border-l border-white/10 pl-3 md:flex">
              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-zinc-600" />
              <span className="truncate text-[11px] font-bold uppercase tracking-[0.22em] text-yellow-400">
                {breadcrumb}
              </span>
            </div>
          </div>

          {/* Center: live clock (md+) */}
          <div className="hidden flex-1 items-center justify-center md:flex" aria-hidden={!now}>
            {now && (
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  {now.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' })}
                </span>
                <span className="text-[11px] font-bold tabular-nums text-white">
                  {now.toLocaleTimeString('es-CL', { hour12: false })}
                </span>
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/tienda"
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-300 hover:border-yellow-400/40 hover:text-yellow-400 transition-all"
            >
              Ver tienda <ExternalLink className="h-3 w-3" />
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300 transition hover:border-red-500/50 hover:text-red-400"
              title="Cerrar sesión"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* Mobile breadcrumb row (only <md) */}
        <div className="relative mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 pb-2 md:hidden">
          <span className="truncate text-[11px] font-bold uppercase tracking-[0.22em] text-yellow-400">
            {breadcrumb}
          </span>
          {now && (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold tabular-nums text-zinc-400">
              <span className="h-1 w-1 rounded-full bg-yellow-400 animate-pulse" />
              {now.toLocaleTimeString('es-CL', { hour12: false })}
            </span>
          )}
        </div>
      </header>

      {/* Layout */}
      <div className="relative z-10 mx-auto grid max-w-[1600px] gap-5 px-3 pb-24 sm:px-4 md:px-6 py-4 md:py-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:pb-6">

        {/* Desktop sidebar */}
        <aside className="hidden lg:block lg:sticky lg:top-[80px] lg:h-[calc(100vh-96px)] lg:overflow-y-auto scrollbar-hide">
          <SidebarContent pathname={pathname} onLogout={handleLogout} role={role} />
        </aside>

        {/* Main content */}
        <main className="min-w-0">{children}</main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative ml-auto h-full w-[85%] max-w-[320px] overflow-y-auto border-l border-white/10 bg-black p-4 shadow-2xl animate-in slide-in-from-right">
            <div className="mb-3 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-300 hover:text-white hover:border-yellow-400/40"
                aria-label="Cerrar menú"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
              onLogout={handleLogout}
              role={role}
            />
          </div>
        </div>
      )}

      {/* Bottom navigation (móvil / tablet vertical) */}
      <nav
        aria-label="Navegación inferior"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/95 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-[1600px] items-stretch justify-around">
          {bottomItems.map((item) => {
            const active = isBottomActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ minHeight: 56 }}
              >
                <Icon className={`h-5 w-5 transition-colors ${active ? 'text-yellow-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                <span className={active ? 'text-yellow-400' : 'text-zinc-500'}>{item.label}</span>
                {active && <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.7)]" />}
              </Link>
            );
          })}
          {/* Más → opens full drawer */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="group relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ minHeight: 56 }}
            aria-label="Más opciones"
          >
            <MoreHorizontal className="h-5 w-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            <span className="text-zinc-500">Más</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

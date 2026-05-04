'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight, AlertTriangle, BarChart3, BookOpen, Boxes, ChevronRight, Cloud, Database, ExternalLink, FileText, Hammer, Image as ImageIcon, Inbox, LayoutGrid, Link2, LogOut, Menu,
  Megaphone, Newspaper, Package, Radio, Search, Send, Settings, ShieldCheck, ShoppingCart, Sparkles, Stethoscope, Terminal,
  Truck, Users, Wallet, X, Zap, Plus, MessageCircle,
} from 'lucide-react';
import { useAdminIdleLogout } from '@/hooks/useAdminIdleLogout';
import { AdminBottomNav } from '@/components/AdminBottomNav';
import { AdminCommandPalette, type CommandItem } from '@/components/admin/AdminCommandPalette';
import { BrandMark } from '@/components/admin/ui';

type NavLink = { href: string; label: string; description: string; icon: typeof Package; superadminOnly?: boolean; highlight?: boolean };

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
      { href: '/admin/productos/importar', label: 'Importar de Mercado Libre', description: 'Vista previa desde URL de ML Chile', icon: Link2 },
      { href: '/admin/materiales', label: 'Materiales (Cotizador)', description: 'Alimenta el cotizador en vivo', icon: Package },
      { href: '/admin/proyectos', label: 'Proyectos', description: 'Obras terminadas visibles al cliente', icon: Hammer },
      { href: '/admin/pedidos', label: 'Pedidos', description: 'Cobros y estados', icon: ShoppingCart },
      { href: '/admin/pagos', label: 'Pagos · MercadoPago', description: 'Modo, latencia y KPIs de la pasarela', icon: Wallet, highlight: true },
      { href: '/admin/cotizaciones', label: 'Cotizaciones', description: 'Solicitudes de servicios y diseños 3D', icon: FileText },
      { href: '/admin/entregas', label: 'Entregas', description: 'Seguimiento logístico', icon: Truck },
      { href: '/admin/clientes', label: 'Clientes', description: 'Historial y recurrencia', icon: Users },
      { href: '/admin/reportes', label: 'Reportes', description: 'Ventas y métricas', icon: BarChart3 },
    ],
  },
  {
    title: 'Contenido',
    links: [
      { href: '/admin/blog', label: 'Blog', description: 'Entradas, portadas y publicación', icon: Newspaper },
      { href: '/admin/home', label: 'Pantalla principal', description: 'Banners, secciones y orden', icon: LayoutGrid },
      { href: '/admin/editor', label: 'Editor universal', description: 'Navbar, footer, checkout, 404 e inyección de código', icon: LayoutGrid, highlight: true },
      { href: '/admin/tienda', label: 'Tienda · Edición', description: 'Portada, banners y secciones del catálogo', icon: ShoppingCart },
      { href: '/admin/medios', label: 'Medios', description: 'Imágenes y biblioteca', icon: ImageIcon },
      { href: '/admin/medios?tab=cloudinary', label: 'Cloudinary', description: 'Subir, eliminar y estado en la nube', icon: Cloud, highlight: true },
    ],
  },
  {
    title: 'Expansión',
    links: [
      { href: '/admin/publicidad', label: 'Publicidad', description: 'Meta Ads', icon: Megaphone },
      { href: '/admin/publicidad/coach', label: 'Coach de campañas', description: 'Agente IA: analizar, sugerir, optimizar', icon: Sparkles, highlight: true },
      { href: '/admin/publicar', label: 'Publicar', description: 'Posts para redes sociales', icon: Send },
      { href: '/admin/social/inbox', label: 'Inbox social', description: 'Mensajes de Instagram, FB, WhatsApp y ML', icon: Inbox, highlight: true },
      { href: '/admin/integraciones/marketplace', label: 'Marketplace de extensiones', description: 'Apps, snippets, webhooks y OAuth', icon: Boxes, highlight: true },
      { href: '/admin/configuracion', label: 'Configuración', description: 'Parámetros e integraciones', icon: Settings },
    ],
  },
  {
    title: 'Sistema',
    links: [
      { href: '/admin/estado', label: 'Estado del sistema', description: 'Diagnóstico CMS, BD, env e integraciones', icon: Stethoscope },
      { href: '/admin/errores', label: 'Monitor de Errores', description: 'Fallos capturados de las rutas API', icon: AlertTriangle },
      { href: '/admin/vercel-logs', label: 'Logs de Vercel', description: 'Build + runtime logs del deployment', icon: Terminal },
      { href: '/admin/manual', label: 'Manual', description: 'Guía técnica de la app', icon: BookOpen, highlight: true },
      { href: '/admin/observatory', label: 'Observatory', description: 'Red en tiempo real', icon: Radio },
      { href: '/admin/envios', label: 'Tarifas de Envío', description: 'Costos por región y transportista', icon: Truck },
      { href: '/admin/sql', label: 'Terminal SQL', description: 'Ejecutar SQL en InsForge', icon: Database },
      { href: '/admin/setup', label: 'Setup', description: 'Verificar tablas InsForge', icon: Database, superadminOnly: true },
      { href: '/admin/equipo', label: 'Equipo', description: 'Roles, invitaciones y aprobaciones', icon: ShieldCheck, superadminOnly: true },
    ],
  },
];

/** Human labels for breadcrumb segments. Keep in sync with the nav links above. */
const PATH_LABELS: Record<string, string> = {
  '/admin': 'Centro de control',
  '/admin/productos': 'Productos',
  '/admin/productos/nuevo': 'Nuevo producto',
  '/admin/productos/importar': 'Importar de Mercado Libre',
  '/admin/materiales': 'Materiales (Cotizador)',
  '/admin/proyectos': 'Proyectos',
  '/admin/pedidos': 'Pedidos',
  '/admin/pagos': 'Pagos · MercadoPago',
  '/admin/cotizaciones': 'Cotizaciones',
  '/admin/entregas': 'Entregas',
  '/admin/clientes': 'Clientes',
  '/admin/reportes': 'Reportes',
  '/admin/publicidad': 'Publicidad',
  '/admin/publicidad/nuevo': 'Nueva campaña',
  '/admin/publicidad/coach': 'Coach de campañas',
  '/admin/publicar': 'Publicar',
  '/admin/social/inbox': 'Inbox social',
  '/admin/integraciones/marketplace': 'Marketplace de extensiones',
  '/admin/configuracion': 'Configuración',
  '/admin/observatory': 'Observatory',
  '/admin/envios': 'Tarifas de Envío',
  '/admin/sql': 'Terminal SQL',
  '/admin/setup': 'Setup',
  '/admin/equipo': 'Equipo',
  '/admin/blog': 'Blog',
  '/admin/blog/nuevo': 'Nueva entrada',
  '/admin/home': 'Pantalla principal',
  '/admin/editor': 'Editor universal',
  '/admin/tienda': 'Tienda · Edición',
  '/admin/medios': 'Medios',
  '/admin/estado': 'Estado del sistema',
  '/admin/manual': 'Manual',
  '/admin/errores': 'Monitor de Errores',
  '/admin/vercel-logs': 'Logs de Vercel',
};

function NavItem({ href, label, description, icon: Icon, active, onNavigate, highlight = false }: {
  href: string; label: string; description: string; icon: typeof Package; active: boolean; onNavigate?: () => void; highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 transition-all duration-200 ${
        active
          ? 'bg-gradient-to-r from-yellow-400/20 via-yellow-300/10 to-transparent border border-yellow-300/40 shadow-[inset_0_1px_0_rgba(250,204,21,0.25)]'
          : highlight
          ? 'border border-yellow-300/30 bg-yellow-300/5 hover:border-yellow-300/60 hover:bg-yellow-300/10'
          : 'border border-transparent hover:border-white/10 hover:bg-white/[0.04]'
      }`}
    >
      {/* Gold accent rail (only when active) */}
      {active ? (
        <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-gradient-to-b from-yellow-300 to-amber-500 shadow-[0_0_10px_rgba(250,204,21,0.6)]" />
      ) : null}

      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all ${
        active
          ? 'bg-yellow-300 text-black shadow-[0_4px_14px_rgba(250,204,21,0.55)]'
          : highlight
          ? 'bg-yellow-300/15 text-yellow-300 ring-1 ring-yellow-300/30'
          : 'bg-white/5 text-zinc-300 group-hover:bg-white/10 group-hover:text-yellow-300'
      }`}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </span>

      <span className="flex-1 min-w-0">
        <span className={`flex items-center gap-2 text-[12.5px] font-semibold leading-tight ${active ? 'text-yellow-200' : highlight ? 'text-yellow-300' : 'text-zinc-200 group-hover:text-white'} transition-colors`}>
          <span className="truncate">{label}</span>
          {highlight && !active && (
            <span className="inline-flex items-center rounded-full border border-yellow-300/40 bg-yellow-300/15 px-1.5 py-px text-[8.5px] font-black uppercase tracking-[0.18em] text-yellow-200">
              Nuevo
            </span>
          )}
        </span>
        <span className="block truncate text-[10.5px] leading-tight mt-0.5 text-zinc-500">{description}</span>
      </span>

      <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 transition-all ${active ? 'text-yellow-300 translate-x-0.5' : 'text-zinc-700 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:text-yellow-300'}`} />
    </Link>
  );
}

const QUICK_ACTIONS: { href: string; label: string; icon: typeof Package; tone: 'primary' | 'cyan' | 'emerald' }[] = [
  { href: '/admin/productos/nuevo', label: 'Nuevo producto', icon: Plus, tone: 'primary' },
  { href: '/admin/cotizaciones', label: 'Cotizaciones', icon: FileText, tone: 'cyan' },
  { href: '/admin/social/inbox', label: 'Inbox social', icon: MessageCircle, tone: 'emerald' },
];

function QuickAction({ href, label, icon: Icon, tone, onNavigate }: {
  href: string; label: string; icon: typeof Package; tone: 'primary' | 'cyan' | 'emerald'; onNavigate?: () => void;
}) {
  const styles = {
    primary: 'border-yellow-300/40 bg-yellow-300/10 text-yellow-200 hover:bg-yellow-300/20 hover:border-yellow-300/70',
    cyan: 'border-sky-400/30 bg-sky-400/10 text-sky-200 hover:bg-sky-400/20 hover:border-sky-400/60',
    emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20 hover:border-emerald-400/60',
  } as const;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`group flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-[10px] font-bold uppercase tracking-[0.16em] transition ${styles[tone]}`}
    >
      <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
      <span className="text-center leading-tight">{label}</span>
    </Link>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <p className="flex items-center gap-2 text-[9.5px] font-bold uppercase tracking-[0.32em] text-zinc-500">
        <span className="h-px w-3 bg-gradient-to-r from-yellow-300/60 to-transparent" />
        {title}
      </p>
      <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">
        {count}
      </span>
    </div>
  );
}

function SidebarContent({ pathname, onNavigate, onLogout, role, now }: {
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
  role: string | null;
  now?: Date | null;
}) {
  const sections = navSections.map((section) => ({
    ...section,
    links: section.links.filter((l) => !l.superadminOnly || role === 'superadmin'),
  })).filter((s) => s.links.length > 0);

  return (
    <div className="space-y-3">
      {/* ── Hero card: brand + role + clock ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-[1.5rem] border border-yellow-300/25 bg-black/55 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(250,204,21,0.10),rgba(0,0,0,0)_60%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-yellow-300/40 to-transparent" />

        <Link href="/admin" onClick={onNavigate} className="relative flex items-center gap-3">
          <BrandMark size="lg" />
          <div className="min-w-0 flex-1">
            <p className="font-playfair text-[11px] font-black tracking-[0.28em] text-yellow-300 leading-none">SOLUCIONES FABRICK</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.22em] text-emerald-300">
                <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                {role === 'superadmin' ? 'Superadmin' : 'Admin'}
              </span>
              {now ? (
                <span className="font-mono text-[9.5px] tabular-nums text-white/50">
                  {now.toLocaleTimeString('es-CL', { hour12: false })}
                </span>
              ) : null}
            </div>
          </div>
        </Link>
      </motion.div>

      {/* ── Quick actions strip ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-3 gap-2"
      >
        {QUICK_ACTIONS.map((qa) => (
          <QuickAction key={qa.href} {...qa} onNavigate={onNavigate} />
        ))}
      </motion.div>

      {/* ── Navigation sections (each in its own card) ── */}
      {sections.map((section, idx) => (
        <motion.nav
          key={section.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 + idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[1.5rem] border border-white/12 bg-black/45 p-3 shadow-[0_14px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl"
        >
          <SectionHeader title={section.title} count={section.links.length} />
          <div className="space-y-1">
            {section.links.map((link) => {
              const hrefPath = link.href.split('?')[0];
              return (
                <NavItem
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  description={link.description}
                  icon={link.icon}
                  active={pathname === hrefPath && !link.highlight}
                  highlight={link.highlight}
                  onNavigate={onNavigate}
                />
              );
            })}
          </div>
        </motion.nav>
      ))}

      {/* ── Footer / logout ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="relative overflow-hidden rounded-[1.5rem] border border-white/12 bg-black/45 p-3 backdrop-blur-xl"
      >
        <button
          onClick={onLogout}
          className="group flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-300 transition hover:border-rose-500/60 hover:bg-rose-500/10 hover:text-rose-300"
        >
          <LogOut className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Cerrar sesión
        </button>
        <div className="mt-3 flex items-center justify-between gap-2 px-1 text-[9.5px] uppercase tracking-[0.28em] text-white/45">
          <span className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-yellow-300" />
            Sistema activo
          </span>
          <span className="font-mono text-white/30">© {new Date().getFullYear()}</span>
        </div>
      </motion.div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [routePulse, setRoutePulse] = useState(0);

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

  useEffect(() => {
    setRoutePulse((prev) => prev + 1);
  }, [pathname]);

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

  // Flatten navSections into a single CommandItem[] used by Cmd+K.
  // Filtered by superadmin scope, deduped by href.
  const commandItems = useMemo<CommandItem[]>(() => {
    const seen = new Set<string>();
    const items: CommandItem[] = [];
    for (const section of navSections) {
      for (const link of section.links) {
        if (link.superadminOnly && role !== 'superadmin') continue;
        if (seen.has(link.href)) continue;
        seen.add(link.href);
        items.push({ href: link.href, label: link.label, description: link.description });
      }
    }
    return items;
  }, [role]);

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

  // The login page must not show the admin chrome (header, sidebar, bottom
  // nav). Otherwise an unauthenticated visitor to /admin/login sees the admin
  // navigation rendered on top of the login form — in particular the fixed
  // bottom bar appears as an overlay/banner stuck to the bottom of the page.
  const isLogin = pathname === '/admin/login';

  if (isObservatory || isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* ── Ambient cinematic background (matches /admin/login) ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Radial duo-gradient base */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_12%,rgba(56,189,248,0.14),rgba(0,0,0,0)_38%),radial-gradient(circle_at_78%_85%,rgba(250,204,21,0.12),rgba(0,0,0,0)_42%),linear-gradient(180deg,rgba(0,0,0,0.22),rgba(0,0,0,0.92))]" />
        {/* Scanlines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:100%_9px] opacity-15" />
        {/* Corner glow blobs */}
        <div className="absolute -left-24 top-12 h-[420px] w-[420px] rounded-full bg-sky-400/15 blur-[100px]" />
        <div className="absolute -right-24 bottom-10 h-[420px] w-[420px] rounded-full bg-yellow-300/15 blur-[100px]" />
      </div>

      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-white/15">
        <div className="absolute inset-0 bg-black/55 backdrop-blur-2xl" />
        <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" />
        <div className="relative mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 md:px-6">
          {/* Brand + mobile menu toggle */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-yellow-300/30 bg-black/50 text-yellow-300 transition-all hover:border-yellow-300/60 hover:bg-black/70 hover:shadow-[0_6px_20px_rgba(250,204,21,0.25)] active:scale-95 lg:hidden"
              aria-label="Abrir menú"
            >
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.18),rgba(255,255,255,0)_60%)] opacity-0 transition-opacity group-hover:opacity-100" />
              {/* Custom 3-line hamburger with stagger */}
              <span className="relative flex h-4 w-5 flex-col justify-between">
                <span className="h-[2px] w-full rounded-full bg-current transition-transform duration-300 group-hover:translate-x-0.5" />
                <span className="h-[2px] w-3/4 rounded-full bg-current transition-all duration-300 group-hover:w-full" />
                <span className="h-[2px] w-1/2 rounded-full bg-current transition-all duration-300 group-hover:w-full group-hover:translate-x-0.5" />
              </span>
            </button>

            <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
              <BrandMark size="md" />
              <span className="hidden flex-col leading-none sm:flex">
                <span className="font-playfair text-[13px] font-black tracking-[0.22em] text-yellow-300">SOLUCIONES FABRICK</span>
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
          <div className="hidden flex-1 items-center justify-center md:flex" aria-hidden="true">
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
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400 hover:border-yellow-400/40 hover:text-yellow-400 transition-all"
              title="Buscar página (Cmd/Ctrl + K)"
              aria-label="Abrir buscador de páginas"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Buscar</span>
              <kbd className="hidden md:inline-block rounded border border-white/10 bg-white/5 px-1 py-0 text-[9px] font-mono text-zinc-500">⌘K</kbd>
            </button>
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
          <SidebarContent pathname={pathname} onLogout={handleLogout} role={role} now={now} />
        </aside>

        {/* Main content */}
        <main className="relative min-w-0 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 18, scale: 0.992, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, scale: 1.01, filter: 'blur(6px)' }}
              transition={{ duration: 0.44, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence initial={false}>
            <motion.div
              key={`admin-route-pulse-${routePulse}`}
              initial={{ opacity: 0.25, scale: 0.98 }}
              animate={{ opacity: 0, scale: 1.03 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.2, 0.9, 0.2, 1] }}
              className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-[radial-gradient(circle_at_30%_16%,rgba(250,204,21,0.16),rgba(0,0,0,0)_42%),radial-gradient(circle_at_76%_82%,rgba(56,189,248,0.14),rgba(0,0,0,0)_48%)]"
            />
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile drawer — login-coherent cinematic style */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="admin-mobile-drawer"
            className="fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Backdrop with cinematic gradient (matches login) */}
            <motion.div
              className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(56,189,248,0.18),rgba(0,0,0,0.92)_55%),linear-gradient(180deg,rgba(0,0,0,0.55),rgba(0,0,0,0.95))] backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            {/* Scanlines + corner glow on backdrop */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:100%_9px] opacity-20" />
            <div className="pointer-events-none absolute -left-24 top-12 h-64 w-64 rounded-full bg-sky-400/20 blur-[90px]" />
            <div className="pointer-events-none absolute -right-24 bottom-10 h-64 w-64 rounded-full bg-yellow-300/20 blur-[90px]" />

            {/* Drawer panel */}
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              className="relative ml-auto flex h-full w-[88%] max-w-[340px] flex-col overflow-y-auto border-l border-white/15 bg-black/55 p-5 shadow-[0_20px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
            >
              {/* Top: SF brand mark + close (mirrors login icon) */}
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BrandMark size="lg" />
                  <div className="flex flex-col leading-none">
                    <span className="font-playfair text-[12px] font-black tracking-[0.24em] text-yellow-300">SOLUCIONES FABRICK</span>
                    <span className="mt-1 text-[9px] uppercase tracking-[0.32em] text-white/45">Control room access</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/40 text-zinc-300 transition hover:border-yellow-300/50 hover:text-yellow-300 active:scale-95"
                  aria-label="Cerrar menú"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="cinematic-panel-enter">
                <SidebarContent
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                  onLogout={handleLogout}
                  role={role}
                  now={now}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom navigation (móvil / tablet vertical) */}
      <AdminBottomNav onOpenMore={() => setMobileOpen(true)} />

      {/* Cmd+K command palette: searches navSections by label/description */}
      <AdminCommandPalette
        items={commandItems}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
      />
    </div>
  );
}

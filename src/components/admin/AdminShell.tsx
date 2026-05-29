'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  Boxes,
  ChevronRight,
  Cloud,
  Database,
  ExternalLink,
  Eye,
  FileText,
  FlaskConical,
  Globe2,
  Hammer,
  Image as ImageIcon,
  Inbox,
  KeyRound,
  LayoutGrid,
  Link2,
  LogOut,
  Menu,
  MessageCircle,
  Newspaper,
  Package,
  Plug,
  Radio,
  Receipt,
  Rocket,
  Scan,
  Search,
  Send,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  Tag,
  Telescope,
  Terminal,
  TrendingDown,
  Truck,
  User,
  Users,
  Video,
  Wallet,
  X,
} from 'lucide-react';
import { useAdminIdleLogout } from '@/hooks/useAdminIdleLogout';
import { AdminBottomNav } from '@/components/AdminBottomNav';
import { AdminCommandPalette, type CommandItem } from '@/components/admin/AdminCommandPalette';
import { BrandMark } from '@/components/admin/ui';
import WhatsNewBanner from '@/components/admin/WhatsNewBanner';
import AdminContextMenu from '@/components/admin/AdminContextMenu';
import DemoSessionTracker from '@/components/admin/DemoSessionTracker';
import { AdminThemeToggle } from '@/components/admin/AdminThemeToggle';

type NavIcon = typeof Package;
type NavLink = { href: string; label: string; description: string; icon: NavIcon; superadminOnly?: boolean; highlight?: boolean };

type NavSection = { title: string; links: NavLink[] };

const navSections: NavSection[] = [
  {
    title: 'Perfil & acceso',
    links: [
      { href: '/admin/perfil', label: 'Perfil administrador', description: 'Foto, bio, contacto, redes y presentación', icon: User, highlight: true },
      { href: '/admin/equipo', label: 'Equipo', description: 'Roles, invitaciones y aprobaciones', icon: ShieldCheck, superadminOnly: true },
      { href: '/admin/equipo/demo', label: 'Links demo 24h', description: 'Accesos guiados de solo lectura', icon: Eye, highlight: true },
      { href: '/admin/sesiones', label: 'Sesiones y dispositivos', description: 'IPs, dispositivos y auditoría', icon: Activity, highlight: true },
      { href: '/admin/seguridad', label: 'Seguridad · Passkeys', description: 'Huella, Face ID y claves de acceso', icon: KeyRound, highlight: true },
    ],
  },
  {
    title: 'Visión general',
    links: [
      { href: '/admin', label: 'Centro de control', description: 'KPIs y salud operativa', icon: BarChart3 },
      { href: '/admin/modulos', label: 'Centro de módulos', description: 'Mapa modular completo del admin', icon: LayoutGrid, highlight: true },
      { href: '/admin/saas', label: 'Mi SaaS', description: 'Clientes, instalación y plataforma', icon: Rocket, highlight: true },
      { href: '/admin/activar', label: 'Activar plataforma', description: 'Variables, servicios y conexiones', icon: ShieldCheck },
    ],
  },
  {
    title: 'Operación',
    links: [
      { href: '/admin/productos', label: 'Productos', description: 'Catálogo y stock', icon: Package },
      { href: '/admin/productos/importar', label: 'Importar de Mercado Libre', description: 'Vista previa desde URL de ML Chile', icon: Link2 },
      { href: '/admin/materiales', label: 'Materiales', description: 'Cotizador en vivo', icon: Package },
      { href: '/admin/proyectos', label: 'Proyectos', description: 'Obras terminadas', icon: Hammer },
      { href: '/admin/pedidos', label: 'Pedidos', description: 'Órdenes y estados', icon: ShoppingCart },
      { href: '/admin/pagos', label: 'Pagos · MercadoPago', description: 'Pasarela y métricas', icon: Wallet, highlight: true },
      { href: '/admin/cotizaciones', label: 'Cotizaciones', description: 'Solicitudes y diseños 3D', icon: FileText },
      { href: '/admin/presupuestos', label: 'Presupuestos', description: 'Links autodestruibles de presupuesto', icon: FileText, highlight: true },
      { href: '/admin/entregas', label: 'Entregas', description: 'Seguimiento logístico', icon: Truck },
      { href: '/admin/inventario', label: 'Inventario', description: 'Stock y movimientos', icon: Scan },
      { href: '/admin/inventario/scan', label: 'Escáner inventario', description: 'Códigos de barra y QR', icon: Scan },
      { href: '/admin/clientes', label: 'Clientes', description: 'Historial y recurrencia', icon: Users },
      { href: '/admin/cupones', label: 'Cupones', description: 'Promociones y descuentos', icon: Tag, highlight: true },
      { href: '/admin/reviews', label: 'Reseñas', description: 'Opiniones de clientes', icon: Star, highlight: true },
      { href: '/admin/reportes', label: 'Reportes', description: 'Ventas y métricas', icon: BarChart3 },
    ],
  },
  {
    title: 'Contenido',
    links: [
      { href: '/admin/blog', label: 'Blog', description: 'Entradas y publicación', icon: Newspaper },
      { href: '/admin/home', label: 'Pantalla principal', description: 'Banners y secciones', icon: LayoutGrid },
      { href: '/admin/editor', label: 'Editor universal', description: 'Navbar, footer, checkout y más', icon: LayoutGrid, highlight: true },
      { href: '/admin/tienda', label: 'Tienda', description: 'Portada y catálogo', icon: ShoppingCart },
      { href: '/admin/medios', label: 'Medios', description: 'Biblioteca de imágenes', icon: ImageIcon },
      { href: '/admin/medios?tab=cloudinary', label: 'Cloudinary', description: 'Nube de medios', icon: Cloud, highlight: true },
    ],
  },
  {
    title: 'Marketing & IA',
    links: [
      { href: '/admin/ia-config', label: 'Configuración IA', description: 'API key Anthropic / Groq y modelo activo', icon: Bot, highlight: true },
      { href: '/admin/agente', label: 'Agente IA · Playwright', description: 'Navega internet, busca precios y analiza competencia', icon: Sparkles, highlight: true },
      { href: '/admin/ai-developer', label: 'Fabrick AI Developer', description: 'Chat real y herramientas Git', icon: Sparkles, highlight: true },
      { href: '/admin/asistente-ia', label: 'Asistente IA', description: 'OpenRouter y análisis', icon: Sparkles, highlight: true },
      { href: '/admin/video-engine', label: 'Fabrick Studio IA', description: 'Guiones, escenas y previews HTML', icon: Video, highlight: true },
      { href: '/admin/publicidad', label: 'Publicidad', description: 'Meta Ads', icon: Globe2 },
      { href: '/admin/publicidad/coach', label: 'Coach campañas', description: 'Optimización con IA', icon: Sparkles, highlight: true },
      { href: '/admin/publicar', label: 'Publicar', description: 'Posts para redes', icon: Send },
      { href: '/admin/newsletter', label: 'Boletín', description: 'Suscriptores y campañas', icon: Newspaper, highlight: true },
      { href: '/admin/inteligencia-mercado', label: 'Inteligencia mercado', description: 'Tendencias y SEO con IA', icon: Telescope, highlight: true },
      { href: '/admin/social', label: 'Social', description: 'Hub social', icon: Inbox },
      { href: '/admin/social/inbox', label: 'Inbox social', description: 'Mensajes y canales', icon: MessageCircle, highlight: true },
    ],
  },
  {
    title: 'MercadoLibre',
    links: [
      { href: '/admin/ml', label: 'Centro ML', description: 'Publicaciones, pedidos y preguntas', icon: Store, highlight: true },
      { href: '/admin/ml/buscar', label: 'Buscador ML', description: 'Buscar catálogo ML Chile', icon: Search },
      { href: '/admin/ml/publicaciones', label: 'Publicaciones ML', description: 'Gestión de listings', icon: Store },
      { href: '/admin/ml/pedidos', label: 'Pedidos ML', description: 'Sincronizar ventas', icon: ShoppingCart },
      { href: '/admin/ml/preguntas', label: 'Preguntas ML', description: 'Responder compradores', icon: MessageCircle },
      { href: '/admin/ml/precios', label: 'Monitor precios ML', description: 'Competencia y precios', icon: TrendingDown },
    ],
  },
  {
    title: 'Sistema',
    links: [
      { href: '/admin/integraciones', label: 'Integraciones', description: 'Conectar y probar APIs', icon: Link2, highlight: true },
      { href: '/admin/integraciones/marketplace', label: 'Marketplace extensiones', description: 'Apps, snippets y OAuth', icon: Boxes, highlight: true },
      { href: '/admin/configuracion', label: 'Configuración', description: 'Negocio y acceso admin', icon: Settings },
      { href: '/admin/estado', label: 'Estado del sistema', description: 'Diagnóstico CMS y BD', icon: Stethoscope },
      { href: '/admin/diagnostico', label: 'Diagnóstico APIs', description: 'Variables y servicios críticos', icon: Stethoscope, highlight: true },
      { href: '/admin/errores', label: 'Errores', description: 'Fallos capturados', icon: AlertTriangle },
      { href: '/admin/vercel-logs', label: 'Logs Vercel', description: 'Build y runtime logs', icon: Terminal },
      { href: '/admin/monitor', label: 'Monitor', description: 'CPU, RAM y latencia', icon: Activity, highlight: true },
      { href: '/admin/manual', label: 'Manual', description: 'Guía técnica', icon: BookOpen, highlight: true },
      { href: '/admin/observatory', label: 'Observatory', description: 'Red 3D en tiempo real', icon: Radio },
      { href: '/admin/envios', label: 'Tarifas envío', description: 'Región y transportista', icon: Truck },
      { href: '/admin/sql', label: 'Terminal SQL', description: 'SQL en InsForge', icon: Database },
      { href: '/admin/testing', label: 'Testing', description: 'Smoke tests', icon: FlaskConical },
      { href: '/admin/setup', label: 'Setup', description: 'Verificar tablas', icon: Database, superadminOnly: true },
      { href: '/admin/extensions', label: 'Extensiones', description: 'Webhooks y signing keys', icon: Plug, highlight: true },
      { href: '/admin/facturas', label: 'Facturas DTE', description: 'Documentos tributarios', icon: Receipt },
    ],
  },
];

const PATH_LABELS: Record<string, string> = Object.fromEntries(
  navSections.flatMap((section) => section.links.map((link) => [link.href.split('?')[0], link.label])),
);

function AvatarCircle({ photo, size = 'md' }: { photo?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  return (
    <span className={`relative flex ${sizeClass} shrink-0 overflow-hidden rounded-full border-2 border-yellow-300/40 bg-black/60 shadow-lg transition-all group-hover:border-yellow-300/80`}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="Foto de perfil" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-yellow-400/20 to-amber-600/10">
          <User className={size === 'sm' ? 'h-3.5 w-3.5 text-yellow-300/70' : 'h-6 w-6 text-yellow-300/70'} />
        </span>
      )}
    </span>
  );
}

function NavItem({ href, label, description, icon: Icon, active, onNavigate, highlight = false }: NavLink & { active: boolean; onNavigate?: () => void }) {
  return (
    <Link href={href} onClick={onNavigate} className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 transition ${active ? 'border-yellow-300/40 bg-yellow-300/15' : highlight ? 'border-yellow-300/25 bg-yellow-300/5 hover:border-yellow-300/50' : 'border-transparent hover:border-white/10 hover:bg-white/[0.04]'}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-yellow-300 text-black' : highlight ? 'bg-yellow-300/15 text-yellow-300' : 'bg-white/5 text-zinc-300 group-hover:text-yellow-300'}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`flex items-center gap-2 text-[12.5px] font-semibold leading-tight ${active || highlight ? 'text-yellow-200' : 'text-zinc-200 group-hover:text-white'}`}>
          <span className="truncate">{label}</span>
          {highlight && <span className="rounded-full border border-yellow-300/40 bg-yellow-300/15 px-1.5 py-px text-[8.5px] font-black uppercase tracking-[0.18em] text-yellow-200">Nuevo</span>}
        </span>
        <span className="mt-0.5 block truncate text-[10.5px] leading-tight text-zinc-500">{description}</span>
      </span>
      <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-yellow-300' : 'text-zinc-700 opacity-0 group-hover:opacity-100'}`} />
    </Link>
  );
}

function SidebarContent({ pathname, onNavigate, onLogout, role, now, profilePhoto }: {
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
  role: string | null;
  now?: Date | null;
  profilePhoto?: string | null;
}) {
  const sections = navSections
    .map((section) => ({ ...section, links: section.links.filter((link) => !link.superadminOnly || role === 'superadmin') }))
    .filter((section) => section.links.length > 0);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-yellow-300/25 bg-black/55 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(250,204,21,0.10),rgba(0,0,0,0)_60%)]" />
        <Link href="/admin/perfil" onClick={onNavigate} className="group relative flex items-center gap-3">
          <AvatarCircle photo={profilePhoto} size="lg" />
          <span className="min-w-0 flex-1">
            <span className="block font-playfair text-[11px] font-black leading-none tracking-[0.28em] text-yellow-300">SOLUCIONES FABRICK</span>
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.22em] text-emerald-300">{role === 'superadmin' ? 'Superadmin' : role === 'viewer' ? 'Demo' : 'Admin'}</span>
              {now ? <span className="font-mono text-[9.5px] tabular-nums text-white/50">{now.toLocaleTimeString('es-CL', { hour12: false })}</span> : null}
            </span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 group-hover:text-yellow-300">Ver perfil</span>
          </span>
        </Link>
      </div>

      {sections.map((section) => (
        <nav key={section.title} className="rounded-[1.5rem] border border-white/12 bg-black/45 p-3 shadow-[0_14px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.32em] text-zinc-500">{section.title}</p>
            <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">{section.links.length}</span>
          </div>
          <div className="space-y-1">
            {section.links.map((link) => {
              const hrefPath = link.href.split('?')[0];
              return <NavItem key={`${section.title}-${link.href}`} {...link} active={pathname === hrefPath} onNavigate={onNavigate} />;
            })}
          </div>
        </nav>
      ))}

      <div className="rounded-[1.5rem] border border-white/12 bg-black/45 p-3 backdrop-blur-xl">
        <button onClick={onLogout} className="group flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-300 transition hover:border-rose-500/60 hover:bg-rose-500/10 hover:text-rose-300">
          <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useAdminIdleLogout(10 * 60 * 1000);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/me', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { rol?: string };
        if (!cancelled) setRole(json.rol ?? null);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/profile/photo', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { photo?: string | null };
        if (!cancelled) setProfilePhoto(json.photo ?? null);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const breadcrumb = useMemo(() => {
    if (!pathname) return 'Panel';
    if (PATH_LABELS[pathname]) return PATH_LABELS[pathname];
    const segs = pathname.split('/').filter(Boolean);
    for (let i = segs.length; i > 0; i--) {
      const candidate = '/' + segs.slice(0, i).join('/');
      if (PATH_LABELS[candidate]) return PATH_LABELS[candidate];
    }
    return 'Panel';
  }, [pathname]);

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
    try { await fetch('/api/admin/logout', { method: 'POST' }); } catch {}
    router.replace('/admin/login');
  }

  const isObservatory = pathname?.startsWith('/admin/observatory');
  const isLogin = pathname === '/admin/login';
  if (isObservatory || isLogin) return <>{children}</>;

  return (
    <div data-admin-root="" className="relative min-h-screen overflow-hidden bg-black text-white">
      <div data-admin-fixed-bg="" className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_12%,rgba(56,189,248,0.14),rgba(0,0,0,0)_38%),radial-gradient(circle_at_78%_85%,rgba(250,204,21,0.12),rgba(0,0,0,0)_42%),linear-gradient(180deg,rgba(0,0,0,0.22),rgba(0,0,0,0.92))]" />
        <div className="absolute -left-24 top-12 h-[420px] w-[420px] rounded-full bg-sky-400/15 blur-[100px]" />
        <div className="absolute -right-24 bottom-10 h-[420px] w-[420px] rounded-full bg-yellow-300/15 blur-[100px]" />
      </div>

      <header data-admin-header="" className="sticky top-0 z-40 border-b border-white/15">
        <div className="absolute inset-0 bg-black/55 backdrop-blur-2xl" />
        <div className="relative mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setContextMenuOpen(true)} className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-yellow-300/30 bg-black/50 text-yellow-300 transition-all hover:border-yellow-300/60 hover:bg-black/70 lg:hidden" aria-label="Abrir menú">
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
              <BrandMark size="md" />
              <span className="hidden flex-col leading-none sm:flex">
                <span className="font-playfair text-[13px] font-black tracking-[0.22em] text-yellow-300">SOLUCIONES FABRICK</span>
                <span className="mt-0.5 text-[9px] uppercase tracking-[0.3em] text-zinc-500">Admin · Control room</span>
              </span>
            </Link>
            <div className="hidden min-w-0 items-center gap-2 border-l border-white/10 pl-3 md:flex">
              <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
              <span className="truncate text-[11px] font-bold uppercase tracking-[0.22em] text-yellow-400">{breadcrumb}</span>
            </div>
          </div>

          <div className="hidden flex-1 items-center justify-center md:flex" aria-hidden="true">
            {now && <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5"><span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" /><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">{now.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' })}</span><span className="text-[11px] font-bold tabular-nums text-white">{now.toLocaleTimeString('es-CL', { hour12: false })}</span></div>}
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPaletteOpen(true)} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400 transition-all hover:border-yellow-400/40 hover:text-yellow-400" title="Buscar página" aria-label="Abrir buscador de páginas"><Search className="h-3.5 w-3.5" /><span className="hidden md:inline">Buscar</span></button>
            <AdminThemeToggle />
            <Link href="/tienda" className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-300 transition-all hover:border-yellow-400/40 hover:text-yellow-400 sm:flex">Ver tienda <ExternalLink className="h-3 w-3" /></Link>
            <Link href="/admin/perfil" title="Ver perfil" className="group relative"><AvatarCircle photo={profilePhoto} size="sm" /></Link>
            <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300 transition hover:border-red-500/50 hover:text-red-400" title="Cerrar sesión"><LogOut className="h-3.5 w-3.5" /><span className="hidden sm:inline">Salir</span></button>
          </div>
        </div>
        <div className="relative mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 pb-2 md:hidden"><span className="truncate text-[11px] font-bold uppercase tracking-[0.22em] text-yellow-400">{breadcrumb}</span>{now && <span className="flex items-center gap-1.5 text-[10px] font-semibold tabular-nums text-zinc-400"><span className="h-1 w-1 rounded-full bg-yellow-400 animate-pulse" />{now.toLocaleTimeString('es-CL', { hour12: false })}</span>}</div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-[1600px] gap-5 px-3 pb-24 py-4 sm:px-4 md:px-6 md:py-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:pb-6">
        <aside data-admin-sidebar="" className="hidden lg:sticky lg:top-[80px] lg:block lg:h-[calc(100vh-96px)] lg:overflow-y-auto scrollbar-hide"><SidebarContent pathname={pathname} onLogout={handleLogout} role={role} now={now} profilePhoto={profilePhoto} /></aside>
        <main data-admin-main="" className="relative min-w-0 overflow-hidden">
          {role === 'viewer' && <DemoSessionTracker />}
          {role === 'viewer' && <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/[0.08] px-5 py-3.5"><Eye className="h-4 w-4 shrink-0 text-amber-400" /><span className="text-[12px] font-bold uppercase tracking-[0.18em] text-amber-300">Modo Demo · Solo lectura</span><span className="text-xs text-amber-300/55">Los cambios que intentes no se guardan · Expira en 24 h</span></div>}
          <WhatsNewBanner />
          {children}
        </main>
      </div>

      <AdminBottomNav onOpenMore={() => setContextMenuOpen(true)} />
      <AdminCommandPalette items={commandItems} open={paletteOpen} onOpenChange={setPaletteOpen} />
      <AdminContextMenu open={contextMenuOpen} onClose={() => setContextMenuOpen(false)} onLogout={handleLogout} profilePhoto={profilePhoto} />
    </div>
  );
}

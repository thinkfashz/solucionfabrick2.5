'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  BadgePercent,
  BarChart3,
  BookOpen,
  Bot,
  Box,
  Boxes,
  Calculator,
  ChevronDown,
  ChevronRight,
  Cloud,
  Cpu,
  Database,
  ExternalLink,
  Eye,
  FileText,
  FlaskConical,
  Globe2,
  Hammer,
  Image as ImageIcon,
  Inbox,
  Kanban,
  KeyRound,
  LayoutGrid,
  Link2,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Newspaper,
  Package,
  Plug,
  Plus,
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
  TrendingUp,
  Truck,
  User,
  Users,
  Video,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAdminIdleLogout } from '@/hooks/useAdminIdleLogout';
import { AdminBottomNav } from '@/components/AdminBottomNav';
import { AdminCommandPalette, type CommandItem } from '@/components/admin/AdminCommandPalette';
import { BrandMark } from '@/components/admin/ui';
import WhatsNewBanner from '@/components/admin/WhatsNewBanner';
import DemoSessionTracker from '@/components/admin/DemoSessionTracker';

type ProductivityGroup = 'Todos' | 'Productividad' | 'Ventas' | 'Operación' | 'Contenido' | 'IA' | 'Sistema';
type NavIcon = LucideIcon;
type NavLink = { href: string; label: string; description: string; icon: NavIcon; superadminOnly?: boolean; highlight?: boolean };
type NavSection = { title: string; group: Exclude<ProductivityGroup, 'Todos'>; links: NavLink[] };

const navSections: NavSection[] = [
  {
    title: 'Perfil & acceso',
    group: 'Productividad',
    links: [
      { href: '/admin/perfil', label: 'Perfil administrador', description: 'Foto, bio, contacto, redes y presentación', icon: User, highlight: true },
      { href: '/admin/equipo', label: 'Equipo', description: 'Roles, invitaciones y aprobaciones', icon: ShieldCheck, superadminOnly: true },
      { href: '/admin/equipo/demo', label: 'Links demo 24h', description: 'Accesos guiados de solo lectura', icon: Eye, highlight: true },
      { href: '/admin/sesiones', label: 'Sesiones y dispositivos', description: 'IPs, dispositivos y auditoría', icon: Activity, highlight: true },
      { href: '/admin/seguridad', label: 'Seguridad · Passkeys', description: 'Huella, Face ID y claves de acceso', icon: KeyRound, highlight: true },
    ],
  },
  {
    title: 'Negocio',
    group: 'Ventas',
    links: [
      { href: '/admin/crm', label: 'CRM & Pipeline', description: 'Oportunidades, leads y seguimiento de ventas', icon: Kanban, highlight: true },
      { href: '/admin/analytics', label: 'Analytics', description: 'Métricas de ventas y rendimiento del negocio', icon: TrendingUp, highlight: true },
      { href: '/admin/contabilidad', label: 'Contabilidad F29 / SII', description: 'Declaraciones mensuales de IVA y PPM', icon: Calculator, highlight: true },
      { href: '/admin/beneficios', label: 'Beneficios Fiscales', description: 'Ahorro tributario y créditos disponibles en Chile', icon: BadgePercent, highlight: true },
    ],
  },
  {
    title: 'Visión general',
    group: 'Productividad',
    links: [
      { href: '/admin', label: 'Centro de control', description: 'KPIs y salud operativa', icon: BarChart3 },
      { href: '/admin/modulos', label: 'Centro de módulos', description: 'Mapa modular completo del admin', icon: LayoutGrid, highlight: true },
      { href: '/admin/saas', label: 'Mi SaaS', description: 'Clientes, instalación y plataforma', icon: Rocket, highlight: true },
      { href: '/admin/activar', label: 'Activar plataforma', description: 'Variables, servicios y conexiones', icon: ShieldCheck },
    ],
  },
  {
    title: 'Motores de venta',
    group: 'Productividad',
    links: [
      { href: '/admin/page-engine-21stdev', label: 'Motor páginas 21stDev', description: 'Creador de landing pages, HTML y links por nicho', icon: LayoutGrid, highlight: true },
      { href: '/admin/motores/aire-acondicionado', label: 'Motor aire acondicionado', description: 'BTU, equipo, instalación y presupuesto 3D', icon: Calculator, highlight: true },
      { href: '/admin/motores/radier', label: 'Motor radier', description: 'Cubicación, sacos, IVA y presupuesto 3D', icon: Hammer, highlight: true },
      { href: '/admin/presupuestos', label: 'Presupuestos', description: 'Links autodestruibles de presupuesto', icon: FileText, highlight: true },
    ],
  },
  {
    title: 'Operación',
    group: 'Operación',
    links: [
      { href: '/admin/productos', label: 'Productos', description: 'Catálogo y stock', icon: Package },
      { href: '/admin/productos/nuevo', label: 'Nuevo producto', description: 'Crear producto manualmente', icon: Plus },
      { href: '/admin/productos/importar', label: 'Importar de Mercado Libre', description: 'Vista previa desde URL de ML Chile', icon: Link2 },
      { href: '/admin/materiales', label: 'Materiales', description: 'Cotizador en vivo', icon: Package },
      { href: '/admin/proyectos', label: 'Proyectos', description: 'Obras terminadas', icon: Hammer },
      { href: '/admin/pedidos', label: 'Pedidos', description: 'Órdenes y estados', icon: ShoppingCart },
      { href: '/admin/pagos', label: 'Pagos · MercadoPago', description: 'Pasarela y métricas', icon: Wallet, highlight: true },
      { href: '/admin/cotizaciones', label: 'Cotizaciones', description: 'Solicitudes y diseños 3D', icon: FileText },
      { href: '/admin/presupuestos/modelos-3d', label: 'Modelos 3D presupuesto', description: 'Galería 3D para cotizaciones', icon: Box },
      { href: '/admin/presupuestos/videos', label: 'Videos presupuesto', description: 'Videos de presentación', icon: Video },
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
    group: 'Contenido',
    links: [
      { href: '/admin/blog', label: 'Blog', description: 'Entradas y publicación', icon: Newspaper },
      { href: '/admin/blog/nuevo', label: 'Nuevo post', description: 'Crear entrada de blog', icon: Plus },
      { href: '/admin/blog/comments', label: 'Comentarios', description: 'Moderar comentarios del blog', icon: MessageCircle },
      { href: '/admin/home', label: 'Pantalla principal', description: 'Banners y secciones', icon: LayoutGrid },
      { href: '/admin/editor', label: 'Editor universal', description: 'Navbar, footer, checkout y más', icon: LayoutGrid, highlight: true },
      { href: '/admin/tienda', label: 'Tienda', description: 'Portada y catálogo', icon: ShoppingCart },
      { href: '/admin/medios', label: 'Medios', description: 'Biblioteca de imágenes', icon: ImageIcon },
      { href: '/admin/medios?tab=cloudinary', label: 'Cloudinary', description: 'Nube de medios', icon: Cloud, highlight: true },
    ],
  },
  {
    title: 'Marketing & IA',
    group: 'IA',
    links: [
      { href: '/admin/ia-config', label: 'Configuración IA', description: 'API key Anthropic / Groq y modelo activo', icon: Bot, highlight: true },
      { href: '/admin/modelos-ia', label: 'Prueba de IAs gratuitas', description: 'Diagnóstico en vivo — testea qué modelos realmente funcionan', icon: FlaskConical, highlight: true },
      { href: '/admin/agente', label: 'Agente IA · Playwright', description: 'Navega internet, busca precios y analiza competencia', icon: Sparkles, highlight: true },
      { href: '/admin/ai-developer', label: 'Fabrick AI Developer', description: 'Chat real y herramientas Git', icon: Sparkles, highlight: true },
      { href: '/admin/asistente-ia', label: 'Asistente IA', description: 'OpenRouter y análisis', icon: Sparkles, highlight: true },
      { href: '/admin/video-engine', label: 'Fabrick Studio IA', description: 'Guiones, escenas y previews HTML', icon: Video, highlight: true },
      { href: '/admin/publicidad', label: 'Publicidad', description: 'Meta Ads', icon: Globe2 },
      { href: '/admin/publicidad/nuevo', label: 'Nueva campaña', description: 'Crear campaña publicitaria', icon: Plus },
      { href: '/admin/publicidad/coach', label: 'Coach campañas', description: 'Optimización con IA', icon: Sparkles, highlight: true },
      { href: '/admin/publicar', label: 'Publicar', description: 'Posts para redes', icon: Send },
      { href: '/admin/newsletter', label: 'Boletín', description: 'Suscriptores y campañas', icon: Newspaper, highlight: true },
      { href: '/admin/correo', label: 'Correo · Resend', description: 'Bandeja de salida, estadísticas y configuración Resend', icon: Mail, highlight: true },
      { href: '/admin/scrapegraph', label: 'ScrapeGraph IA', description: 'Extrae datos estructurados de cualquier web con IA', icon: Cpu, highlight: true },
      { href: '/admin/inteligencia-mercado', label: 'Inteligencia mercado', description: 'Tendencias y SEO con IA', icon: Telescope, highlight: true },
      { href: '/admin/social', label: 'Social', description: 'Hub social', icon: Inbox },
      { href: '/admin/social/inbox', label: 'Inbox social', description: 'Mensajes y canales', icon: MessageCircle, highlight: true },
      { href: '/admin/center', label: 'Centro de mando', description: 'Vista unificada de operaciones', icon: LayoutGrid },
    ],
  },
  {
    title: 'MercadoLibre',
    group: 'Ventas',
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
    group: 'Sistema',
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
      { href: '/admin/acceso-demo', label: 'Acceso demo', description: 'Enlace de demostración temporal', icon: Eye },
    ],
  },
];

const filters: Array<{ key: ProductivityGroup; icon: NavIcon }> = [
  { key: 'Todos', icon: LayoutGrid },
  { key: 'Productividad', icon: Rocket },
  { key: 'Ventas', icon: TrendingUp },
  { key: 'Operación', icon: Hammer },
  { key: 'Contenido', icon: Newspaper },
  { key: 'IA', icon: Sparkles },
  { key: 'Sistema', icon: Settings },
];

const PATH_LABELS: Record<string, string> = Object.fromEntries(navSections.flatMap((section) => section.links.map((link) => [link.href.split('?')[0], link.label])));

function isActivePath(pathname: string, href: string) {
  const path = href.split('?')[0];
  return pathname === path || (path !== '/admin' && pathname.startsWith(path));
}

function AdminClock({ compact = false }: { compact?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return null;
  if (compact) {
    return <span className="flex items-center gap-1.5 text-[10px] font-semibold tabular-nums text-zinc-400"><span className="h-1 w-1 animate-pulse rounded-full bg-yellow-400" />{now.toLocaleTimeString('es-CL', { hour12: false })}</span>;
  }
  return <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" /><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">{now.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' })}</span><span className="text-[11px] font-bold tabular-nums text-white">{now.toLocaleTimeString('es-CL', { hour12: false })}</span></div>;
}

function AvatarCircle({ photo, size = 'md' }: { photo?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  return <span className={`relative flex ${sizeClass} shrink-0 overflow-hidden rounded-full border-2 border-yellow-300/40 bg-black/60 shadow-lg transition-all group-hover:border-yellow-300/80`}>{photo ? <img src={photo} alt="Foto de perfil" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-yellow-400/20 to-amber-600/10"><User className={size === 'sm' ? 'h-3.5 w-3.5 text-yellow-300/70' : 'h-6 w-6 text-yellow-300/70'} /></span>}</span>;
}

function NavItem({ href, label, description, icon: Icon, active, onNavigate, highlight = false }: NavLink & { active: boolean; onNavigate?: () => void }) {
  return <Link href={href} onClick={onNavigate} className={`group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border px-3 py-3 transition-all duration-200 ${active ? 'border-yellow-300/45 bg-white/[0.12] shadow-[inset_0_0_26px_rgba(255,255,255,.06),0_12px_26px_rgba(0,0,0,.35)]' : highlight ? 'border-yellow-300/25 bg-yellow-300/[0.045] hover:border-yellow-300/50 hover:bg-white/[0.08]' : 'border-white/[0.06] bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.06]'}`}>
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-yellow-300 text-black' : highlight ? 'bg-yellow-300/15 text-yellow-300' : 'bg-white/7 text-zinc-300 group-hover:text-yellow-300'}`}><Icon className="h-4 w-4" /></span>
    <span className="min-w-0 flex-1"><span className={`flex min-w-0 items-center gap-2 text-[12.5px] font-black leading-tight ${active || highlight ? 'text-yellow-100' : 'text-zinc-100 group-hover:text-white'}`}><span className="truncate">{label}</span>{highlight && <span className="shrink-0 rounded-full border border-yellow-300/35 bg-yellow-300/12 px-1.5 py-px text-[8px] font-black uppercase tracking-[0.16em] text-yellow-200">Pro</span>}</span><span className="mt-0.5 block truncate text-[10.5px] leading-tight text-zinc-500 group-hover:text-zinc-400">{description}</span></span>
    <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition ${active ? 'text-yellow-300 opacity-100' : 'text-zinc-700 opacity-0 group-hover:opacity-100'}`} />
  </Link>;
}

function SidebarContent({ pathname, onNavigate, onLogout, onClose, role, profilePhoto }: { pathname: string; onNavigate?: () => void; onLogout: () => void; onClose?: () => void; role: string | null; profilePhoto?: string | null }) {
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const active = new Set<string>(['Motores de venta', 'Perfil & acceso', 'Visión general']);
    for (const section of navSections) if (section.links.some((link) => isActivePath(pathname, link.href))) active.add(section.title);
    return active;
  });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ProductivityGroup>('Todos');

  const allowedSections = useMemo(() => navSections.map((section) => ({ ...section, links: section.links.filter((link) => !link.superadminOnly || role === 'superadmin') })).filter((section) => section.links.length > 0), [role]);
  const groupCounts = useMemo(() => {
    const counts = new Map<ProductivityGroup, number>([['Todos', 0]]);
    for (const section of allowedSections) {
      counts.set('Todos', (counts.get('Todos') ?? 0) + section.links.length);
      counts.set(section.group, (counts.get(section.group) ?? 0) + section.links.length);
    }
    return counts;
  }, [allowedSections]);
  const visibleSections = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allowedSections.filter((section) => filter === 'Todos' || section.group === filter).map((section) => ({ ...section, links: term ? section.links.filter((link) => `${link.label} ${link.description} ${section.title}`.toLowerCase().includes(term)) : section.links })).filter((section) => section.links.length > 0);
  }, [allowedSections, filter, search]);
  const featuredLinks = allowedSections.flatMap((section) => section.links).filter((link) => link.highlight).slice(0, 4);

  function toggleSection(title: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
      return next;
    });
  }
  function handleFilter(nextFilter: ProductivityGroup) {
    setFilter(nextFilter);
    const nextOpen = new Set(openSections);
    for (const section of allowedSections) if (nextFilter === 'Todos' || section.group === nextFilter) nextOpen.add(section.title);
    setOpenSections(nextOpen);
  }

  return <div className="grid h-full min-h-0 grid-cols-[60px_minmax(0,1fr)] gap-3 overflow-hidden">
    <div className="relative flex min-h-0 flex-col items-center rounded-[2rem] border border-white/12 bg-white/[0.055] px-2 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_24px_70px_rgba(0,0,0,.42)] backdrop-blur-2xl">
      <div className="absolute inset-0 rounded-[2rem] bg-[linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.02))]" />
      <div className="relative z-10 mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-300/30 bg-black/45 text-yellow-300 shadow-[0_0_25px_rgba(250,204,21,.16)]"><BrandMark size="sm" animated /></div>
      <div className="relative z-10 flex flex-1 flex-col items-center gap-2 overflow-y-auto py-2 scrollbar-hide">{filters.map(({ key, icon: Icon }) => { const active = filter === key; return <button key={key} type="button" onClick={() => handleFilter(key)} title={key} aria-label={`Filtrar por ${key}`} className={`relative flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${active ? 'border-yellow-300/70 bg-yellow-300 text-black shadow-[0_0_22px_rgba(250,204,21,.28)]' : 'border-white/10 bg-black/25 text-white/72 hover:border-yellow-300/35 hover:text-yellow-300'}`}><Icon className="h-4 w-4" />{active && <span className="absolute -right-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-white shadow-[0_0_16px_white]" />}</button>; })}</div>
      <button type="button" onClick={onLogout} className="relative z-10 mt-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-white/60 transition hover:border-rose-400/50 hover:text-rose-300" aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut className="h-4 w-4" /></button>
    </div>

    <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_28px_80px_rgba(0,0,0,.42)] backdrop-blur-2xl">
      <div className="relative shrink-0 overflow-hidden border-b border-white/10 p-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_0%,rgba(255,130,130,.24),transparent_56%),linear-gradient(135deg,rgba(255,255,255,.07),transparent_45%)]" />
        <div className="relative flex items-center gap-3">
          <Link href="/admin/perfil" onClick={onNavigate} className="group shrink-0"><AvatarCircle photo={profilePhoto} size="md" /></Link>
          <div className="min-w-0 flex-1"><p className="truncate text-[17px] font-black tracking-tight text-white">Soluciones Fabrick</p><div className="mt-1 flex flex-wrap items-center gap-1.5"><span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[8.5px] font-black uppercase tracking-[0.18em] text-emerald-300">{role === 'superadmin' ? 'Superadmin' : role === 'viewer' ? 'Demo' : 'Admin'}</span><AdminClock compact /></div></div>
          {onClose && <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/12 bg-black/35 text-white/70 transition hover:border-yellow-300/35 hover:text-yellow-300" aria-label="Cerrar barra lateral" title="Cerrar menú"><X className="h-5 w-5" /></button>}
        </div>
        <div className="relative mt-4"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><input type="search" placeholder="Buscar módulo, venta, IA, producto..." value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-2xl border border-white/12 bg-black/30 pl-10 pr-3 text-sm font-medium text-white outline-none placeholder:text-white/30 focus:border-yellow-300/45 focus:ring-2 focus:ring-yellow-300/15" /></div>
        <div className="relative mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">{filters.map(({ key }) => <button key={`chip-${key}`} type="button" onClick={() => handleFilter(key)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition ${filter === key ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-white/10 bg-black/25 text-white/55 hover:border-yellow-300/40 hover:text-yellow-200'}`}>{key} <span className="ml-1 font-mono opacity-70">{groupCounts.get(key) ?? 0}</span></button>)}</div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-hide">
        {!search.trim() && featuredLinks.length > 0 && filter === 'Todos' && <div className="mb-3 rounded-[1.35rem] border border-yellow-300/20 bg-yellow-300/[0.045] p-2.5"><p className="px-1 pb-2 text-[9px] font-black uppercase tracking-[0.28em] text-yellow-200/70">Accesos rápidos</p><div className="grid grid-cols-2 gap-2">{featuredLinks.map((link) => { const Icon = link.icon; const active = isActivePath(pathname, link.href); return <Link key={`featured-${link.href}`} href={link.href} onClick={onNavigate} className={`flex min-w-0 items-center gap-2 rounded-2xl border px-2.5 py-2 transition ${active ? 'border-yellow-300/50 bg-yellow-300/15' : 'border-white/10 bg-black/25 hover:border-yellow-300/35'}`}><Icon className="h-3.5 w-3.5 shrink-0 text-yellow-300" /><span className="truncate text-[10px] font-black text-white/82">{link.label}</span></Link>; })}</div></div>}
        {visibleSections.length === 0 ? <div className="rounded-[1.5rem] border border-white/10 bg-black/25 px-4 py-8 text-center"><p className="text-sm font-black text-white">Sin módulos encontrados</p><p className="mt-1 text-xs text-white/45">Prueba con otro filtro o búsqueda.</p></div> : <div className="space-y-3">{visibleSections.map((section) => { const isOpen = search.trim() ? true : openSections.has(section.title); const hasActive = section.links.some((link) => isActivePath(pathname, link.href)); return <nav key={section.title} className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/22"><button type="button" onClick={() => toggleSection(section.title)} className={`flex w-full items-center justify-between gap-3 px-4 py-3 transition hover:bg-white/[0.04] ${hasActive ? 'text-yellow-300' : 'text-white/60'}`}><span className="min-w-0 text-left"><span className="block truncate text-[10px] font-black uppercase tracking-[0.28em]">{section.title}</span><span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.14em] text-white/30">{section.group}</span></span><span className="flex shrink-0 items-center gap-2"><span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] text-white/45">{section.links.length}</span><ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`} /></span></button>{isOpen && <div className="space-y-1.5 px-2 pb-3">{section.links.map((link) => <NavItem key={`${section.title}-${link.href}`} {...link} active={isActivePath(pathname, link.href)} onNavigate={onNavigate} />)}</div>}</nav>; })}</div>}
      </div>
    </div>
  </div>;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/admin';
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useAdminIdleLogout(10 * 60 * 1000);

  useEffect(() => { let cancelled = false; (async () => { try { const res = await fetch('/api/admin/me', { cache: 'no-store' }); if (!res.ok || cancelled) return; const json = (await res.json()) as { rol?: string }; if (!cancelled) setRole(json.rol ?? null); } catch {} })(); return () => { cancelled = true; }; }, []);
  useEffect(() => { let cancelled = false; (async () => { try { const res = await fetch('/api/admin/profile/photo', { cache: 'no-store' }); if (!res.ok || cancelled) return; const json = (await res.json()) as { photo?: string | null }; if (!cancelled) setProfilePhoto(json.photo ?? null); } catch {} })(); return () => { cancelled = true; }; }, []);

  const breadcrumb = useMemo(() => { if (PATH_LABELS[pathname]) return PATH_LABELS[pathname]; const segs = pathname.split('/').filter(Boolean); for (let i = segs.length; i > 0; i--) { const candidate = `/${segs.slice(0, i).join('/')}`; if (PATH_LABELS[candidate]) return PATH_LABELS[candidate]; } return 'Panel'; }, [pathname]);
  const commandItems = useMemo<CommandItem[]>(() => { const seen = new Set<string>(); const items: CommandItem[] = []; for (const section of navSections) { for (const link of section.links) { if (link.superadminOnly && role !== 'superadmin') continue; if (seen.has(link.href)) continue; seen.add(link.href); items.push({ href: link.href, label: link.label, description: link.description }); } } return items; }, [role]);

  async function handleLogout() { try { await fetch('/api/admin/logout', { method: 'POST' }); } catch {} router.replace('/admin/login'); }

  const isObservatory = pathname.startsWith('/admin/observatory');
  const isLogin = pathname === '/admin/login';
  if (isObservatory || isLogin) return <>{children}</>;

  return <div data-admin-root="" className="relative min-h-screen overflow-x-hidden text-white">
    <header data-admin-header="" className="sticky top-0 z-40 border-b border-white/15"><div className="absolute inset-0 bg-black/55 backdrop-blur-2xl" /><div className="relative mx-auto flex max-w-[1700px] items-center justify-between gap-3 px-4 py-3 md:px-6"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setMobileSidebarOpen(true)} className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-yellow-300/30 bg-black/50 text-yellow-300 transition-all hover:border-yellow-300/60 hover:bg-black/70 lg:hidden" aria-label="Abrir menú"><Menu className="h-5 w-5" /></button><Link href="/admin" className="flex min-w-0 items-center gap-2.5"><BrandMark size="md" /><span className="hidden flex-col leading-none sm:flex"><span className="font-playfair text-[13px] font-black tracking-[0.22em] text-yellow-300">SOLUCIONES FABRICK</span><span className="mt-0.5 text-[9px] uppercase tracking-[0.3em] text-zinc-500">Admin · Control room</span></span></Link><div className="hidden min-w-0 items-center gap-2 border-l border-white/10 pl-3 md:flex"><ChevronRight className="h-3.5 w-3.5 text-zinc-600" /><span className="truncate text-[11px] font-bold uppercase tracking-[0.22em] text-yellow-400">{breadcrumb}</span></div></div><div className="hidden flex-1 items-center justify-center md:flex" aria-hidden="true"><AdminClock /></div><div className="flex items-center gap-2"><button type="button" onClick={() => setPaletteOpen(true)} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400 transition-all hover:border-yellow-400/40 hover:text-yellow-400" title="Buscar página" aria-label="Abrir buscador de páginas"><Search className="h-3.5 w-3.5" /><span className="hidden md:inline">Buscar</span></button><Link href="/tienda" className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-300 transition-all hover:border-yellow-400/40 hover:text-yellow-400 sm:flex">Ver tienda <ExternalLink className="h-3 w-3" /></Link><Link href="/admin/perfil" title="Ver perfil" className="group relative"><AvatarCircle photo={profilePhoto} size="sm" /></Link><button onClick={handleLogout} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300 transition hover:border-red-500/50 hover:text-red-400" title="Cerrar sesión"><LogOut className="h-3.5 w-3.5" /><span className="hidden sm:inline">Salir</span></button></div></div><div className="relative mx-auto flex max-w-[1700px] items-center justify-between gap-3 px-4 pb-2 md:hidden"><span className="truncate text-[11px] font-bold uppercase tracking-[0.22em] text-yellow-400">{breadcrumb}</span><AdminClock compact /></div></header>

    <div className="relative z-10 mx-auto grid max-w-[1700px] gap-5 px-3 py-4 pb-24 sm:px-4 md:px-6 md:py-6 lg:grid-cols-[410px_minmax(0,1fr)] lg:pb-6 xl:grid-cols-[430px_minmax(0,1fr)]"><aside data-admin-sidebar="" className="hidden min-w-0 lg:sticky lg:top-[80px] lg:block lg:h-[calc(100vh-96px)] lg:overflow-hidden"><SidebarContent pathname={pathname} onLogout={handleLogout} role={role} profilePhoto={profilePhoto} /></aside><main data-admin-main="" className="relative min-w-0 max-w-full overflow-x-hidden">{role === 'viewer' && <DemoSessionTracker />}{role === 'viewer' && <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/[0.08] px-5 py-3.5"><Eye className="h-4 w-4 shrink-0 text-amber-400" /><span className="text-[12px] font-bold uppercase tracking-[0.18em] text-amber-300">Modo Demo · Solo lectura</span><span className="text-xs text-amber-300/55">Los cambios que intentes no se guardan · Expira en 24 h</span></div>}<WhatsNewBanner />{children}</main></div>

    {mobileSidebarOpen && <div className="fixed inset-0 z-[80] lg:hidden"><button type="button" className="absolute inset-0 bg-black/72 backdrop-blur-sm" aria-label="Cerrar menú" onClick={() => setMobileSidebarOpen(false)} /><div className="absolute inset-y-3 left-3 right-3 max-w-[430px] overflow-hidden rounded-[2.2rem]"><SidebarContent pathname={pathname} onNavigate={() => setMobileSidebarOpen(false)} onClose={() => setMobileSidebarOpen(false)} onLogout={handleLogout} role={role} profilePhoto={profilePhoto} /></div></div>}

    <AdminBottomNav onOpenMore={() => setMobileSidebarOpen(true)} />
    <AdminCommandPalette items={commandItems} open={paletteOpen} onOpenChange={setPaletteOpen} />
  </div>;
}

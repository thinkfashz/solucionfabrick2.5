'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, AlertTriangle, BadgePercent, BarChart3, BookOpen, Bot, Box, Boxes, Calculator, ChevronDown, ChevronRight, Cloud, Cpu, Database, ExternalLink, Eye, FileText, FlaskConical, Globe2, Hammer, Image as ImageIcon, Inbox, Kanban, KeyRound, LayoutGrid, Link2, LogOut, Mail, Menu, MessageCircle, Newspaper, Package, Plug, Plus, Radio, Receipt, Rocket, Scan, Search, Send, Settings, ShieldCheck, ShoppingCart, Sparkles, Star, Stethoscope, Store, Tag, Telescope, Terminal, TrendingDown, TrendingUp, Truck, User, UserPlus, Users, Video, Wallet, X, type LucideIcon } from 'lucide-react';
import { useAdminIdleLogout } from '@/hooks/useAdminIdleLogout';
import { AdminBottomNav } from '@/components/AdminBottomNav';
import { AdminCommandPalette, type CommandItem } from '@/components/admin/AdminCommandPalette';
import { BrandMark } from '@/components/admin/ui';
import WhatsNewBanner from '@/components/admin/WhatsNewBanner';
import DemoSessionTracker from '@/components/admin/DemoSessionTracker';

type Group = 'Todos' | 'Productividad' | 'Ventas' | 'Operación' | 'Contenido' | 'IA' | 'Sistema';
type LinkItem = { href: string; label: string; description: string; icon: LucideIcon; superadminOnly?: boolean; highlight?: boolean };
type Section = { title: string; group: Exclude<Group, 'Todos'>; links: LinkItem[] };

const navSections: Section[] = [
  { title: 'Perfil & acceso', group: 'Productividad', links: [
    { href: '/admin/perfil', label: 'Perfil administrador', description: 'Foto, bio, contacto y presentación', icon: User, highlight: true },
    { href: '/admin/invitaciones', label: 'Invitaciones demo', description: 'Generar usuarios demo y links temporales', icon: UserPlus, highlight: true },
    { href: '/admin/equipo', label: 'Equipo', description: 'Roles, invitaciones y aprobaciones', icon: ShieldCheck, superadminOnly: true },
    { href: '/admin/equipo/demo', label: 'Links demo 24h', description: 'Accesos guiados de solo lectura', icon: Eye, highlight: true },
    { href: '/admin/acceso-demo', label: 'Acceso demo', description: 'Enlace de demostración temporal', icon: Eye },
    { href: '/admin/sesiones', label: 'Sesiones y dispositivos', description: 'IPs, dispositivos y auditoría', icon: Activity, highlight: true },
    { href: '/admin/seguridad', label: 'Seguridad · Passkeys', description: 'Huella, Face ID y claves de acceso', icon: KeyRound, highlight: true },
  ] },
  { title: 'Visión general', group: 'Productividad', links: [
    { href: '/admin', label: 'Centro de control', description: 'KPIs, salud operativa y conexión BD', icon: BarChart3, highlight: true },
    { href: '/admin/modulos', label: 'Centro de módulos', description: 'Mapa modular completo del admin', icon: LayoutGrid, highlight: true },
    { href: '/admin/analytics', label: 'Analytics', description: 'Métricas de ventas y rendimiento', icon: TrendingUp, highlight: true },
    { href: '/admin/beneficios', label: 'Beneficios Fiscales', description: 'Ahorro tributario y créditos disponibles', icon: BadgePercent, highlight: true },
    { href: '/admin/saas', label: 'Mi SaaS', description: 'Clientes, instalación y plataforma', icon: Rocket, highlight: true },
    { href: '/admin/activar', label: 'Activar plataforma', description: 'Variables, servicios y conexiones', icon: ShieldCheck },
  ] },
  { title: 'Finanzas & SII', group: 'Ventas', links: [
    { href: '/admin/f29', label: 'F29 · IVA mensual', description: 'IVA, PPM, remanentes y pagos mensuales', icon: FileText, highlight: true },
    { href: '/admin/contabilidad', label: 'Calculadora de impuestos', description: 'IVA, PPM, créditos, contribuciones y total a pagar', icon: Calculator, highlight: true },
    { href: '/admin/contabilidad/f12', label: 'F12 · Registro mensual', description: 'Ventas, compras y respaldo contable', icon: BookOpen, highlight: true },
    { href: '/admin/contabilidad/f21', label: 'F21 · Pagos tributarios', description: 'Obligaciones, pagos, comprobantes y cierre', icon: Wallet, highlight: true },
    { href: '/admin/facturas', label: 'Facturas DTE', description: 'Boletas, facturas y documentos tributarios', icon: Receipt, highlight: true },
    { href: '/admin/pagos', label: 'Pagos · MercadoPago', description: 'Pasarela, cobros y métricas', icon: Wallet, highlight: true },
    { href: '/admin/reportes', label: 'Reportes financieros', description: 'Ventas, métricas y seguimiento', icon: BarChart3 },
    { href: '/admin/sql', label: 'Terminal SQL', description: 'Ejecutar consultas y migraciones InsForge', icon: Database },
  ] },
  { title: 'Motores de venta', group: 'Productividad', links: [
    { href: '/admin/page-engine-21stdev', label: 'Motor páginas 21stDev', description: 'Landings, HTML y links por nicho', icon: LayoutGrid, highlight: true },
    { href: '/admin/paginas', label: 'Creador de páginas', description: 'HTMLs por nicho y URLs personalizadas', icon: LayoutGrid, highlight: true },
    { href: '/admin/motores/aire-acondicionado', label: 'Motor aire acondicionado', description: 'BTU, equipo, instalación y presupuesto 3D', icon: Calculator, highlight: true },
    { href: '/admin/motores/radier', label: 'Motor radier', description: 'Cubicación, sacos, IVA y presupuesto 3D', icon: Hammer, highlight: true },
    { href: '/admin/presupuestos', label: 'Presupuestos', description: 'Links autodestruibles de presupuesto', icon: FileText, highlight: true },
    { href: '/admin/presupuestos/modelos-3d', label: 'Modelos 3D presupuesto', description: 'Galería 3D para cotizaciones', icon: Box },
    { href: '/admin/presupuestos/videos', label: 'Videos presupuesto', description: 'Videos de presentación comercial', icon: Video },
  ] },
  { title: 'Operación', group: 'Operación', links: [
    { href: '/admin/crm', label: 'CRM & Pipeline', description: 'Oportunidades, leads y seguimiento', icon: Kanban, highlight: true },
    { href: '/admin/productos', label: 'Productos', description: 'Catálogo y stock', icon: Package },
    { href: '/admin/productos/nuevo', label: 'Nuevo producto', description: 'Crear producto manualmente', icon: Plus },
    { href: '/admin/productos/importar', label: 'Importar Mercado Libre', description: 'Vista previa desde URL de ML Chile', icon: Link2 },
    { href: '/admin/materiales', label: 'Materiales', description: 'Cotizador en vivo', icon: Package },
    { href: '/admin/proyectos', label: 'Proyectos', description: 'Obras terminadas', icon: Hammer },
    { href: '/admin/pedidos', label: 'Pedidos', description: 'Órdenes y estados', icon: ShoppingCart },
    { href: '/admin/cotizaciones', label: 'Cotizaciones', description: 'Solicitudes y diseños 3D', icon: FileText },
    { href: '/admin/entregas', label: 'Entregas', description: 'Seguimiento logístico', icon: Truck },
    { href: '/admin/inventario', label: 'Inventario', description: 'Stock y movimientos', icon: Scan },
    { href: '/admin/inventario/scan', label: 'Escáner inventario', description: 'Códigos de barra y QR', icon: Scan },
    { href: '/admin/clientes', label: 'Clientes', description: 'Historial y recurrencia', icon: Users },
    { href: '/admin/cupones', label: 'Cupones', description: 'Promociones y descuentos', icon: Tag, highlight: true },
    { href: '/admin/reviews', label: 'Reseñas', description: 'Opiniones de clientes', icon: Star, highlight: true },
  ] },
  { title: 'Contenido', group: 'Contenido', links: [
    { href: '/admin/blog', label: 'Blog', description: 'Entradas y publicación', icon: Newspaper },
    { href: '/admin/blog/nuevo', label: 'Nuevo post', description: 'Crear entrada de blog', icon: Plus },
    { href: '/admin/blog/comments', label: 'Comentarios', description: 'Moderar comentarios del blog', icon: MessageCircle },
    { href: '/admin/home', label: 'Pantalla principal', description: 'Banners y secciones', icon: LayoutGrid },
    { href: '/admin/editor', label: 'Editor universal', description: 'Navbar, footer, checkout y más', icon: LayoutGrid, highlight: true },
    { href: '/admin/tienda', label: 'Tienda · Edición', description: 'Portada y catálogo', icon: ShoppingCart },
    { href: '/admin/medios', label: 'Medios', description: 'Biblioteca de imágenes', icon: ImageIcon },
    { href: '/admin/medios?tab=cloudinary', label: 'Cloudinary', description: 'Nube de medios', icon: Cloud, highlight: true },
  ] },
  { title: 'Marketing & IA', group: 'IA', links: [
    { href: '/admin/ia-config', label: 'Configuración IA', description: 'API keys y modelo activo', icon: Bot, highlight: true },
    { href: '/admin/modelos-ia', label: 'Prueba IAs gratuitas', description: 'Diagnóstico en vivo de modelos', icon: FlaskConical, highlight: true },
    { href: '/admin/agente', label: 'Agente IA · Playwright', description: 'Internet, precios y competencia', icon: Sparkles, highlight: true },
    { href: '/admin/ai-developer', label: 'Fabrick AI Developer', description: 'Chat real y herramientas Git', icon: Sparkles, highlight: true },
    { href: '/admin/asistente-ia', label: 'Asistente IA', description: 'OpenRouter y análisis', icon: Sparkles, highlight: true },
    { href: '/admin/video-engine', label: 'Fabrick Studio IA', description: 'Guiones, escenas y previews HTML', icon: Video, highlight: true },
    { href: '/admin/publicidad', label: 'Publicidad', description: 'Meta Ads', icon: Globe2 },
    { href: '/admin/publicidad/nuevo', label: 'Nueva campaña', description: 'Crear campaña publicitaria', icon: Plus },
    { href: '/admin/publicidad/coach', label: 'Coach campañas', description: 'Optimización con IA', icon: Sparkles, highlight: true },
    { href: '/admin/publicar', label: 'Publicar', description: 'Posts para redes', icon: Send },
    { href: '/admin/newsletter', label: 'Boletín', description: 'Suscriptores y campañas', icon: Newspaper, highlight: true },
    { href: '/admin/correo', label: 'Correo · Resend', description: 'Bandeja de salida y estadísticas', icon: Mail, highlight: true },
    { href: '/admin/scrapegraph', label: 'ScrapeGraph IA', description: 'Extrae datos estructurados de cualquier web', icon: Cpu, highlight: true },
    { href: '/admin/inteligencia-mercado', label: 'Inteligencia mercado', description: 'Tendencias y SEO con IA', icon: Telescope, highlight: true },
    { href: '/admin/social', label: 'Social', description: 'Hub social', icon: Inbox },
    { href: '/admin/social/inbox', label: 'Inbox social', description: 'Instagram, Facebook y WhatsApp', icon: MessageCircle, highlight: true },
    { href: '/admin/center', label: 'Centro de mando', description: 'Vista unificada de operaciones', icon: LayoutGrid },
  ] },
  { title: 'MercadoLibre', group: 'Ventas', links: [
    { href: '/admin/ml', label: 'Centro ML', description: 'Publicaciones, pedidos y preguntas', icon: Store, highlight: true },
    { href: '/admin/ml/buscar', label: 'Buscador ML', description: 'Buscar catálogo ML Chile', icon: Search },
    { href: '/admin/ml/publicaciones', label: 'Publicaciones ML', description: 'Gestión de listings', icon: Store },
    { href: '/admin/ml/pedidos', label: 'Pedidos ML', description: 'Sincronizar ventas', icon: ShoppingCart },
    { href: '/admin/ml/preguntas', label: 'Preguntas ML', description: 'Responder compradores', icon: MessageCircle },
    { href: '/admin/ml/precios', label: 'Monitor precios ML', description: 'Competencia y precios', icon: TrendingDown },
  ] },
  { title: 'Sistema', group: 'Sistema', links: [
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
    { href: '/admin/testing', label: 'Testing', description: 'Smoke tests, webhooks y OAuth', icon: FlaskConical },
    { href: '/admin/setup', label: 'Setup', description: 'Verificar tablas', icon: Database, superadminOnly: true },
    { href: '/admin/extensions', label: 'Extensiones', description: 'Webhooks y signing keys', icon: Plug, highlight: true },
  ] },
];

const filters: Array<{ key: Group; icon: LucideIcon }> = [
  { key: 'Todos', icon: LayoutGrid }, { key: 'Productividad', icon: Rocket }, { key: 'Ventas', icon: TrendingUp }, { key: 'Operación', icon: Hammer }, { key: 'Contenido', icon: Newspaper }, { key: 'IA', icon: Sparkles }, { key: 'Sistema', icon: Settings },
];
const PATH_LABELS = Object.fromEntries(navSections.flatMap((s) => s.links.map((l) => [l.href.split('?')[0], l.label])));
function isActivePath(pathname: string, href: string) { const path = href.split('?')[0]; return pathname === path || (path !== '/admin' && pathname.startsWith(path)); }
function AdminClock() { const [now, setNow] = useState<Date | null>(null); useEffect(() => { setNow(new Date()); const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []); return <span className="flex items-center gap-1.5 text-[10px] font-semibold tabular-nums text-zinc-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />{now?.toLocaleTimeString('es-CL', { hour12: false }) || '--:--:--'}</span>; }
function AvatarCircle({ photo }: { photo?: string | null }) { return <span className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-yellow-300/40 bg-black/60 shadow-lg">{photo ? <img src={photo} alt="Foto de perfil" className="h-full w-full object-cover" /> : <User className="m-auto h-5 w-5 text-yellow-300/70" />}</span>; }
function NavItem({ href, label, description, icon: Icon, active, onNavigate, highlight }: LinkItem & { active: boolean; onNavigate?: () => void }) { return <Link href={href} onClick={onNavigate} className={`group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border px-3 py-3 transition ${active ? 'border-yellow-300/45 bg-white/[0.12]' : highlight ? 'border-yellow-300/25 bg-yellow-300/[0.045] hover:border-yellow-300/50' : 'border-white/[0.06] bg-white/[0.025] hover:border-white/15'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-yellow-300 text-black' : 'bg-yellow-300/15 text-yellow-300'}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex min-w-0 items-center gap-2 text-[12.5px] font-black text-yellow-100"><span className="truncate">{label}</span>{highlight && <span className="shrink-0 rounded-full border border-yellow-300/35 bg-yellow-300/12 px-1.5 py-px text-[8px] uppercase text-yellow-200">Pro</span>}</span><span className="mt-0.5 block truncate text-[10.5px] text-zinc-500">{description}</span></span><ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-700 opacity-0 transition group-hover:opacity-100" /></Link>; }
function SidebarContent({ pathname, onNavigate, onLogout, onClose, role, profilePhoto }: { pathname: string; onNavigate?: () => void; onLogout: () => void; onClose?: () => void; role: string | null; profilePhoto?: string | null }) {
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(['Visión general', 'Finanzas & SII', 'Motores de venta', 'Perfil & acceso']));
  const [search, setSearch] = useState(''); const [filter, setFilter] = useState<Group>('Todos');
  const allowed = useMemo(() => navSections.map((s) => ({ ...s, links: s.links.filter((l) => !l.superadminOnly || role === 'superadmin') })).filter((s) => s.links.length), [role]);
  const counts = useMemo(() => { const m = new Map<Group, number>([['Todos', 0]]); for (const s of allowed) { m.set('Todos', (m.get('Todos') || 0) + s.links.length); m.set(s.group, (m.get(s.group) || 0) + s.links.length); } return m; }, [allowed]);
  const visible = useMemo(() => { const term = search.trim().toLowerCase(); return allowed.filter((s) => filter === 'Todos' || s.group === filter).map((s) => ({ ...s, links: term ? s.links.filter((l) => `${l.label} ${l.description} ${s.title}`.toLowerCase().includes(term)) : s.links })).filter((s) => s.links.length); }, [allowed, filter, search]);
  const featured = allowed.flatMap((s) => s.links).filter((l) => l.highlight).slice(0, 6);
  return <div className="grid h-full min-h-0 grid-cols-[60px_minmax(0,1fr)] gap-3 overflow-hidden"><div className="relative flex min-h-0 flex-col items-center rounded-[2rem] border border-white/12 bg-white/[0.055] px-2 py-4 backdrop-blur-2xl"><div className="relative z-10 mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-300/30 bg-black/45 text-yellow-300"><BrandMark size="sm" animated /></div><div className="relative z-10 flex flex-1 flex-col items-center gap-2 overflow-y-auto py-2 scrollbar-hide">{filters.map(({ key, icon: Icon }) => <button key={key} type="button" onClick={() => setFilter(key)} title={key} className={`relative flex h-11 w-11 items-center justify-center rounded-2xl border transition ${filter === key ? 'border-yellow-300/70 bg-yellow-300 text-black' : 'border-white/10 bg-black/25 text-white/72 hover:text-yellow-300'}`}><Icon className="h-4 w-4" /></button>)}</div><button type="button" onClick={onLogout} className="relative z-10 mt-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-white/60 hover:text-rose-300"><LogOut className="h-4 w-4" /></button></div><div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.07] backdrop-blur-2xl"><div className="relative shrink-0 overflow-hidden border-b border-white/10 p-4"><div className="relative flex items-center gap-3"><Link href="/admin/perfil" onClick={onNavigate}><AvatarCircle photo={profilePhoto} /></Link><div className="min-w-0 flex-1"><p className="truncate text-[17px] font-black text-white">Soluciones Fabrick</p><div className="mt-1 flex items-center gap-2"><span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[8.5px] font-black uppercase tracking-[0.18em] text-emerald-300">{role === 'superadmin' ? 'Superadmin' : role === 'viewer' ? 'Demo' : 'Admin'}</span><AdminClock /></div></div>{onClose && <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/12 bg-black/35 text-white/70"><X className="h-5 w-5" /></button>}</div><div className="relative mt-4"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><input type="search" placeholder="Buscar F29, impuestos, páginas, IA..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 w-full rounded-2xl border border-white/12 bg-black/30 pl-10 pr-3 text-sm text-white outline-none placeholder:text-white/30" /></div><div className="relative mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">{filters.map(({ key }) => <button key={key} type="button" onClick={() => setFilter(key)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${filter === key ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-white/10 bg-black/25 text-white/55'}`}>{key} <span className="ml-1 font-mono opacity-70">{counts.get(key) ?? 0}</span></button>)}</div></div><div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-hide">{!search.trim() && filter === 'Todos' && <div className="mb-3 rounded-[1.35rem] border border-yellow-300/20 bg-yellow-300/[0.045] p-2.5"><p className="px-1 pb-2 text-[9px] font-black uppercase tracking-[0.28em] text-yellow-200/70">Accesos rápidos</p><div className="grid grid-cols-2 gap-2">{featured.map((l) => <Link key={l.href} href={l.href} onClick={onNavigate} className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-2.5 py-2 hover:border-yellow-300/35"><l.icon className="h-3.5 w-3.5 shrink-0 text-yellow-300" /><span className="truncate text-[10px] font-black text-white/82">{l.label}</span></Link>)}</div></div>}{visible.length === 0 ? <div className="rounded-[1.5rem] border border-white/10 bg-black/25 px-4 py-8 text-center text-sm text-white">Sin módulos encontrados</div> : <div className="space-y-3">{visible.map((s) => { const isOpen = search.trim() ? true : openSections.has(s.title); const hasActive = s.links.some((l) => isActivePath(pathname, l.href)); return <nav key={s.title} className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/22"><button type="button" onClick={() => setOpenSections((prev) => { const next = new Set(prev); next.has(s.title) ? next.delete(s.title) : next.add(s.title); return next; })} className={`flex w-full items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.04] ${hasActive ? 'text-yellow-300' : 'text-white/60'}`}><span className="min-w-0 text-left"><span className="block truncate text-[10px] font-black uppercase tracking-[0.28em]">{s.title}</span><span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.14em] text-white/30">{s.group}</span></span><span className="flex items-center gap-2"><span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] text-white/45">{s.links.length}</span><ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`} /></span></button>{isOpen && <div className="space-y-1.5 px-2 pb-3">{s.links.map((l) => <NavItem key={`${s.title}-${l.href}`} {...l} active={isActivePath(pathname, l.href)} onNavigate={onNavigate} />)}</div>}</nav>; })}</div>}</div></div></div>;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/admin'; const router = useRouter(); const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false); const [paletteOpen, setPaletteOpen] = useState(false); const [role, setRole] = useState<string | null>(null); const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  useAdminIdleLogout(10 * 60 * 1000);
  useEffect(() => { let cancelled = false; (async () => { try { const res = await fetch('/api/admin/me', { cache: 'no-store' }); if (!res.ok || cancelled) return; const json = await res.json() as { rol?: string }; setRole(json.rol ?? null); } catch {} })(); return () => { cancelled = true; }; }, []);
  useEffect(() => { let cancelled = false; (async () => { try { const res = await fetch('/api/admin/profile/photo', { cache: 'no-store' }); if (!res.ok || cancelled) return; const json = await res.json() as { photo?: string | null }; setProfilePhoto(json.photo ?? null); } catch {} })(); return () => { cancelled = true; }; }, []);
  const breadcrumb = useMemo(() => { if (PATH_LABELS[pathname]) return PATH_LABELS[pathname]; const segs = pathname.split('/').filter(Boolean); for (let i = segs.length; i > 0; i--) { const candidate = `/${segs.slice(0, i).join('/')}`; if (PATH_LABELS[candidate]) return PATH_LABELS[candidate]; } return 'Panel'; }, [pathname]);
  const commandItems = useMemo<CommandItem[]>(() => { const seen = new Set<string>(); const items: CommandItem[] = []; for (const section of navSections) for (const link of section.links) { if (link.superadminOnly && role !== 'superadmin') continue; if (seen.has(link.href)) continue; seen.add(link.href); items.push({ href: link.href, label: link.label, description: link.description }); } return items; }, [role]);
  async function handleLogout() { try { await fetch('/api/admin/logout', { method: 'POST' }); } catch {} router.replace('/admin/login'); }
  if (pathname.startsWith('/admin/observatory') || pathname === '/admin/login') return <>{children}</>;
  return <div data-admin-root="" className="relative min-h-screen overflow-x-hidden text-white"><header data-admin-header="" className="sticky top-0 z-40 border-b border-white/15"><div className="absolute inset-0 bg-black/55 backdrop-blur-2xl" /><div className="relative mx-auto flex max-w-[1700px] items-center justify-between gap-3 px-4 py-3 md:px-6"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setMobileSidebarOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-300/30 bg-black/50 text-yellow-300 lg:hidden"><Menu className="h-5 w-5" /></button><Link href="/admin" className="flex min-w-0 items-center gap-2.5"><BrandMark size="md" /><span className="hidden flex-col leading-none sm:flex"><span className="font-playfair text-[13px] font-black tracking-[0.22em] text-yellow-300">SOLUCIONES FABRICK</span><span className="mt-0.5 text-[9px] uppercase tracking-[0.3em] text-zinc-500">Admin · Control room</span></span></Link><div className="hidden min-w-0 items-center gap-2 border-l border-white/10 pl-3 md:flex"><ChevronRight className="h-3.5 w-3.5 text-zinc-600" /><span className="truncate text-[11px] font-bold uppercase tracking-[0.22em] text-yellow-400">{breadcrumb}</span></div></div><div className="hidden md:block"><AdminClock /></div><div className="flex items-center gap-2"><button type="button" onClick={() => setPaletteOpen(true)} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400"><Search className="h-3.5 w-3.5" /><span className="hidden md:inline">Buscar</span></button><Link href="/tienda" className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-300 sm:flex">Ver tienda <ExternalLink className="h-3 w-3" /></Link><Link href="/admin/perfil"><AvatarCircle photo={profilePhoto} /></Link><button onClick={handleLogout} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300"><LogOut className="h-3.5 w-3.5" /><span className="hidden sm:inline">Salir</span></button></div></div></header><div className="relative z-10 mx-auto grid max-w-[1700px] gap-5 px-3 py-4 pb-24 sm:px-4 md:px-6 md:py-6 lg:grid-cols-[410px_minmax(0,1fr)] lg:pb-6 xl:grid-cols-[430px_minmax(0,1fr)]"><aside data-admin-sidebar="" className="hidden min-w-0 lg:sticky lg:top-[80px] lg:block lg:h-[calc(100vh-96px)] lg:overflow-hidden"><SidebarContent pathname={pathname} onLogout={handleLogout} role={role} profilePhoto={profilePhoto} /></aside><main data-admin-main="" className="relative min-w-0 max-w-full overflow-x-hidden">{role === 'viewer' && <DemoSessionTracker />}{role === 'viewer' && <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/[0.08] px-5 py-3.5"><Eye className="h-4 w-4 text-amber-400" /><span className="text-[12px] font-bold uppercase tracking-[0.18em] text-amber-300">Modo Demo · Solo lectura</span><span className="text-xs text-amber-300/55">Los cambios que intentes no se guardan · Expira en 24 h</span></div>}<WhatsNewBanner />{children}</main></div>{mobileSidebarOpen && <div className="fixed inset-0 z-[80] lg:hidden"><button type="button" className="absolute inset-0 bg-black/72 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} /><div className="absolute inset-y-3 left-3 right-3"><SidebarContent pathname={pathname} onNavigate={() => setMobileSidebarOpen(false)} onClose={() => setMobileSidebarOpen(false)} onLogout={handleLogout} role={role} profilePhoto={profilePhoto} /></div></div>}<AdminBottomNav onOpenMore={() => setMobileSidebarOpen(true)} /><AdminCommandPalette items={commandItems} open={paletteOpen} onOpenChange={setPaletteOpen} /></div>;
}

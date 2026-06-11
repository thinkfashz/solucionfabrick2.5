'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle, BarChart3, BookOpen, Bot, Boxes, Cloud, Cpu, Database, FileText, Hammer,
  Image as ImageIcon, Inbox, LayoutGrid, Link2, LogOut, Mail, Megaphone, Newspaper, Package,
  Radio, Search, Send, Settings, ShieldCheck, ShoppingCart, Sparkles, Star, Stethoscope, Store,
  Tag, Terminal, TrendingDown, Truck, Telescope, User, Users, Video, Wallet, MessageCircle,
  KeyRound, Activity, Scan, Receipt, FlaskConical, Plug, Rocket, UserPlus,
} from 'lucide-react';
import { FabrickPeakIcon } from '@/components/FabrickBrandIcon';

type NavLink = { href: string; label: string; description: string; icon: typeof Package; superadminOnly?: boolean; highlight?: boolean; comingSoon?: boolean };
type NavSection = { title: string; links: NavLink[] };
type SidebarProfile = { name: string; email: string; avatar_url: string | null; role: string };

export const navSections: NavSection[] = [
  { title: 'Perfil & Cuenta', links: [
    { href: '/admin/perfil', label: 'Perfil administrador', description: 'Foto, bio, contacto y presentación', icon: User, highlight: true },
    { href: '/admin/sesiones', label: 'Sesiones y dispositivos', description: 'IPs, dispositivos y auditoría', icon: Activity, highlight: true },
    { href: '/admin/invitaciones', label: 'Invitaciones demo', description: 'Generar usuario prueba y link temporal', icon: UserPlus, highlight: true },
    { href: '/admin/seguridad', label: 'Seguridad · Passkeys', description: 'Huella digital o Face ID', icon: KeyRound, highlight: true },
  ]},
  { title: 'Visión general', links: [
    { href: '/admin', label: 'Centro de control', description: 'KPIs y salud operativa', icon: BarChart3 },
    { href: '/admin/modulos', label: 'Centro de módulos', description: 'Mapa modular completo', icon: LayoutGrid, highlight: true },
    { href: '/admin/analytics', label: 'Analytics', description: 'Métricas y rendimiento', icon: BarChart3, highlight: true },
    { href: '/admin/beneficios', label: 'Beneficios', description: 'Valor y ventajas comerciales', icon: Star, highlight: true },
    { href: '/admin/saas', label: 'Mi SaaS', description: 'Clientes y plataforma', icon: Rocket, highlight: true },
    { href: '/admin/activar', label: 'Activar plataforma', description: 'Variables y conexiones', icon: ShieldCheck },
  ]},
  { title: 'Operación', links: [
    { href: '/admin/productos', label: 'Productos', description: 'Catálogo y stock', icon: Package },
    { href: '/admin/productos/importar', label: 'Importar de Mercado Libre', description: 'Vista previa ML Chile', icon: Link2 },
    { href: '/admin/materiales', label: 'Materiales', description: 'Cotizador en vivo', icon: Package },
    { href: '/admin/proyectos', label: 'Proyectos', description: 'Obras terminadas', icon: Hammer },
    { href: '/admin/pedidos', label: 'Pedidos', description: 'Cobros y estados', icon: ShoppingCart },
    { href: '/admin/cotizaciones', label: 'Cotizaciones', description: 'Solicitudes y diseños 3D', icon: FileText },
    { href: '/admin/presupuestos', label: 'Presupuestos', description: 'Links autodestruibles', icon: FileText, highlight: true },
    { href: '/admin/motores/radier', label: 'Motor Radier 3D', description: 'Cubicación y visor 360', icon: Hammer, highlight: true },
    { href: '/admin/motores/aire-acondicionado', label: 'Motor Aire AC', description: 'BTU y presupuesto', icon: Plug, highlight: true },
    { href: '/admin/entregas', label: 'Entregas', description: 'Seguimiento logístico', icon: Truck },
    { href: '/admin/inventario', label: 'Inventario', description: 'Stock y bodega', icon: Scan },
    { href: '/admin/inventario/scan', label: 'Escáner de inventario', description: 'Códigos y QR', icon: Scan },
    { href: '/admin/clientes', label: 'Clientes', description: 'Historial y recurrencia', icon: Users },
    { href: '/admin/cupones', label: 'Cupones y descuentos', description: 'Promociones', icon: Tag, highlight: true },
    { href: '/admin/reviews', label: 'Reseñas', description: 'Opiniones y valoraciones', icon: Star, highlight: true },
  ]},
  { title: 'Finanzas & SII', links: [
    { href: '/admin/f29', label: 'F29 · IVA mensual', description: 'IVA, PPM y remanentes', icon: FileText, highlight: true },
    { href: '/admin/contabilidad', label: 'Contabilidad', description: 'Resumen fiscal', icon: Wallet, highlight: true },
    { href: '/admin/facturas', label: 'Facturas DTE', description: 'Boletas, facturas y SII', icon: Receipt, highlight: true },
    { href: '/admin/contabilidad/f12', label: 'F12 · Registro mensual', description: 'Ventas y compras', icon: BookOpen, highlight: true },
    { href: '/admin/contabilidad/f21', label: 'F21 · Pagos tributarios', description: 'Obligaciones y pagos', icon: Wallet, highlight: true },
    { href: '/admin/pagos', label: 'Pagos · MercadoPago', description: 'Pasarela y cobros', icon: Wallet },
    { href: '/admin/reportes', label: 'Reportes financieros', description: 'Totales y métricas', icon: BarChart3 },
    { href: '/admin/sql', label: 'Terminal SQL', description: 'Ejecutar SQL', icon: Database },
  ]},
  { title: 'Contenido', links: [
    { href: '/admin/blog', label: 'Blog', description: 'Entradas y publicación', icon: Newspaper },
    { href: '/admin/home', label: 'Pantalla principal', description: 'Banners y secciones', icon: LayoutGrid },
    { href: '/admin/editor', label: 'Editor universal', description: 'Navbar, footer y código', icon: LayoutGrid, highlight: true },
    { href: '/admin/paginas', label: 'Creador de páginas', description: 'HTMLs por nicho', icon: LayoutGrid, highlight: true },
    { href: '/admin/page-engine-21stdev', label: 'Page Engine 21st.dev', description: 'Páginas modulares', icon: LayoutGrid, highlight: true },
    { href: '/admin/tienda', label: 'Tienda · Edición', description: 'Portada y catálogo', icon: ShoppingCart },
    { href: '/admin/medios', label: 'Medios', description: 'Imágenes y biblioteca', icon: ImageIcon },
    { href: '/admin/medios?tab=cloudinary', label: 'Cloudinary', description: 'Subir y nube', icon: Cloud, highlight: true },
  ]},
  { title: 'Expansión', links: [
    { href: '/admin/publicidad', label: 'Publicidad', description: 'Meta Ads y campañas', icon: Megaphone, highlight: true },
    { href: '/admin/publicidad/coach', label: 'Coach de campañas', description: 'Optimizar anuncios', icon: Sparkles, highlight: true },
    { href: '/admin/ia-config', label: 'Configuración IA', description: 'Proveedor y modelo', icon: Bot, highlight: true },
    { href: '/admin/modelos-ia', label: 'Prueba de IAs gratuitas', description: 'Diagnóstico de modelos', icon: FlaskConical, highlight: true },
    { href: '/admin/agente', label: 'Agente IA · Playwright', description: 'Internet y competencia', icon: Sparkles, highlight: true },
    { href: '/admin/ai-developer', label: 'Fabrick AI Developer', description: 'Chat IA y Git', icon: Sparkles, highlight: true },
    { href: '/admin/correo', label: 'Correo · Resend', description: 'Bandeja y campañas', icon: Mail, highlight: true },
    { href: '/admin/scrapegraph', label: 'ScrapeGraph IA', description: 'Extraer datos web', icon: Cpu, highlight: true },
    { href: '/admin/video-engine', label: 'Fabrick Studio IA', description: 'Guiones y escenas', icon: Video, highlight: true },
    { href: '/admin/publicar', label: 'Publicar', description: 'Posts para redes', icon: Send },
    { href: '/admin/newsletter', label: 'Boletín', description: 'Suscriptores', icon: Newspaper, highlight: true },
    { href: '/admin/asistente-ia', label: 'Asistente IA', description: 'OpenRouter y código', icon: Sparkles, highlight: true },
    { href: '/admin/ml', label: 'MercadoLibre', description: 'Publicaciones y pedidos', icon: Store, highlight: true },
    { href: '/admin/ml/buscar', label: 'Buscador ML', description: 'Buscar en ML Chile', icon: Search },
    { href: '/admin/ml/publicaciones', label: 'Mis publicaciones ML', description: 'Listings propios', icon: Store },
    { href: '/admin/ml/pedidos', label: 'Pedidos ML', description: 'Ventas ML', icon: ShoppingCart },
    { href: '/admin/ml/preguntas', label: 'Preguntas ML', description: 'Responder compradores', icon: MessageCircle },
    { href: '/admin/ml/precios', label: 'Monitor de precios ML', description: 'Comparar competencia', icon: TrendingDown },
    { href: '/admin/inteligencia-mercado', label: 'Inteligencia de mercado', description: 'Tendencias y SEO', icon: Telescope, highlight: true },
    { href: '/admin/social', label: 'Social', description: 'Hub de redes', icon: Inbox },
    { href: '/admin/social/inbox', label: 'Inbox social', description: 'Instagram, FB y WhatsApp', icon: Inbox, highlight: true },
    { href: '/admin/integraciones', label: 'Centro de integraciones', description: 'Conectar APIs', icon: Link2, highlight: true },
    { href: '/admin/integraciones/marketplace', label: 'Marketplace', description: 'Apps y webhooks', icon: Boxes, highlight: true },
    { href: '/admin/configuracion', label: 'Configuración', description: 'Datos del negocio', icon: Settings },
  ]},
  { title: 'Sistema', links: [
    { href: '/admin/estado', label: 'Estado del sistema', description: 'Diagnóstico CMS y BD', icon: Stethoscope },
    { href: '/admin/diagnostico', label: 'Diagnóstico de APIs', description: 'Variables y servicios', icon: Stethoscope, highlight: true },
    { href: '/admin/errores', label: 'Monitor de Errores', description: 'Fallos capturados', icon: AlertTriangle },
    { href: '/admin/vercel-logs', label: 'Logs de Vercel', description: 'Build y runtime', icon: Terminal },
    { href: '/admin/monitor', label: 'Monitor del sistema', description: 'CPU, RAM y latencia', icon: Activity, highlight: true },
    { href: '/admin/manual', label: 'Manual', description: 'Guía técnica', icon: BookOpen, highlight: true },
    { href: '/admin/observatory', label: 'Observatory', description: 'Red 3D', icon: Radio },
    { href: '/admin/envios', label: 'Tarifas de Envío', description: 'Costos por región', icon: Truck },
    { href: '/admin/testing', label: 'Testing', description: 'Pruebas y smoke tests', icon: FlaskConical },
    { href: '/admin/setup', label: 'Setup', description: 'Tablas InsForge', icon: Database, superadminOnly: true },
    { href: '/admin/equipo', label: 'Equipo', description: 'Roles y aprobaciones', icon: ShieldCheck, superadminOnly: true },
  ]},
  { title: 'Seguridad & Claves', links: [
    { href: '/admin/seguridad', label: 'Seguridad · Passkeys', description: 'Huella o Face ID', icon: ShieldCheck, highlight: true },
    { href: '/admin/extensions', label: 'Extensiones y Webhooks', description: 'Snippets y OAuth', icon: Plug, highlight: true },
  ]},
];

function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function initials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'SF'; }

function NavItem({ href, label, description, icon: Icon, active, highlight, comingSoon, collapsed, onNavigate }: NavLink & { active: boolean; collapsed: boolean; onNavigate?: () => void }) {
  return <Link href={href} onClick={onNavigate} title={collapsed ? label : undefined} className={['group relative flex items-center gap-3 rounded-[20px] transition-all duration-200', collapsed ? 'mx-1 justify-center px-0 py-3' : 'mx-2 px-3 py-3', active ? 'bg-white/12 text-white shadow-[0_12px_36px_rgba(85,180,255,0.18)] ring-1 ring-sky-200/25 backdrop-blur-xl' : 'text-[#c6d6e6] hover:bg-white/7 hover:text-white'].join(' ')}>{active && <span className="absolute -left-[9px] top-1/2 h-9 w-1 -translate-y-1/2 rounded-full bg-sky-200 shadow-[0_0_18px_rgba(125,211,252,.9)]" />}<span className={[active ? 'bg-sky-300/18' : 'bg-white/[0.045] group-hover:bg-white/10', 'grid h-9 w-9 shrink-0 place-items-center rounded-[14px] transition'].join(' ')}><Icon className={[active ? 'text-sky-100 drop-shadow-[0_0_10px_rgba(125,211,252,0.55)]' : 'text-[#9fb8cf] group-hover:text-white', 'h-4 w-4 transition-all duration-200'].join(' ')} /></span>{!collapsed && <><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-black leading-none">{label}</span><span className="mt-1 block truncate text-[10px] leading-none text-[#7f95aa] group-hover:text-[#c6d6e6]">{description}</span></span>{comingSoon && <span className="shrink-0 rounded-full bg-white/[0.06] px-1.5 py-px text-[9px] text-[#9fb8cf]">Próx.</span>}{highlight && !comingSoon && <span className="shrink-0 rounded-full bg-sky-300/15 px-1.5 py-px text-[9px] text-sky-200">Nuevo</span>}</>}</Link>;
}

export function StudioSidebarContent({ collapsed, role, onNavigate, onLogout }: { collapsed: boolean; role: string | null; onNavigate?: () => void; onLogout: () => void }) {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [profile, setProfile] = useState<SidebarProfile>({ name: 'Administrador', email: 'Soluciones Fabrick', avatar_url: null, role: role || 'admin' });
  useEffect(() => { let alive = true; fetch('/api/admin/profile', { cache: 'no-store' }).then((r) => r.json()).then((json) => { if (!alive) return; const p = json?.profile || {}; const s = json?.session || {}; setProfile({ name: p.display_name || s.email?.split('@')?.[0] || 'Administrador', email: s.email || p.email || 'Soluciones Fabrick', avatar_url: p.avatar_url || null, role: s.rol || role || 'admin' }); }).catch(() => undefined); return () => { alive = false; }; }, [role]);
  const sections = useMemo(() => { const q = normalize(query.trim()); return navSections.map((section) => ({ ...section, links: section.links.filter((link) => { if (link.superadminOnly && profile.role !== 'superadmin') return false; if (!q) return true; return normalize(`${link.label} ${link.description} ${section.title} ${link.href}`).includes(q); }) })).filter((section) => section.links.length > 0); }, [query, profile.role]);

  return <div className="relative flex h-full flex-col overflow-hidden text-white"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(125,211,252,.22),transparent_16rem),radial-gradient(circle_at_100%_40%,rgba(255,255,255,.08),transparent_18rem),linear-gradient(180deg,rgba(8,36,61,.82),rgba(5,14,25,.96))]" />
    <div className="relative shrink-0 border-b border-white/10 p-4">
      <Link href="/admin/perfil" onClick={onNavigate} className={['flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.075] p-3 backdrop-blur-xl transition hover:bg-white/12', collapsed ? 'justify-center' : ''].join(' ')}>
        <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[18px] border border-sky-200/30 bg-gradient-to-br from-sky-200 to-blue-900 text-sm font-black text-white shadow-[0_10px_28px_rgba(125,211,252,.25)]">{profile.avatar_url ? <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" /> : initials(profile.name)}</div>
        {!collapsed && <div className="min-w-0"><p className="truncate text-[11px] font-black uppercase tracking-[0.22em] text-sky-200">Soluciones Fabrick</p><p className="mt-1 truncate text-sm font-black text-white">{profile.name}</p><p className="truncate text-[10px] uppercase tracking-[0.18em] text-white/45">{profile.role}</p></div>}
      </Link>
    </div>
    {!collapsed && <div className="relative shrink-0 px-4 py-3"><Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9fb8cf]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar opción… F29, tienda, demo" className="h-11 w-full rounded-[18px] border border-white/10 bg-black/25 pl-10 pr-3 text-sm text-white outline-none backdrop-blur-xl placeholder:text-[#8ba1b6] focus:border-sky-200/50" /></div>}
    <div className="relative min-h-0 flex-1 overflow-y-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{sections.map((section) => <div key={section.title} className="mb-1">{!collapsed && <p className="mb-1 px-5 pt-3 text-[10px] font-black uppercase tracking-[0.25em] text-[#9fb8cf]">{section.title}</p>}{collapsed && <div className="mx-4 my-2 h-px bg-white/10" />}<div className={collapsed ? 'space-y-1 px-1' : 'space-y-1'}>{section.links.map((link) => { const hrefPath = link.href.split('?')[0]; const active = pathname === hrefPath || (hrefPath !== '/admin' && pathname.startsWith(`${hrefPath}/`)); return <NavItem key={link.href} {...link} active={active} collapsed={collapsed} onNavigate={onNavigate} />; })}</div></div>)}{!sections.length && !collapsed && <div className="m-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-sm text-[#c6d6e6]">No encontré opciones para “{query}”.</div>}</div>
    <div className="relative shrink-0 border-t border-white/10 p-3"><div className="mb-2 flex items-center gap-3 rounded-[22px] bg-white/[0.07] px-3 py-3 backdrop-blur-xl"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-sky-200 to-blue-900 text-xs font-black text-white">{profile.avatar_url ? <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" /> : initials(profile.name)}</div>{!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white">{profile.name}</p><p className="truncate text-xs text-[#9fb8cf]">{profile.email}</p></div>}</div><button type="button" onClick={onLogout} title={collapsed ? 'Cerrar sesión' : undefined} className={[collapsed ? 'justify-center' : '', 'group flex w-full items-center gap-2 rounded-[18px] px-3 py-3 text-[13px] font-bold text-[#c6d6e6] transition hover:bg-red-500/10 hover:text-red-300'].join(' ')}><LogOut className="h-4 w-4 shrink-0" />{!collapsed && <span>Cerrar sesión</span>}</button></div>
  </div>;
}

export function StudioSidebar({ collapsed, role, onLogout }: { collapsed: boolean; role: string | null; onLogout: () => void }) {
  return <aside data-studio-sidebar="" className={['fixed bottom-3 left-3 top-3 z-30 hidden flex-col overflow-hidden border border-white/10 transition-[width] duration-300 ease-in-out lg:flex', collapsed ? 'w-[76px]' : 'w-[304px]', 'rounded-[32px]'].join(' ')} style={{ background: 'linear-gradient(180deg, rgba(8,36,61,0.86), rgba(5,14,25,0.96))', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', boxShadow: '0 25px 70px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)' }}><StudioSidebarContent collapsed={collapsed} role={role} onLogout={onLogout} /></aside>;
}

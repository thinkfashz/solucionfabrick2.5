'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity, BarChart3, Bot, Boxes, Calculator, ChevronDown, ChevronRight,
  CircleDollarSign, FileText, Gauge, Globe2, Hammer, Image as ImageIcon,
  Inbox, KeyRound, LayoutDashboard, LayoutGrid, Link2, LogOut, Mail, Menu,
  Newspaper, Package, Paintbrush, PanelLeftClose, PanelLeftOpen, Receipt,
  Search, Send, Settings, ShieldCheck, ShoppingCart, Sparkles, Store,
  Terminal, Truck, User, Users, Wallet, X, type LucideIcon,
} from 'lucide-react';
import { useAdminIdleLogout } from '@/hooks/useAdminIdleLogout';
import { BrandMark } from '@/components/admin/ui';
import WhatsNewBanner from '@/components/admin/WhatsNewBanner';
import DemoSessionTracker from '@/components/admin/DemoSessionTracker';

type AdminRole = 'superadmin' | 'admin' | 'editor' | 'ventas' | 'soporte' | 'viewer';
type NavItem = { href: string; label: string; description?: string; icon: LucideIcon; exact?: boolean };
type NavSection = { id: string; label: string; icon: LucideIcon; items: NavItem[]; rootOnly?: boolean };

const NAV: NavSection[] = [
  {
    id: 'overview', label: 'Visión general', icon: LayoutDashboard,
    items: [
      { href: '/admin', label: 'Centro de control', description: 'Resumen operativo del negocio', icon: Gauge, exact: true },
      { href: '/admin/analitica', label: 'Analítica web', description: 'Visitas, sesiones, fuentes y dispositivos', icon: BarChart3 },
      { href: '/admin/modulos', label: 'Mapa de módulos', description: 'Inventario funcional del sistema', icon: LayoutGrid },
    ],
  },
  {
    id: 'intelligence', label: 'Fabrick Intelligence', icon: Sparkles,
    items: [
      { href: '/admin/intelligence', label: 'Intelligence', description: 'Centro inteligente', icon: Sparkles, exact: true },
      { href: '/admin/intelligence/today', label: 'Qué mejorar hoy', description: 'Prioridades y Health Score', icon: Gauge },
      { href: '/admin/intelligence/commerce', label: 'Commerce Agent', description: 'Productos y oportunidades', icon: Bot },
      { href: '/admin/intelligence/operations', label: 'Operaciones', description: 'Stock, margen y Price Watch', icon: Activity },
      { href: '/admin/intelligence/proposals', label: 'Propuestas', description: 'Aprobar, rechazar y ejecutar', icon: FileText },
      { href: '/admin/intelligence/automations', label: 'Automatizaciones', description: 'Tareas y diagnósticos', icon: Boxes },
    ],
  },
  {
    id: 'sales', label: 'Ventas & clientes', icon: CircleDollarSign,
    items: [
      { href: '/admin/crm', label: 'CRM & Pipeline', description: 'Leads y oportunidades', icon: Users },
      { href: '/admin/pedidos', label: 'Pedidos', description: 'Órdenes y estados', icon: ShoppingCart },
      { href: '/admin/cotizaciones', label: 'Cotizaciones', description: 'Solicitudes y propuestas', icon: FileText },
      { href: '/admin/clientes', label: 'Clientes', description: 'Historial y recurrencia', icon: User },
      { href: '/admin/entregas', label: 'Entregas', description: 'Seguimiento logístico', icon: Truck },
    ],
  },
  {
    id: 'catalog', label: 'Catálogo & inventario', icon: Package,
    items: [
      { href: '/admin/productos', label: 'Productos', description: 'Catálogo, precios y stock', icon: Package },
      { href: '/admin/inventario', label: 'Inventario', description: 'Existencias y movimientos', icon: Boxes },
      { href: '/admin/materiales', label: 'Materiales', description: 'Materiales y cotización', icon: Hammer },
    ],
  },
  {
    id: 'finance', label: 'Finanzas & SII', icon: Wallet,
    items: [
      { href: '/admin/f29', label: 'F29 · IVA mensual', description: 'IVA, PPM y remanentes', icon: FileText },
      { href: '/admin/contabilidad', label: 'Contabilidad', description: 'Impuestos y registros', icon: Calculator },
      { href: '/admin/analytics', label: 'Analytics contable', description: 'Tendencias F29, IVA, PPM y ventas', icon: BarChart3 },
      { href: '/admin/facturas', label: 'Facturas DTE', description: 'Documentos tributarios', icon: Receipt },
      { href: '/admin/pagos', label: 'Pagos', description: 'MercadoPago y cobros', icon: CircleDollarSign },
      { href: '/admin/reportes', label: 'Reportes', description: 'Resultados financieros', icon: BarChart3 },
    ],
  },
  {
    id: 'content', label: 'Web & contenido', icon: LayoutGrid,
    items: [
      { href: '/admin/editor', label: 'Visual CMS', description: 'Edita páginas, estilos y contenido visual', icon: Paintbrush, exact: true },
      { href: '/admin/editor/home-structure', label: 'Estructura Home', description: 'Orden, bloques y estructura avanzada del inicio', icon: LayoutGrid },
      { href: '/admin/paginas', label: 'Páginas comerciales', description: 'Landings y páginas administrables', icon: Globe2 },
      { href: '/admin/blog', label: 'Blog', description: 'Artículos y comentarios', icon: Newspaper },
      { href: '/admin/medios', label: 'Biblioteca de medios', description: 'Imágenes, video y Cloudinary', icon: ImageIcon },
      { href: '/admin/proyectos', label: 'Proyectos', description: 'Portafolio de obras', icon: Hammer },
    ],
  },
  {
    id: 'marketing', label: 'Marketing & canales', icon: Send,
    items: [
      { href: '/admin/publicidad', label: 'Publicidad', description: 'Campañas y Meta Ads', icon: Globe2 },
      { href: '/admin/publicar', label: 'Publicaciones', description: 'Contenido para redes', icon: Send },
      { href: '/admin/social', label: 'Social Hub', description: 'Canales y bandeja social', icon: Inbox },
      { href: '/admin/newsletter', label: 'Newsletter', description: 'Suscriptores y campañas', icon: Newspaper },
      { href: '/admin/correo', label: 'Correo', description: 'Resend y entregabilidad', icon: Mail },
      { href: '/admin/ml', label: 'MercadoLibre', description: 'Publicaciones y ventas ML', icon: Store },
    ],
  },
  {
    id: 'ai', label: 'IA & análisis', icon: Bot,
    items: [
      { href: '/admin/modelos-ia', label: 'Modelos IA', description: 'Disponibilidad y configuración', icon: Bot },
      { href: '/admin/inteligencia-mercado', label: 'Inteligencia de mercado', description: 'Tendencias, SEO y competencia', icon: BarChart3 },
    ],
  },
  {
    id: 'tools', label: 'Motores & presupuestos', icon: Hammer,
    items: [
      { href: '/admin/motores/aire-acondicionado', label: 'Aire acondicionado', description: 'BTU y presupuesto', icon: Calculator },
      { href: '/admin/motores/radier', label: 'Radier', description: 'Cubicación y presupuesto', icon: Hammer },
      { href: '/admin/presupuestos', label: 'Presupuestos', description: 'Propuestas y presentaciones', icon: FileText },
    ],
  },
  {
    id: 'access', label: 'Acceso personal', icon: ShieldCheck,
    items: [
      { href: '/admin/sesiones', label: 'Sesiones & dispositivos', description: 'Actividad, IP y dispositivos', icon: Activity },
      { href: '/admin/seguridad', label: 'Seguridad', description: 'Passkeys y políticas de acceso', icon: KeyRound },
      { href: '/admin/perfil', label: 'Perfil administrador', description: 'Cuenta y presentación', icon: User },
    ],
  },
  {
    id: 'system', label: 'Sistema & operación', icon: Settings,
    items: [
      { href: '/admin/integraciones', label: 'Integraciones', description: 'APIs y conexiones', icon: Link2 },
      { href: '/admin/estado', label: 'Estado del sistema', description: 'Salud del CMS y base de datos', icon: Activity },
      { href: '/admin/errores', label: 'Errores', description: 'Fallos capturados', icon: Terminal },
      { href: '/admin/configuracion', label: 'Configuración', description: 'Negocio y plataforma', icon: Settings },
    ],
  },
  {
    id: 'root', label: 'Root · plataforma', icon: ShieldCheck, rootOnly: true,
    items: [
      { href: '/admin/saas', label: 'Fabrick SaaS', description: 'Tenants, planes y onboarding', icon: Boxes },
      { href: '/admin/equipo', label: 'Equipo & permisos', description: 'Roles, accesos y aprobaciones', icon: Users },
      { href: '/admin/invitaciones', label: 'Invitaciones demo', description: 'Accesos temporales de demostración', icon: Send },
      { href: '/admin/diagnostico', label: 'Diagnóstico Root', description: 'Entorno, tablas y conectividad crítica', icon: Gauge },
      { href: '/admin/vercel-logs', label: 'Vercel & logs', description: 'Deployments y runtime', icon: Terminal },
      { href: '/admin/setup', label: 'Setup & base de datos', description: 'Verificación de tablas y entorno', icon: Terminal },
      { href: '/admin/sql', label: 'Terminal SQL', description: 'Operaciones directas de base de datos', icon: Terminal },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((section) => section.items);
const normalizePath = (pathname: string) => pathname.split('?')[0].replace(/\/$/, '') || '/';
const itemIsActive = (pathname: string, item: NavItem) => {
  const current = normalizePath(pathname);
  const target = normalizePath(item.href);
  return item.exact ? current === target : current === target || current.startsWith(`${target}/`);
};
const pageTitle = (pathname: string) => {
  const current = normalizePath(pathname);
  const exact = ALL_ITEMS.find((item) => normalizePath(item.href) === current);
  if (exact) return exact.label;
  const parent = [...ALL_ITEMS].sort((a, b) => b.href.length - a.href.length).find((item) => current.startsWith(`${normalizePath(item.href)}/`));
  if (parent) return parent.label;
  return (current.split('/').filter(Boolean).at(-1) || 'Admin').replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};
const sectionForPath = (pathname: string) => NAV.find((section) => section.items.some((item) => itemIsActive(pathname, item)))?.label ?? 'Administración';

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/admin';
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [role, setRole] = useState<AdminRole | null>(null);

  useAdminIdleLogout(30 * 60 * 1000);
  const authScreen = pathname === '/admin/login' || pathname.startsWith('/admin/plan-suspendido');
  const availableNav = useMemo(
    () => NAV.filter((section) => !section.rootOnly || role === 'superadmin'),
    [role],
  );

  useEffect(() => {
    if (authScreen) return;
    let cancelled = false;
    void fetch('/api/admin/me', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { rol?: AdminRole } | null) => {
        if (!cancelled) setRole(data?.rol ?? 'admin');
      })
      .catch(() => {
        if (!cancelled) setRole('admin');
      });
    return () => { cancelled = true; };
  }, [authScreen]);

  useEffect(() => {
    setMobileOpen(false);
    const active = availableNav.find((section) => section.items.some((item) => itemIsActive(pathname, item)));
    if (active) setOpenSections((value) => ({ ...value, [active.id]: true }));
  }, [pathname, availableNav]);

  useEffect(() => {
    if (window.localStorage.getItem('fabrick-admin-sidebar-collapsed') === '1') setCollapsed(true);
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es');
    if (!needle) return availableNav;
    return availableNav.map((section) => ({
      ...section,
      items: section.items.filter((item) => `${item.label} ${item.description ?? ''} ${section.label}`.toLocaleLowerCase('es').includes(needle)),
    })).filter((section) => section.items.length > 0);
  }, [availableNav, query]);

  function toggleCollapse() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem('fabrick-admin-sidebar-collapsed', next ? '1' : '0');
      return next;
    });
  }

  async function logout() {
    try { await fetch('/api/admin/logout', { method: 'POST' }); }
    finally { router.replace('/admin/login'); router.refresh(); }
  }

  if (authScreen) return <>{children}</>;

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`fabrick-admin-sidebar ${collapsed && !mobile ? 'is-collapsed' : ''} ${mobile ? 'is-mobile' : ''}`} aria-label="Navegación administrativa">
      <div className="fabrick-sidebar-brand">
        <Link href="/admin" className="fabrick-brand-link" aria-label="Ir al centro de control"><BrandMark className="fabrick-brand-mark" /></Link>
        {(!collapsed || mobile) && <div className="fabrick-brand-copy"><strong>{role === 'superadmin' ? 'Root' : 'Admin'}</strong><span>Soluciones Fabrick</span></div>}
        {mobile ? (
          <button className="fabrick-icon-button" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú"><X size={18} /></button>
        ) : (
          <button className="fabrick-icon-button fabrick-collapse-button" onClick={toggleCollapse} aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>
        )}
      </div>

      {(!collapsed || mobile) && <div className="fabrick-sidebar-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar módulo…" aria-label="Buscar módulo" />{query && <button onClick={() => setQuery('')} aria-label="Limpiar búsqueda"><X size={14} /></button>}</div>}

      <nav className="fabrick-sidebar-nav">
        {filtered.map((section) => {
          const SectionIcon = section.icon;
          const activeSection = section.items.some((item) => itemIsActive(pathname, item));
          const open = query ? true : (openSections[section.id] ?? activeSection ?? section.id === 'overview');
          return (
            <div className={`fabrick-nav-section ${activeSection ? 'is-active-section' : ''}`} key={section.id}>
              {collapsed && !mobile ? (
                <div className="fabrick-collapsed-group"><span className="fabrick-collapsed-group-icon" title={section.label}><SectionIcon size={16} /></span>{section.items.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={`fabrick-nav-item compact ${itemIsActive(pathname, item) ? 'is-active' : ''}`} title={item.label}><Icon size={18} /></Link>; })}</div>
              ) : (
                <>
                  <button type="button" className="fabrick-nav-section-trigger" onClick={() => setOpenSections((value) => ({ ...value, [section.id]: !open }))} aria-expanded={open}><span><SectionIcon size={15} />{section.label}</span>{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
                  {open && <div className="fabrick-nav-items">{section.items.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={`fabrick-nav-item ${itemIsActive(pathname, item) ? 'is-active' : ''}`}><span className="fabrick-nav-icon"><Icon size={17} /></span><span className="fabrick-nav-copy"><strong>{item.label}</strong>{item.description && <small>{item.description}</small>}</span></Link>; })}</div>}
                </>
              )}
            </div>
          );
        })}
      </nav>

      <div className="fabrick-sidebar-footer">
        {(!collapsed || mobile) && <Link href="/" target="_blank" className="fabrick-sidebar-site-link"><Globe2 size={16} /><span>Ver sitio público</span></Link>}
        <button className="fabrick-sidebar-logout" onClick={() => void logout()} title="Cerrar sesión"><LogOut size={17} />{(!collapsed || mobile) && <span>Cerrar sesión</span>}</button>
      </div>
    </aside>
  );

  return (
    <div data-admin-frame className={`fabrick-admin-frame ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="fabrick-desktop-sidebar"><Sidebar /></div>
      {mobileOpen && <div className="fabrick-mobile-sidebar-layer" role="dialog" aria-modal="true"><button className="fabrick-mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" /><Sidebar mobile /></div>}
      <div className="fabrick-admin-workspace">
        <header className="fabrick-admin-topbar" data-admin-header>
          <div className="fabrick-topbar-left"><button className="fabrick-mobile-menu fabrick-icon-button" onClick={() => setMobileOpen(true)} aria-label="Abrir menú"><Menu size={19} /></button><div className="fabrick-page-heading"><span>{sectionForPath(pathname)}</span><h1>{pageTitle(pathname)}</h1></div></div>
          <div className="fabrick-topbar-actions"><Link href="/admin/intelligence/today" className="fabrick-intelligence-shortcut"><Sparkles size={15} /><span>Prioridades de hoy</span></Link><Link href="/admin/configuracion" className="fabrick-icon-button" aria-label="Configuración"><Settings size={18} /></Link></div>
        </header>
        <div className="fabrick-admin-notices"><WhatsNewBanner /><DemoSessionTracker /></div>
        <main className="fabrick-admin-content" data-admin-content>{children}</main>
      </div>
    </div>
  );
}

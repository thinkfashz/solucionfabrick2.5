'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle, BarChart3, BookOpen, Bot, Boxes, Cloud, Cpu, Database, Eye,
  FileText, Hammer, Image as ImageIcon, Inbox, LayoutGrid, Link2, LogOut,
  Mail, Megaphone, Newspaper, Package, Radio, Search, Send, Settings, ShieldCheck,
  ShoppingCart, Sparkles, Star, Stethoscope, Store, Tag, Terminal,
  TrendingDown, Truck, Telescope, User, Users, Video, Wallet, X, Plus,
  MessageCircle, KeyRound, Activity, Scan, Receipt, FlaskConical, Plug, Rocket,
  ChevronRight, Palette,
} from 'lucide-react';
import { FabrickPeakIcon } from '@/components/FabrickBrandIcon';

/* ── Nav data ─────────────────────────────────────────────────── */
type NavLink = {
  href: string;
  label: string;
  description: string;
  icon: typeof Package;
  superadminOnly?: boolean;
  highlight?: boolean;
  comingSoon?: boolean;
};

export const navSections: { title: string; links: NavLink[] }[] = [
  {
    title: 'Visión general',
    links: [
      { href: '/admin', label: 'Centro de control', description: 'KPIs y salud operativa', icon: BarChart3 },
      { href: '/admin/modulos', label: 'Módulos y Apps', description: 'Explora y añade nuevos módulos', icon: LayoutGrid, highlight: true },
      { href: '/admin/saas', label: 'Mi SaaS', description: 'Clientes, instalación y plataforma', icon: Rocket, highlight: true },
      { href: '/admin/clientes', label: 'Clientes', description: 'Historial y recurrencia', icon: Users },
      { href: '/admin/reportes', label: 'Reportes', description: 'Ventas y métricas', icon: BarChart3 },
    ],
  },
  {
    title: 'Ventas y Operación',
    links: [
      { href: '/admin/productos', label: 'Catálogo de Productos', description: 'Gestión y stock', icon: Package },
      { href: '/admin/pedidos', label: 'Pedidos', description: 'Cobros y estados', icon: ShoppingCart },
      { href: '/admin/cotizaciones', label: 'Cotizaciones', description: 'Solicitudes y prospectos', icon: FileText },
      { href: '/admin/presupuestos', label: 'Presupuestos Rápidos', description: 'Generar link de cobro', icon: FileText, highlight: true },
      { href: '/admin/inventario', label: 'Inventario y Entregas', description: 'Bodega y envíos', icon: Truck },
    ],
  },
  {
    title: 'Contenido y Sitio',
    links: [
      { href: '/admin/home', label: 'Páginas y Banners', description: 'Gestor del sitio', icon: LayoutGrid },
      { href: '/admin/blog', label: 'Blog / Novedades', description: 'Entradas', icon: Newspaper },
      { href: '/admin/medios', label: 'Galería de Medios', description: 'Imágenes', icon: ImageIcon },
      { href: '/admin/proyectos', label: 'Portafolio de Obras', description: 'Obras terminadas', icon: Hammer },
    ],
  },
  {
    title: 'Centro de Inteligencia (IA)',
    links: [
      { href: '/admin/asistente-ia', label: 'Chat y Analítica IA', description: 'Habla con tus datos', icon: Sparkles, highlight: true },
      { href: '/admin/scrapegraph', label: 'Extracción Web IA', description: 'Extrae competencia', icon: Cpu, highlight: true },
      { href: '/admin/ai-developer', label: 'Agente Desarrollador', description: 'Mejora el código', icon: Bot, highlight: true },
      { href: '/admin/publicidad/coach', label: 'Coach Marketing IA', description: 'Optimiza Ads', icon: Megaphone, highlight: true },
    ],
  },
  {
    title: 'Canales y Marketing',
    links: [
      { href: '/admin/social/inbox', label: 'Inbox Unificado', description: 'Redes, correo y ML', icon: Inbox, highlight: true },
      { href: '/admin/correo', label: 'Campañas Correo', description: 'Newsletters', icon: Mail },
      { href: '/admin/publicar', label: 'Publicar Redes', description: 'Posteos', icon: Send },
      { href: '/admin/cupones', label: 'Promociones', description: 'Descuentos', icon: Tag },
    ],
  },
  {
    title: 'Configuración y Conexiones',
    links: [
      { href: '/admin/integraciones', label: 'Integraciones Globales', description: 'MercadoPago, Google, Meta, MercadoLibre', icon: Link2, highlight: true },
      { href: '/admin/herramientas', label: 'Herramientas', description: 'Base de datos, migraciones y utilidades', icon: Terminal },
      { href: '/admin/diseno', label: 'Motor de Diseño', description: 'Colores, logos y UI global', icon: Palette, highlight: true },
      { href: '/admin/configuracion', label: 'Ajustes del Negocio', description: 'Datos y cuenta', icon: Settings },
      { href: '/admin/equipo', label: 'Mi Equipo', description: 'Usuarios y roles', icon: ShieldCheck, superadminOnly: true },
      { href: '/admin/estado', label: 'Salud del Sistema', description: 'Logs y diagnóstico', icon: Activity },
    ],
  }
];

/* ── NavItem ──────────────────────────────────────────────────── */
function NavItem({
  href,
  label,
  icon: Icon,
  active,
  highlight,
  comingSoon,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof Package;
  active: boolean;
  highlight?: boolean;
  comingSoon?: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={[
        'group relative flex items-center gap-3 rounded-lg transition-all duration-150',
        collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2',
        active
          ? 'border-l-2 border-orange-500 bg-orange-500/10 text-orange-400'
          : 'border-l-2 border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
      ].join(' ')}
    >
      <Icon
        className={[
          'h-4 w-4 flex-shrink-0 transition-colors',
          active ? 'text-orange-400' : 'text-zinc-400 group-hover:text-zinc-200',
        ].join(' ')}
      />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate text-[13px] leading-none">{label}</span>
          {comingSoon && (
            <span className="flex-shrink-0 rounded-full bg-zinc-800 px-1.5 py-px text-[9px] text-zinc-500">
              Próximamente
            </span>
          )}
          {highlight && !comingSoon && (
            <span className="flex-shrink-0 rounded-full bg-orange-500/15 px-1.5 py-px text-[9px] text-orange-400">
              Nuevo
            </span>
          )}
        </>
      )}
    </Link>
  );
}

/* ── SidebarContent (exported for reuse in mobile drawer) ─────── */
export function StudioSidebarContent({
  collapsed,
  role,
  onNavigate,
  onLogout,
}: {
  collapsed: boolean;
  role: string | null;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const [logoText, setLogoText] = React.useState('SOLUCIONES FABRICK');

  React.useEffect(() => {
    // Load persisted logo from design engine
    const savedLogo = localStorage.getItem('admin-logo-text');
    if (savedLogo) setLogoText(savedLogo);

    const handleDesignUpdate = (e: any) => {
      if (e.detail?.logoText) {
        setLogoText(e.detail.logoText);
      }
    };
    window.addEventListener('admin-design-updated', handleDesignUpdate);
    return () => window.removeEventListener('admin-design-updated', handleDesignUpdate);
  }, []);

  const sections = navSections
    .map((s) => ({
      ...s,
      links: s.links.filter((l) => !l.superadminOnly || role === 'superadmin'),
    }))
    .filter((s) => s.links.length > 0);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Brand */}
      <div
        className={[
          'flex flex-shrink-0 items-center border-b px-3 py-3',
          'border-white/[0.08] dark:border-white/[0.08]',
          collapsed ? 'justify-center' : 'gap-2.5',
        ].join(' ')}
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-yellow-300/40 bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 shadow-[0_4px_14px_rgba(250,204,21,0.35)]">
          <FabrickPeakIcon size={18} />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: 'var(--admin-accent, #fde047)' }}>
              {logoText}
            </p>
            <p className="truncate text-[9px] uppercase tracking-[0.2em] text-zinc-500">Studio Admin</p>
          </div>
        )}
      </div>

      {/* Nav sections */}
      <div className="min-h-0 flex-1 overflow-y-auto py-2 scrollbar-hide">
        {sections.map((section) => (
          <div key={section.title} className="mb-1">
            {!collapsed && (
              <p className="mb-1 px-3 pt-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                {section.title}
              </p>
            )}
            {collapsed && <div className="my-1.5 mx-2 h-px bg-white/[0.06]" />}
            <div className={collapsed ? 'space-y-0.5 px-1.5' : 'space-y-0.5 px-2'}>
              {section.links.map((link) => {
                const hrefPath = link.href.split('?')[0];
                const isActive = pathname === hrefPath;
                return (
                  <NavItem
                    key={link.href}
                    href={link.href}
                    label={link.label}
                    icon={link.icon}
                    active={isActive}
                    highlight={link.highlight}
                    comingSoon={link.comingSoon}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="flex-shrink-0 border-t border-white/[0.08] p-2">
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={[
            'group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-zinc-400',
            'transition-colors hover:bg-red-500/10 hover:text-red-400',
            collapsed ? 'justify-center' : '',
          ].join(' ')}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );
}

/* ── Default export: the sidebar panel ───────────────────────── */
export function StudioSidebar({
  collapsed,
  role,
  onLogout,
}: {
  collapsed: boolean;
  role: string | null;
  onLogout: () => void;
}) {
  return (
    <aside
      data-studio-sidebar=""
      className={[
        'fixed left-0 top-0 z-30 hidden h-full flex-col',
        'border-r border-white/[0.08] bg-[#18181b]',
        'transition-[width] duration-200 ease-in-out lg:flex',
        collapsed ? 'w-14' : 'w-[272px]',
      ].join(' ')}
    >
      <StudioSidebarContent collapsed={collapsed} role={role} onLogout={onLogout} />
    </aside>
  );
}

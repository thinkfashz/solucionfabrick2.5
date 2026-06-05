'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle, BadgePercent, BarChart3, BookOpen, Bot, Boxes, Calculator, Cloud, Cpu, Database, Eye,
  FileText, Hammer, Image as ImageIcon, Inbox, Kanban, LayoutGrid, Link2, LogOut,
  Mail, Megaphone, Newspaper, Package, Radio, Search, Send, Settings, ShieldCheck,
  ShoppingCart, Sparkles, Star, Stethoscope, Store, Tag, Terminal,
  TrendingDown, TrendingUp, Truck, Telescope, User, Users, Video, Wallet, X, Plus,
  MessageCircle, KeyRound, Activity, Scan, Receipt, FlaskConical, Plug, Rocket,
  ChevronRight, Palette, Store as StoreIcon, HardHat, FileSpreadsheet,
  Globe, Paintbrush, Zap, Code2, LineChart, SlidersHorizontal, Book,
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
    title: 'Negocio',
    links: [
      { href: '/admin/crm', label: 'CRM & Pipeline', description: 'Oportunidades, leads y seguimiento de ventas', icon: Kanban, highlight: true },
      { href: '/admin/analytics', label: 'Analytics', description: 'Métricas de ventas y rendimiento del negocio', icon: TrendingUp, highlight: true },
      { href: '/admin/contabilidad', label: 'Contabilidad F29 / SII', description: 'Declaraciones mensuales de IVA y PPM', icon: Calculator, highlight: true },
      { href: '/admin/beneficios', label: 'Beneficios Fiscales', description: 'Ahorro tributario y créditos disponibles en Chile', icon: BadgePercent, highlight: true },
    ],
  },
  {
    title: 'Visión general',
    links: [
      { href: '/admin', label: 'Centro de control', description: 'Dashboard, KPIs y salud operativa', icon: BarChart3 },
      { href: '/admin/modulos', label: 'Todos los Módulos', description: 'Explora el mapa completo', icon: LayoutGrid, highlight: true },
      { href: '/admin/saas', label: 'Mi SaaS', description: 'Clientes SaaS, instalación y plataforma', icon: Rocket, highlight: true },
      { href: '/admin/clientes', label: 'Clientes y CRM', description: 'Directorio, historial y recurrencia', icon: Users },
      { href: '/admin/reportes', label: 'Reportes y Finanzas', description: 'Ventas, métricas y contabilidad', icon: LineChart },
    ],
  },
  {
    title: 'Ventas y E-Commerce',
    links: [
      { href: '/admin/productos', label: 'Catálogo de Productos', description: 'Gestión, SEO y variantes', icon: Package },
      { href: '/admin/productos/importar', label: 'Importar de Mercado Libre', description: 'Vista previa desde URL de ML Chile', icon: Link2 },
      { href: '/admin/pedidos', label: 'Pedidos / Órdenes', description: 'Cobros, tickets y estados', icon: ShoppingCart },
      { href: '/admin/cotizaciones', label: 'Cotizaciones Web', description: 'Solicitudes y prospectos web', icon: FileText },
      { href: '/admin/presupuestos', label: 'Presupuestos Rápidos', description: 'Links de cobro manuales', icon: Receipt, highlight: true },
      { href: '/admin/presupuestos/modelos-3d', label: 'Modelos 3D', description: 'Galería 3D para cotizaciones', icon: Boxes },
      { href: '/admin/presupuestos/videos', label: 'Videos presupuesto', description: 'Videos de presentación', icon: Video },
      { href: '/admin/inventario', label: 'Inventario de Bodega', description: 'Stock, release y trazabilidad', icon: Scan },
      { href: '/admin/inventario/scan', label: 'Escáner de inventario', description: 'Lectura de códigos de barras y QR', icon: Scan },
      { href: '/admin/entregas', label: 'Logística y Envíos', description: 'Tracking y despachos', icon: Truck },
      { href: '/admin/pagos', label: 'Historial de Pagos', description: 'Transacciones y pasarelas', icon: Wallet },
      { href: '/admin/cupones', label: 'Cupones y Descuentos', description: 'Códigos de descuento y promociones', icon: Tag, highlight: true },
      { href: '/admin/reviews', label: 'Reseñas', description: 'Opiniones y valoraciones de clientes', icon: Star, highlight: true },
    ],
  },
  {
    title: 'Contenido y Sitio Web',
    links: [
      { href: '/admin/home', label: 'Páginas y Estructura', description: 'Gestor de Banners y Secciones', icon: Globe },
      { href: '/admin/editor', label: 'Editor universal', description: 'Navbar, footer, checkout, 404 e inyección de código', icon: LayoutGrid, highlight: true },
      { href: '/admin/tienda', label: 'Tienda · Edición', description: 'Portada, banners y secciones del catálogo', icon: ShoppingCart },
      { href: '/admin/blog', label: 'Blog / Novedades', description: 'Artículos y SEO Content', icon: Newspaper },
      { href: '/admin/blog/nuevo', label: 'Nuevo post', description: 'Crear nueva entrada de blog', icon: Plus },
      { href: '/admin/blog/comments', label: 'Comentarios blog', description: 'Moderar comentarios del blog', icon: MessageCircle },
      { href: '/admin/medios', label: 'Galería de Medios', description: 'Imágenes y Archivos', icon: ImageIcon },
      { href: '/admin/medios?tab=cloudinary', label: 'Cloudinary', description: 'Subir, eliminar y estado en la nube', icon: Cloud, highlight: true },
      { href: '/admin/proyectos', label: 'Portafolio de Obras', description: 'Obras y servicios terminados', icon: HardHat },
      { href: '/admin/materiales', label: 'Materiales 3D', description: 'Gestor del visualizador', icon: Boxes },
    ],
  },
  {
    title: 'Inteligencia Artificial',
    links: [
      { href: '/admin/asistente-ia', label: 'Chat Analítico IA', description: 'Habla con la base de datos', icon: Sparkles, highlight: true },
      { href: '/admin/scrapegraph', label: 'ScrapeGraph IA', description: 'Extrae datos estructurados de cualquier web con IA', icon: Cpu, highlight: true },
      { href: '/admin/ai-developer', label: 'Agente Code/Dev', description: 'Mejora código del sitio con IA', icon: Bot, highlight: true },
      { href: '/admin/publicidad/coach', label: 'Marketing Coach IA', description: 'Mejora de pauta Ads con IA', icon: Zap, highlight: true },
      { href: '/admin/agente', label: 'Agente IA · Playwright', description: 'Navega internet, busca precios y analiza competencia', icon: Sparkles, highlight: true },
      { href: '/admin/video-engine', label: 'Fabrick Studio IA', description: 'Genera guiones, escenas y previews HTML con IA', icon: Video, highlight: true },
      { href: '/admin/modelos-ia', label: 'Prueba de IAs gratuitas', description: 'Diagnóstico en vivo — testea qué modelos funcionan', icon: FlaskConical, highlight: true },
      { href: '/admin/ia-config', label: 'Laboratorio de IA', description: 'Configurar modelos y APIs', icon: FlaskConical },
    ],
  },
  {
    title: 'Marketing y Omnicanalidad',
    links: [
      { href: '/admin/social/inbox', label: 'Inbox Unificado', description: 'Mensajes FB, IG, Correo y ML', icon: Inbox, highlight: true },
      { href: '/admin/social', label: 'Social Hub', description: 'Hub de redes sociales y mensajería', icon: Inbox },
      { href: '/admin/ml', label: 'MercadoLibre Hub', description: 'Publicaciones, pedidos, preguntas y precios', icon: Store, highlight: true },
      { href: '/admin/ml/buscar', label: 'Buscador ML', description: 'Buscar en catálogo de ML Chile', icon: Search },
      { href: '/admin/ml/publicaciones', label: 'Mis publicaciones ML', description: 'Gestión de listings propios', icon: Store },
      { href: '/admin/ml/pedidos', label: 'Pedidos ML', description: 'Sincronizar ventas de ML', icon: ShoppingCart },
      { href: '/admin/ml/preguntas', label: 'Preguntas ML', description: 'Responder preguntas de compradores', icon: MessageCircle },
      { href: '/admin/ml/precios', label: 'Monitor de precios ML', description: 'Comparar precios vs. competencia', icon: TrendingDown },
      { href: '/admin/correo', label: 'Campañas Correo', description: 'Newsletters y Mailing vía Resend', icon: Mail, highlight: true },
      { href: '/admin/newsletter', label: 'Boletín', description: 'Suscriptores y campañas programables', icon: Newspaper, highlight: true },
      { href: '/admin/publicar', label: 'Publicar Redes', description: 'Programar posteos sociales', icon: Send },
      { href: '/admin/publicidad', label: 'Publicidad', description: 'Meta Ads y campañas', icon: Megaphone },
      { href: '/admin/publicidad/nuevo', label: 'Nueva campaña', description: 'Crear campaña publicitaria', icon: Plus },
      { href: '/admin/inteligencia-mercado', label: 'Inteligencia de mercado', description: 'Referentes, tendencias y SEO con IA', icon: Telescope, highlight: true },
    ],
  },
  {
    title: 'Sistema y Avanzado',
    links: [
      { href: '/admin/integraciones', label: 'Centro de Integraciones', description: 'MercadoPago, Meta, APIs', icon: Plug, highlight: true },
      { href: '/admin/integraciones/marketplace', label: 'Marketplace de extensiones', description: 'Apps, snippets, webhooks y OAuth', icon: Boxes, highlight: true },
      { href: '/admin/diseno', label: 'Motor de Diseño', description: 'Theme, colores y marca', icon: Palette, highlight: true },
      { href: '/admin/configuracion', label: 'Ajustes de Negocio', description: 'Datos legales y configuración', icon: SlidersHorizontal },
      { href: '/admin/estado', label: 'Monitor del Sistema', description: 'Salud, logs y diagnóstico', icon: Activity },
      { href: '/admin/diagnostico', label: 'Diagnóstico de APIs', description: 'Variables, tablas y servicios críticos', icon: Stethoscope, highlight: true },
      { href: '/admin/errores', label: 'Monitor de Errores', description: 'Fallos capturados de las rutas API', icon: AlertTriangle },
      { href: '/admin/vercel-logs', label: 'Logs de Vercel', description: 'Build + runtime logs del deployment', icon: Terminal },
      { href: '/admin/monitor', label: 'Monitor en tiempo real', description: 'CPU, RAM, latencia y health checks', icon: Activity, highlight: true },
      { href: '/admin/observatory', label: 'Observatory', description: 'Red en tiempo real 3D', icon: Radio },
      { href: '/admin/manual', label: 'Manual', description: 'Guía técnica de la app', icon: BookOpen, highlight: true },
      { href: '/admin/envios', label: 'Tarifas de Envío', description: 'Costos por región y transportista', icon: Truck },
      { href: '/admin/extensions', label: 'Extensiones y Webhooks', description: 'Snippets, webhooks, OAuth y signing keys', icon: Plug, highlight: true },
      { href: '/admin/facturas', label: 'Facturas DTE', description: 'Documentos tributarios y SII', icon: Receipt },
      { href: '/admin/seguridad', label: 'Seguridad · Passkeys', description: 'Acceso con huella digital o Face ID', icon: ShieldCheck, highlight: true },
      { href: '/admin/center', label: 'Centro de mando', description: 'Vista unificada de operaciones', icon: LayoutGrid },
      { href: '/admin/acceso-demo', label: 'Acceso demo', description: 'Enlace de demostración temporal', icon: Eye },
      { href: '/admin/sql', label: 'Explorador SQL', description: 'Acceso directo a la base de datos', icon: Database, superadminOnly: true },
      { href: '/admin/testing', label: 'Testing', description: 'Suite de pruebas y smoke tests', icon: FlaskConical },
      { href: '/admin/setup', label: 'Setup', description: 'Verificar tablas InsForge', icon: Database, superadminOnly: true },
      { href: '/admin/equipo', label: 'Mi Equipo (Roles)', description: 'Accesos y seguridad', icon: ShieldCheck, superadminOnly: true },
    ],
  },
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

    const handleDesignUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ logoText?: string }>).detail;
      if (detail?.logoText) {
        setLogoText(detail.logoText);
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

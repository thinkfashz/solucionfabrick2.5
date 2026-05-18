'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle, BarChart3, BookOpen, Boxes, Cloud, Database, ExternalLink, Eye,
  FileText, Hammer, Image as ImageIcon, Inbox, LayoutGrid, Link2, LogOut,
  Megaphone, Newspaper, Package, Radio, Search, Send, Settings, ShieldCheck,
  ShoppingCart, Sparkles, Star, Stethoscope, Store, Tag, Terminal,
  TrendingDown, Truck, Telescope, Users, Video, Wallet, X, Plus,
  MessageCircle, KeyRound, Activity, Scan, Receipt, FlaskConical, Plug, Rocket,
  ChevronRight,
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

const navSections: { title: string; links: NavLink[] }[] = [
  {
    title: 'Visión general',
    links: [
      { href: '/admin', label: 'Centro de control', description: 'KPIs y salud operativa', icon: BarChart3 },
      { href: '/admin/modulos', label: 'Centro de módulos', description: 'Mapa modular completo del admin', icon: LayoutGrid, highlight: true },
      { href: '/admin/saas', label: 'Mi SaaS', description: 'Clientes, instalación y gestión de la plataforma', icon: Rocket, highlight: true },
      { href: '/admin/activar', label: 'Activar plataforma', description: 'Variables de entorno, servicios y estado de conexiones', icon: ShieldCheck },
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
      { href: '/admin/presupuestos', label: 'Presupuestos · 5 días', description: 'Generar link autodestruible y enviar al cliente', icon: FileText, highlight: true },
      { href: '/admin/entregas', label: 'Entregas', description: 'Seguimiento logístico', icon: Truck },
      { href: '/admin/inventario', label: 'Inventario', description: 'Stock, escáner y movimientos de bodega', icon: Scan },
      { href: '/admin/inventario/scan', label: 'Escáner de inventario', description: 'Lectura de códigos de barras y QR', icon: Scan },
      { href: '/admin/clientes', label: 'Clientes', description: 'Historial y recurrencia', icon: Users },
      { href: '/admin/cupones', label: 'Cupones y Descuentos', description: 'Códigos de descuento y promociones', icon: Tag, highlight: true },
      { href: '/admin/reviews', label: 'Reseñas', description: 'Opiniones y valoraciones de clientes', icon: Star, highlight: true },
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
      { href: '/admin/ai-developer', label: 'Fabrick AI Developer', description: 'Chat real, proveedores IA y herramientas Git seguras', icon: Sparkles, highlight: true },
      { href: '/admin/publicidad', label: 'Publicidad', description: 'Meta Ads', icon: Megaphone },
      { href: '/admin/publicidad/coach', label: 'Coach de campañas', description: 'Agente IA: analizar, sugerir, optimizar', icon: Sparkles, highlight: true },
      { href: '/admin/video-engine', label: 'Fabrick Studio IA', description: 'Genera guiones, escenas y previews HTML con IA', icon: Video, highlight: true },
      { href: '/admin/publicar', label: 'Publicar', description: 'Posts para redes sociales', icon: Send },
      { href: '/admin/newsletter', label: 'Boletín', description: 'Suscriptores + campañas de construcción programables', icon: Newspaper, highlight: true },
      { href: '/admin/asistente-ia', label: 'Asistente IA', description: 'Chat con OpenRouter (gratis y de pago) + análisis del código', icon: Sparkles, highlight: true },
      { href: '/admin/ml', label: 'MercadoLibre', description: 'Publicaciones, pedidos, preguntas y precios', icon: Store, highlight: true },
      { href: '/admin/ml/buscar', label: 'Buscador ML', description: 'Buscar en catálogo de ML Chile', icon: Search },
      { href: '/admin/ml/publicaciones', label: 'Mis publicaciones ML', description: 'Gestión de listings propios', icon: Store },
      { href: '/admin/ml/pedidos', label: 'Pedidos ML', description: 'Sincronizar ventas de ML', icon: ShoppingCart },
      { href: '/admin/ml/preguntas', label: 'Preguntas ML', description: 'Responder preguntas de compradores', icon: MessageCircle },
      { href: '/admin/ml/precios', label: 'Monitor de precios ML', description: 'Comparar precios vs. competencia', icon: TrendingDown },
      { href: '/admin/inteligencia-mercado', label: 'Inteligencia de mercado', description: 'Buscar referentes, tendencias, productos ganadores y SEO con IA', icon: Telescope, highlight: true },
      { href: '/admin/social', label: 'Social', description: 'Hub de redes sociales y mensajería', icon: Inbox },
      { href: '/admin/social/inbox', label: 'Inbox social', description: 'Mensajes de Instagram, FB, WhatsApp y ML', icon: Inbox, highlight: true },
      { href: '/admin/integraciones', label: 'Centro de integraciones', description: 'Conectar, probar y desactivar APIs', icon: Link2, highlight: true },
      { href: '/admin/integraciones/marketplace', label: 'Marketplace de extensiones', description: 'Apps, snippets, webhooks y OAuth', icon: Boxes, highlight: true },
      { href: '/admin/configuracion', label: 'Configuración', description: 'Datos del negocio y acceso admin', icon: Settings },
    ],
  },
  {
    title: 'Sistema',
    links: [
      { href: '/admin/estado', label: 'Estado del sistema', description: 'Diagnóstico CMS, BD, env e integraciones', icon: Stethoscope },
      { href: '/admin/diagnostico', label: 'Diagnóstico de APIs', description: 'Variables, tablas y servicios críticos', icon: Stethoscope, highlight: true },
      { href: '/admin/errores', label: 'Monitor de Errores', description: 'Fallos capturados de las rutas API', icon: AlertTriangle },
      { href: '/admin/vercel-logs', label: 'Logs de Vercel', description: 'Build + runtime logs del deployment', icon: Terminal },
      { href: '/admin/monitor', label: 'Monitor del sistema', description: 'CPU, RAM, latencia y health checks en tiempo real', icon: Activity, highlight: true },
      { href: '/admin/manual', label: 'Manual', description: 'Guía técnica de la app', icon: BookOpen, highlight: true },
      { href: '/admin/observatory', label: 'Observatory', description: 'Red en tiempo real 3D', icon: Radio },
      { href: '/admin/envios', label: 'Tarifas de Envío', description: 'Costos por región y transportista', icon: Truck },
      { href: '/admin/sql', label: 'Terminal SQL', description: 'Ejecutar SQL en InsForge', icon: Database },
      { href: '/admin/testing', label: 'Testing', description: 'Suite de pruebas y smoke tests', icon: FlaskConical },
      { href: '/admin/setup', label: 'Setup', description: 'Verificar tablas InsForge', icon: Database, superadminOnly: true },
      { href: '/admin/equipo', label: 'Equipo', description: 'Roles, invitaciones y aprobaciones', icon: ShieldCheck, superadminOnly: true },
    ],
  },
  {
    title: 'Seguridad & Claves',
    links: [
      { href: '/admin/seguridad', label: 'Seguridad · Passkeys', description: 'Acceso con huella digital o Face ID', icon: ShieldCheck, highlight: true },
      { href: '/admin/integraciones', label: 'Credenciales oficiales', description: 'API keys, proveedores y pruebas de conexión', icon: KeyRound, highlight: true },
      { href: '/admin/extensions', label: 'Extensiones y Webhooks', description: 'Snippets, webhooks, OAuth y signing keys', icon: Plug, highlight: true },
      { href: '/admin/facturas', label: 'Facturas DTE', description: 'Documentos tributarios y SII', icon: Receipt },
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
            <p className="truncate text-[11px] font-black uppercase tracking-[0.22em] text-yellow-300">
              SOLUCIONES FABRICK
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

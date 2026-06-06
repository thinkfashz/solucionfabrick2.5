'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle, BadgePercent, BarChart3, BookOpen, Bot, Boxes, Calculator, Cloud, Cpu, Database, Eye,
  FileText, Hammer, Image as ImageIcon, Inbox, Kanban, LayoutGrid, Link2, LogOut,
  Mail, Megaphone, Newspaper, Package, Radio, Search, Send, Settings, ShieldCheck,
  ShoppingCart, Sparkles, Star, Stethoscope, Store, Tag, Terminal,
  TrendingDown, TrendingUp, Truck, Telescope, User, Users, Video, Wallet, X, Plus,
  MessageCircle, KeyRound, Activity, Scan, Receipt, FlaskConical, Plug, Rocket,
  ChevronRight, Palette, HardHat, FileSpreadsheet,
  Globe, Paintbrush, Zap, Code2, LineChart, SlidersHorizontal, Book,
} from 'lucide-react';
import { FabrickPeakIcon } from '@/components/FabrickBrandIcon';

/* ── Section color configuration ─────────────────────────────── */
type SectionColor = {
  label: string;
  header: string;
  badge: string;
  iconBg: string;
  iconColor: string;
  hoverBg: string;
  pillBg: string;
  pillText: string;
  divider: string;
};

const SECTION_COLORS: Record<string, SectionColor> = {
  'Perfil & Cuenta': {
    label: 'amber',
    header: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
    hoverBg: 'hover:bg-amber-500/8',
    pillBg: 'bg-amber-500/20',
    pillText: 'text-amber-400',
    divider: 'bg-amber-500/20',
  },
  'Visión general': {
    label: 'zinc',
    header: 'text-zinc-300',
    badge: 'bg-zinc-700/60 text-zinc-300 border border-zinc-600/40',
    iconBg: 'bg-zinc-700/60',
    iconColor: 'text-zinc-300',
    hoverBg: 'hover:bg-white/5',
    pillBg: 'bg-zinc-700/60',
    pillText: 'text-zinc-300',
    divider: 'bg-zinc-700/40',
  },
  'Negocio': {
    label: 'sky',
    header: 'text-sky-400',
    badge: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
    iconBg: 'bg-sky-500/15',
    iconColor: 'text-sky-400',
    hoverBg: 'hover:bg-sky-500/8',
    pillBg: 'bg-sky-500/20',
    pillText: 'text-sky-400',
    divider: 'bg-sky-500/20',
  },
  'Ventas y E-Commerce': {
    label: 'emerald',
    header: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
    hoverBg: 'hover:bg-emerald-500/8',
    pillBg: 'bg-emerald-500/20',
    pillText: 'text-emerald-400',
    divider: 'bg-emerald-500/20',
  },
  'Contenido y Sitio Web': {
    label: 'violet',
    header: 'text-violet-400',
    badge: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-400',
    hoverBg: 'hover:bg-violet-500/8',
    pillBg: 'bg-violet-500/20',
    pillText: 'text-violet-400',
    divider: 'bg-violet-500/20',
  },
  'Inteligencia Artificial': {
    label: 'violet',
    header: 'text-violet-300',
    badge: 'bg-violet-500/25 text-violet-300 border border-violet-400/30',
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-300',
    hoverBg: 'hover:bg-violet-500/8',
    pillBg: 'bg-violet-600/30',
    pillText: 'text-violet-300',
    divider: 'bg-violet-500/20',
  },
  'Marketing y Omnicanalidad': {
    label: 'indigo',
    header: 'text-indigo-400',
    badge: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
    iconBg: 'bg-indigo-500/15',
    iconColor: 'text-indigo-400',
    hoverBg: 'hover:bg-indigo-500/8',
    pillBg: 'bg-indigo-500/20',
    pillText: 'text-indigo-400',
    divider: 'bg-indigo-500/20',
  },
  'Sistema y Avanzado': {
    label: 'rose',
    header: 'text-rose-400',
    badge: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    iconBg: 'bg-rose-500/15',
    iconColor: 'text-rose-400',
    hoverBg: 'hover:bg-rose-500/8',
    pillBg: 'bg-rose-500/20',
    pillText: 'text-rose-400',
    divider: 'bg-rose-500/20',
  },
  'Seguridad & Claves': {
    label: 'amber',
    header: 'text-amber-500',
    badge: 'bg-amber-500/20 text-amber-500 border border-amber-500/30',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-500',
    hoverBg: 'hover:bg-amber-500/8',
    pillBg: 'bg-amber-500/20',
    pillText: 'text-amber-500',
    divider: 'bg-amber-500/20',
  },
};

const DEFAULT_SECTION_COLOR: SectionColor = {
  label: 'zinc',
  header: 'text-zinc-400',
  badge: 'bg-zinc-700/60 text-zinc-400 border border-zinc-600/40',
  iconBg: 'bg-zinc-700/60',
  iconColor: 'text-zinc-400',
  hoverBg: 'hover:bg-white/5',
  pillBg: 'bg-zinc-700/60',
  pillText: 'text-zinc-400',
  divider: 'bg-zinc-700/40',
};

function getSectionColor(title: string): SectionColor {
  return SECTION_COLORS[title] ?? DEFAULT_SECTION_COLOR;
}

/* ── Pill label logic ─────────────────────────────────────────── */
const SECTION_PILL_LABELS: Record<string, string> = {
  'Inteligencia Artificial': 'IA',
  'Negocio': 'Pro',
  'Contenido y Sitio Web': 'Pro',
  'Sistema y Avanzado': 'Dev',
  'Marketing y Omnicanalidad': 'Pro',
  'Ventas y E-Commerce': 'Pro',
};

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
      { href: '/admin/editor', label: 'Editor de temas', description: 'Colores, tipografías y estilos globales del sitio', icon: Palette, highlight: true },
      { href: '/admin/editor?tab=home', label: 'Pantalla principal', description: 'Banners y secciones de la página de inicio', icon: LayoutGrid },
      { href: '/admin/editor?tab=tienda', label: 'Tienda · Edición', description: 'Portada, banners y secciones del catálogo', icon: ShoppingCart },
      { href: '/admin/editor?tab=estructura', label: 'Estructura del sitio', description: 'Navbar, footer, checkout, 404 e inyección de código', icon: Code2 },
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

/* ── Pulsing dot for highlighted items ───────────────────────── */
function PulsingDot({ color }: { color: string }) {
  const dotColor =
    color === 'sky' ? 'bg-sky-400' :
    color === 'emerald' ? 'bg-emerald-400' :
    color === 'violet' ? 'bg-violet-400' :
    color === 'indigo' ? 'bg-indigo-400' :
    color === 'rose' ? 'bg-rose-400' :
    'bg-amber-400';

  const pingColor =
    color === 'sky' ? 'bg-sky-400' :
    color === 'emerald' ? 'bg-emerald-400' :
    color === 'violet' ? 'bg-violet-400' :
    color === 'indigo' ? 'bg-indigo-400' :
    color === 'rose' ? 'bg-rose-400' :
    'bg-amber-400';

  return (
    <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${pingColor}`} />
      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotColor}`} />
    </span>
  );
}

/* ── NavItem ──────────────────────────────────────────────────── */
function NavItem({
  href,
  label,
  icon: Icon,
  active,
  highlight,
  comingSoon,
  collapsed,
  sectionColor,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof Package;
  active: boolean;
  highlight?: boolean;
  comingSoon?: boolean;
  collapsed: boolean;
  sectionColor: SectionColor;
  onNavigate?: () => void;
}) {
  const pillLabel = highlight && !comingSoon ? 'Pro' : undefined;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={[
        'group relative flex items-center gap-2.5 rounded-lg transition-all duration-150',
        collapsed ? 'justify-center px-0 py-2' : 'py-[5px] pr-2 pl-1',
        active
          ? 'border-l-2 border-amber-400 bg-amber-500/10 text-amber-300'
          : [
              'border-l-2 border-transparent text-zinc-400',
              sectionColor.hoverBg,
              'hover:text-zinc-100',
            ].join(' '),
      ].join(' ')}
    >
      {/* Icon container */}
      <div
        className={[
          'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-colors',
          active ? 'bg-amber-500/20' : sectionColor.iconBg,
        ].join(' ')}
      >
        <Icon
          className={[
            'h-3.5 w-3.5 flex-shrink-0 transition-colors',
            active ? 'text-amber-400' : sectionColor.iconColor,
          ].join(' ')}
        />
      </div>

      {!collapsed && (
        <>
          <span
            className={[
              'min-w-0 flex-1 truncate text-[12.5px] font-[500] leading-none transition-colors',
              active ? 'text-amber-300' : 'text-zinc-300 group-hover:text-zinc-100',
            ].join(' ')}
          >
            {label}
          </span>

          {/* Right badges / indicators */}
          {comingSoon && (
            <span className="flex-shrink-0 rounded-full bg-zinc-800 px-1.5 py-px text-[9px] font-medium text-zinc-500">
              Pronto
            </span>
          )}
          {highlight && !comingSoon && (
            <span
              className={[
                'flex-shrink-0 rounded-full px-1.5 py-px text-[9px] font-semibold tracking-wide',
                sectionColor.pillBg,
                sectionColor.pillText,
              ].join(' ')}
            >
              {SECTION_PILL_LABELS[/* resolved at render time via prop */'']}
            </span>
          )}
        </>
      )}

      {/* Active amber glow */}
      {active && (
        <span className="pointer-events-none absolute inset-0 rounded-lg bg-amber-400/5" />
      )}
    </Link>
  );
}

/* ── NavItem with section-aware pill label ────────────────────── */
function NavItemWithPill({
  href,
  label,
  icon: Icon,
  active,
  highlight,
  comingSoon,
  collapsed,
  sectionColor,
  sectionTitle,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof Package;
  active: boolean;
  highlight?: boolean;
  comingSoon?: boolean;
  collapsed: boolean;
  sectionColor: SectionColor;
  sectionTitle: string;
  onNavigate?: () => void;
}) {
  const pillLabel = SECTION_PILL_LABELS[sectionTitle] ?? 'Pro';

  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={[
        'group relative flex items-center gap-2.5 rounded-lg transition-all duration-150',
        collapsed ? 'justify-center px-0 py-2' : 'py-[5px] pr-2 pl-1',
        active
          ? 'border-l-2 border-amber-400 bg-amber-500/10 text-amber-300'
          : [
              'border-l-2 border-transparent text-zinc-400',
              sectionColor.hoverBg,
              'hover:text-zinc-100',
            ].join(' '),
      ].join(' ')}
    >
      {/* Icon container */}
      <div
        className={[
          'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-colors',
          active ? 'bg-amber-500/20' : sectionColor.iconBg,
        ].join(' ')}
      >
        <Icon
          className={[
            'h-3.5 w-3.5 flex-shrink-0 transition-colors',
            active ? 'text-amber-400' : sectionColor.iconColor,
          ].join(' ')}
        />
      </div>

      {!collapsed && (
        <>
          <span
            className={[
              'min-w-0 flex-1 truncate text-[12.5px] font-[500] leading-none transition-colors',
              active ? 'text-amber-300' : 'text-zinc-300 group-hover:text-zinc-100',
            ].join(' ')}
          >
            {label}
          </span>

          {comingSoon ? (
            <span className="flex-shrink-0 rounded-full bg-zinc-800 px-1.5 py-px text-[9px] font-medium text-zinc-500">
              Pronto
            </span>
          ) : highlight ? (
            <span
              className={[
                'flex-shrink-0 rounded-full px-1.5 py-px text-[9px] font-semibold tracking-wide',
                sectionColor.pillBg,
                sectionColor.pillText,
              ].join(' ')}
            >
              {pillLabel}
            </span>
          ) : null}
        </>
      )}

      {/* Active amber glow overlay */}
      {active && (
        <span className="pointer-events-none absolute inset-0 rounded-lg bg-amber-400/5" />
      )}
    </Link>
  );
}

/* ── Section header with badge ────────────────────────────────── */
function SectionHeader({
  title,
  color,
  collapsed,
}: {
  title: string;
  color: SectionColor;
  collapsed: boolean;
}) {
  if (collapsed) {
    return <div className={`my-1.5 mx-2 h-px ${color.divider}`} />;
  }

  return (
    <div className="mb-1 flex items-center gap-2 px-2 pt-4 pb-0.5">
      <p
        className={[
          'text-[10px] font-bold uppercase tracking-[0.18em]',
          color.header,
        ].join(' ')}
      >
        {title}
      </p>
      <span
        className={[
          'rounded px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide',
          color.badge,
        ].join(' ')}
      >
        {title === 'Inteligencia Artificial'
          ? 'IA'
          : title === 'Negocio'
          ? 'Biz'
          : title === 'Ventas y E-Commerce'
          ? 'Ops'
          : title === 'Contenido y Sitio Web'
          ? 'CMS'
          : title === 'Marketing y Omnicanalidad'
          ? 'Mkt'
          : title === 'Sistema y Avanzado'
          ? 'Sys'
          : title === 'Visión general'
          ? 'Hub'
          : title === 'Seguridad & Claves'
          ? 'Sec'
          : '—'}
      </span>
    </div>
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

      {/* ── Brand header ──────────────────────────────────────────── */}
      <div
        className={[
          'flex flex-shrink-0 items-center border-b px-3 py-3',
          'border-white/[0.07]',
          collapsed ? 'justify-center' : 'gap-2.5',
        ].join(' ')}
      >
        {/* Logo mark */}
        <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-yellow-300/40 bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 shadow-[0_4px_14px_rgba(250,204,21,0.35)]">
          <FabrickPeakIcon size={18} />
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[11px] font-black uppercase tracking-[0.22em]"
              style={{ color: 'var(--admin-accent, #fde047)' }}
            >
              {logoText}
            </p>
            <p className="truncate text-[9px] uppercase tracking-[0.2em] text-zinc-500">
              Studio Admin
            </p>
          </div>
        )}

        {/* Collapse indicator when expanded */}
        {!collapsed && (
          <div className="ml-auto flex-shrink-0">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-800/80 text-zinc-600">
              <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        )}
      </div>

      {/* ── Nav sections ──────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto py-1 scrollbar-hide">
        {sections.map((section) => {
          const color = getSectionColor(section.title);

          return (
            <div key={section.title} className="mb-0.5">
              <SectionHeader title={section.title} color={color} collapsed={collapsed} />

              <div className={collapsed ? 'space-y-0.5 px-1.5' : 'space-y-0 px-1.5'}>
                {section.links.map((link) => {
                  const hrefPath = link.href.split('?')[0];
                  const isActive = pathname === hrefPath;

                  return (
                    <NavItemWithPill
                      key={link.href}
                      href={link.href}
                      label={link.label}
                      icon={link.icon}
                      active={isActive}
                      highlight={link.highlight}
                      comingSoon={link.comingSoon}
                      collapsed={collapsed}
                      sectionColor={color}
                      sectionTitle={section.title}
                      onNavigate={onNavigate}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer: logout ────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-white/[0.07] p-2">
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={[
            'group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-[12.5px] font-[500]',
            'text-zinc-500 transition-all duration-150',
            'hover:bg-rose-500/10 hover:text-rose-400',
            collapsed ? 'justify-center' : '',
          ].join(' ')}
        >
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-zinc-800/80 transition-colors group-hover:bg-rose-500/20">
            <LogOut className="h-3.5 w-3.5 flex-shrink-0 transition-colors group-hover:text-rose-400" />
          </div>
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
        'border-r border-white/[0.07] bg-[#18181b]',
        'transition-[width] duration-200 ease-in-out lg:flex',
        collapsed ? 'w-14' : 'w-[272px]',
      ].join(' ')}
      style={{
        background: 'linear-gradient(180deg, #1c1c1f 0%, #18181b 40%, #17171a 100%)',
      }}
    >
      <StudioSidebarContent collapsed={collapsed} role={role} onLogout={onLogout} />
    </aside>
  );
}

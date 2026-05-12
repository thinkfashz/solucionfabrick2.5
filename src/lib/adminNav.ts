/**
 * Fuente única de verdad para la navegación del panel admin.
 * Importado por AdminShell (sidebar), AdminContextMenu (modal móvil) y
 * AdminCommandPalette (Cmd+K).
 */

import {
  AlertTriangle, BarChart3, BookOpen, Boxes, Cloud, Database, FileText,
  Hammer, Image as ImageIcon, Inbox, Key, LayoutGrid, Link2, Megaphone,
  MessageCircle, Newspaper, Package, Radio, Search, Send, Settings,
  ShieldCheck, ShoppingCart, Sparkles, Stethoscope, Store, Telescope,
  Terminal, TrendingDown, Truck, Users, Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavLink = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  superadminOnly?: boolean;
  highlight?: boolean;
};

export const navSections: { title: string; links: NavLink[] }[] = [
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
      { href: '/admin/presupuestos', label: 'Presupuestos · 5 días', description: 'Generar link autodestruible y enviar al cliente', icon: FileText, highlight: true },
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
      { href: '/admin/newsletter', label: 'Boletín', description: 'Suscriptores + campañas de construcción programables', icon: Newspaper, highlight: true },
      { href: '/admin/asistente-ia', label: 'Asistente IA', description: 'Chat con OpenRouter (gratis y de pago) + análisis del código', icon: Sparkles, highlight: true },
      { href: '/admin/ml', label: 'MercadoLibre', description: 'Publicaciones, pedidos, preguntas y precios', icon: Store, highlight: true },
      { href: '/admin/ml/buscar', label: 'Buscador ML', description: 'Buscar en catálogo de ML Chile', icon: Search },
      { href: '/admin/ml/publicaciones', label: 'Mis publicaciones ML', description: 'Gestión de listings propios', icon: Store },
      { href: '/admin/ml/pedidos', label: 'Pedidos ML', description: 'Sincronizar ventas de ML', icon: ShoppingCart },
      { href: '/admin/ml/preguntas', label: 'Preguntas ML', description: 'Responder preguntas de compradores', icon: MessageCircle },
      { href: '/admin/ml/precios', label: 'Monitor de precios ML', description: 'Comparar precios vs. competencia', icon: TrendingDown },
      { href: '/admin/inteligencia-mercado', label: 'Inteligencia de mercado', description: 'Buscar referentes (ML+Google), tendencias, productos ganadores y SEO con IA', icon: Telescope, highlight: true },
      { href: '/admin/social/inbox', label: 'Inbox social', description: 'Mensajes de Instagram, FB, WhatsApp y ML', icon: Inbox, highlight: true },
      { href: '/admin/integraciones', label: 'Centro de integraciones', description: 'Conectar, probar y desactivar APIs', icon: Link2, highlight: true },
      { href: '/admin/integraciones/marketplace', label: 'Marketplace de extensiones', description: 'Apps, snippets, webhooks y OAuth', icon: Boxes, highlight: true },
      { href: '/admin/configuracion', label: 'Configuración', description: 'Parámetros e integraciones', icon: Settings },
    ],
  },
  {
    title: 'Sistema',
    links: [
      { href: '/admin/estado', label: 'Estado del sistema', description: 'Diagnóstico CMS, BD, env e integraciones', icon: Stethoscope },
      { href: '/admin/env', label: 'Variables de entorno', description: 'Ver credenciales, estado de conexión y encriptación', icon: Key, highlight: true },
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

export const PATH_LABELS: Record<string, string> = {
  '/admin': 'Centro de control',
  '/admin/productos': 'Productos',
  '/admin/productos/nuevo': 'Nuevo producto',
  '/admin/productos/importar': 'Importar de Mercado Libre',
  '/admin/materiales': 'Materiales (Cotizador)',
  '/admin/proyectos': 'Proyectos',
  '/admin/pedidos': 'Pedidos',
  '/admin/pagos': 'Pagos · MercadoPago',
  '/admin/cotizaciones': 'Cotizaciones',
  '/admin/presupuestos': 'Presupuestos',
  '/admin/newsletter': 'Boletín',
  '/admin/asistente-ia': 'Asistente IA',
  '/admin/entregas': 'Entregas',
  '/admin/clientes': 'Clientes',
  '/admin/reportes': 'Reportes',
  '/admin/publicidad': 'Publicidad',
  '/admin/publicidad/nuevo': 'Nueva campaña',
  '/admin/publicidad/coach': 'Coach de campañas',
  '/admin/publicar': 'Publicar',
  '/admin/ml': 'MercadoLibre',
  '/admin/ml/buscar': 'Buscador ML',
  '/admin/ml/publicaciones': 'Mis publicaciones ML',
  '/admin/ml/pedidos': 'Pedidos ML',
  '/admin/ml/preguntas': 'Preguntas ML',
  '/admin/ml/precios': 'Monitor de precios ML',
  '/admin/inteligencia-mercado': 'Inteligencia de mercado',
  '/admin/social/inbox': 'Inbox social',
  '/admin/integraciones': 'Centro de integraciones',
  '/admin/integraciones/marketplace': 'Marketplace de extensiones',
  '/admin/configuracion': 'Configuración',
  '/admin/observatory': 'Observatory',
  '/admin/env': 'Variables de entorno',
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

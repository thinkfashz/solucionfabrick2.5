'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle, BarChart3, BookOpen, Bot, Boxes, Cloud, Cpu, Database,
  FileText, Hammer, Image as ImageIcon, Inbox, LayoutGrid, Link2, LogOut,
  Mail, Megaphone, Newspaper, Package, Radio, Search, Send, Settings, ShieldCheck,
  ShoppingCart, Sparkles, Star, Stethoscope, Store, Tag, Terminal,
  TrendingDown, Truck, Telescope, User, Users, Video, Wallet,
  MessageCircle, KeyRound, Activity, Scan, Receipt, FlaskConical, Plug, Rocket,
} from 'lucide-react';
import { FabrickPeakIcon } from '@/components/FabrickBrandIcon';

type NavLink = { href: string; label: string; description: string; icon: typeof Package; superadminOnly?: boolean; highlight?: boolean; comingSoon?: boolean };

export const navSections: { title: string; links: NavLink[] }[] = [
  { title: 'Perfil & Cuenta', links: [
    { href: '/admin/perfil', label: 'Perfil administrador', description: 'Foto, bio, contacto, redes y presentación', icon: User, highlight: true },
    { href: '/admin/sesiones', label: 'Sesiones y dispositivos', description: 'IPs, dispositivos y auditoría', icon: Activity, highlight: true },
    { href: '/admin/seguridad', label: 'Seguridad · Passkeys', description: 'Acceso con huella digital o Face ID', icon: KeyRound, highlight: true },
  ]},
  { title: 'Visión general', links: [
    { href: '/admin', label: 'Centro de control', description: 'KPIs y salud operativa', icon: BarChart3 },
    { href: '/admin/modulos', label: 'Centro de módulos', description: 'Mapa modular completo del admin', icon: LayoutGrid, highlight: true },
    { href: '/admin/analytics', label: 'Analytics', description: 'Métricas, visitas y rendimiento del negocio', icon: BarChart3, highlight: true },
    { href: '/admin/beneficios', label: 'Beneficios', description: 'Panel de beneficios, valor y ventajas comerciales', icon: Star, highlight: true },
    { href: '/admin/saas', label: 'Mi SaaS', description: 'Clientes, instalación y gestión de la plataforma', icon: Rocket, highlight: true },
    { href: '/admin/activar', label: 'Activar plataforma', description: 'Variables de entorno, servicios y estado de conexiones', icon: ShieldCheck },
  ]},
  { title: 'Operación', links: [
    { href: '/admin/productos', label: 'Productos', description: 'Catálogo y stock', icon: Package },
    { href: '/admin/productos/importar', label: 'Importar de Mercado Libre', description: 'Vista previa desde URL de ML Chile', icon: Link2 },
    { href: '/admin/materiales', label: 'Materiales (Cotizador)', description: 'Alimenta el cotizador en vivo', icon: Package },
    { href: '/admin/proyectos', label: 'Proyectos', description: 'Obras terminadas visibles al cliente', icon: Hammer },
    { href: '/admin/pedidos', label: 'Pedidos', description: 'Cobros y estados', icon: ShoppingCart },
    { href: '/admin/cotizaciones', label: 'Cotizaciones', description: 'Solicitudes de servicios y diseños 3D', icon: FileText },
    { href: '/admin/presupuestos', label: 'Presupuestos · 5 días', description: 'Generar link autodestruible y enviar al cliente', icon: FileText, highlight: true },
    { href: '/admin/motores/radier', label: 'Motor Radier 3D', description: 'Cubicación, formas L/U/C/T y presupuesto con link', icon: Hammer, highlight: true },
    { href: '/admin/motores/aire-acondicionado', label: 'Motor Aire AC', description: 'BTU, equipo, instalación y presupuesto automático', icon: Plug, highlight: true },
    { href: '/admin/entregas', label: 'Entregas', description: 'Seguimiento logístico', icon: Truck },
    { href: '/admin/inventario', label: 'Inventario', description: 'Stock, escáner y movimientos de bodega', icon: Scan },
    { href: '/admin/inventario/scan', label: 'Escáner de inventario', description: 'Lectura de códigos de barras y QR', icon: Scan },
    { href: '/admin/clientes', label: 'Clientes', description: 'Historial y recurrencia', icon: Users },
    { href: '/admin/cupones', label: 'Cupones y Descuentos', description: 'Códigos de descuento y promociones', icon: Tag, highlight: true },
    { href: '/admin/reviews', label: 'Reseñas', description: 'Opiniones y valoraciones de clientes', icon: Star, highlight: true },
  ]},
  { title: 'Finanzas & SII', links: [
    { href: '/admin/facturas', label: 'Facturas DTE', description: 'Boletas, facturas, notas de crédito y estado SII', icon: Receipt, highlight: true },
    { href: '/admin/contabilidad', label: 'Contabilidad F29', description: 'IVA, PPM, remanentes, contribuciones y comprobantes', icon: FileText, highlight: true },
    { href: '/admin/contabilidad/f12', label: 'F12 · Registro mensual', description: 'Control operativo de ventas, compras y respaldos', icon: BookOpen, highlight: true },
    { href: '/admin/contabilidad/f21', label: 'F21 · Pagos tributarios', description: 'Control de impuestos, obligaciones y comprobantes', icon: Wallet, highlight: true },
    { href: '/admin/pagos', label: 'Pagos · MercadoPago', description: 'Modo, latencia y KPIs de la pasarela', icon: Wallet, highlight: true },
    { href: '/admin/reportes', label: 'Reportes financieros', description: 'Ventas, métricas y totales del negocio', icon: BarChart3 },
    { href: '/admin/sql', label: 'Terminal SQL', description: 'Ejecutar SQL en InsForge', icon: Database },
  ]},
  { title: 'Contenido', links: [
    { href: '/admin/blog', label: 'Blog', description: 'Entradas, portadas y publicación', icon: Newspaper },
    { href: '/admin/home', label: 'Pantalla principal', description: 'Banners, secciones y orden', icon: LayoutGrid },
    { href: '/admin/editor', label: 'Editor universal', description: 'Navbar, footer, checkout, 404 e inyección de código', icon: LayoutGrid, highlight: true },
    { href: '/admin/paginas', label: 'Creador de páginas', description: 'HTMLs por nicho con token único y URL pública', icon: LayoutGrid, highlight: true },
    { href: '/admin/page-engine-21stdev', label: 'Page Engine 21st.dev', description: 'Crear páginas modulares con URL temporal y presupuesto conectado', icon: LayoutGrid, highlight: true },
    { href: '/admin/tienda', label: 'Tienda · Edición', description: 'Portada, banners y secciones del catálogo', icon: ShoppingCart },
    { href: '/admin/medios', label: 'Medios', description: 'Imágenes y biblioteca', icon: ImageIcon },
    { href: '/admin/medios?tab=cloudinary', label: 'Cloudinary', description: 'Subir, eliminar y estado en la nube', icon: Cloud, highlight: true },
  ]},
  { title: 'Expansión', links: [
    { href: '/admin/ia-config', label: 'Configuración IA', description: 'Proveedor activo, API key y modelo', icon: Bot, highlight: true },
    { href: '/admin/modelos-ia', label: 'Prueba de IAs gratuitas', description: 'Diagnóstico en vivo — testea qué modelos realmente funcionan', icon: FlaskConical, highlight: true },
    { href: '/admin/agente', label: 'Agente IA · Playwright', description: 'Navega internet, busca precios y analiza competencia', icon: Sparkles, highlight: true },
    { href: '/admin/ai-developer', label: 'Fabrick AI Developer', description: 'Chat real, proveedores IA y herramientas Git seguras', icon: Sparkles, highlight: true },
    { href: '/admin/correo', label: 'Correo · Resend', description: 'Bandeja de entrada/salida, estadísticas y Resend', icon: Mail, highlight: true },
    { href: '/admin/scrapegraph', label: 'ScrapeGraph IA', description: 'Extrae datos estructurados de cualquier web con IA', icon: Cpu, highlight: true },
    { href: '/admin/publicidad', label: 'Publicidad', description: 'Meta Ads', icon: Megaphone },
    { href: '/admin/publicidad/coach', label: 'Coach de campañas', description: 'Agente IA: analizar, sugerir, optimizar', icon: Sparkles, highlight: true },
    { href: '/admin/video-engine', label: 'Fabrick Studio IA', description: 'Genera guiones, escenas y previews HTML con IA', icon: Video, highlight: true },
    { href: '/admin/publicar', label: 'Publicar', description: 'Posts para redes sociales', icon: Send },
    { href: '/admin/newsletter', label: 'Boletín', description: 'Suscriptores + campañas de construcción programables', icon: Newspaper, highlight: true },
    { href: '/admin/asistente-ia', label: 'Asistente IA', description: 'Chat con OpenRouter + análisis del código', icon: Sparkles, highlight: true },
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
  ]},
  { title: 'Sistema', links: [
    { href: '/admin/estado', label: 'Estado del sistema', description: 'Diagnóstico CMS, BD, env e integraciones', icon: Stethoscope },
    { href: '/admin/diagnostico', label: 'Diagnóstico de APIs', description: 'Variables, tablas y servicios críticos', icon: Stethoscope, highlight: true },
    { href: '/admin/errores', label: 'Monitor de Errores', description: 'Fallos capturados de las rutas API', icon: AlertTriangle },
    { href: '/admin/vercel-logs', label: 'Logs de Vercel', description: 'Build + runtime logs del deployment', icon: Terminal },
    { href: '/admin/monitor', label: 'Monitor del sistema', description: 'CPU, RAM, latencia y health checks en tiempo real', icon: Activity, highlight: true },
    { href: '/admin/manual', label: 'Manual', description: 'Guía técnica de la app', icon: BookOpen, highlight: true },
    { href: '/admin/observatory', label: 'Observatory', description: 'Red en tiempo real 3D', icon: Radio },
    { href: '/admin/envios', label: 'Tarifas de Envío', description: 'Costos por región y transportista', icon: Truck },
    { href: '/admin/testing', label: 'Testing', description: 'Suite de pruebas y smoke tests', icon: FlaskConical },
    { href: '/admin/setup', label: 'Setup', description: 'Verificar tablas InsForge', icon: Database, superadminOnly: true },
    { href: '/admin/equipo', label: 'Equipo', description: 'Roles, invitaciones y aprobaciones', icon: ShieldCheck, superadminOnly: true },
  ]},
  { title: 'Seguridad & Claves', links: [
    { href: '/admin/seguridad', label: 'Seguridad · Passkeys', description: 'Acceso con huella digital o Face ID', icon: ShieldCheck, highlight: true },
    { href: '/admin/extensions', label: 'Extensiones y Webhooks', description: 'Snippets, webhooks, OAuth y signing keys', icon: Plug, highlight: true },
  ]},
];

function NavItem({ href, label, icon: Icon, active, highlight, comingSoon, collapsed, onNavigate }: { href: string; label: string; icon: typeof Package; active: boolean; highlight?: boolean; comingSoon?: boolean; collapsed: boolean; onNavigate?: () => void }) {
  return <Link href={href} onClick={onNavigate} title={collapsed ? label : undefined} className={['group relative flex items-center gap-3 rounded-lg transition-all duration-150', collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2', active ? 'border-l-2 border-[#ff8a1f] bg-[rgba(255,138,31,.12)] text-[#ffd54a]' : 'border-l-2 border-transparent text-[#9f8d74] hover:bg-[rgba(255,138,31,.09)] hover:text-[#fff1d6]'].join(' ')}><Icon className={['h-4 w-4 flex-shrink-0 transition-colors', active ? 'text-[#ffd54a]' : 'text-[#9f8d74] group-hover:text-[#dccab0]'].join(' ')}/>{!collapsed && <><span className="min-w-0 flex-1 truncate text-[13px] leading-none">{label}</span>{comingSoon && <span className="flex-shrink-0 rounded-full bg-[rgba(255,246,230,.06)] px-1.5 py-px text-[9px] text-[#9f8d74]">Próx.</span>}{highlight && !comingSoon && <span className="flex-shrink-0 rounded-full bg-[rgba(255,138,31,.14)] px-1.5 py-px text-[9px] text-[#ff8a1f]">Nuevo</span>}</>}</Link>;
}

export function StudioSidebarContent({ collapsed, role, onNavigate, onLogout }: { collapsed: boolean; role: string | null; onNavigate?: () => void; onLogout: () => void }) {
  const pathname = usePathname();
  const sections = navSections.map((s)=>({...s, links: s.links.filter((l)=>!l.superadminOnly || role === 'superadmin')})).filter((s)=>s.links.length>0);
  return <div className="flex h-full flex-col overflow-hidden"><div className={['flex flex-shrink-0 items-center border-b px-3 py-3 border-[rgba(255,246,230,.10)]', collapsed ? 'justify-center' : 'gap-2.5'].join(' ')}><div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[rgba(255,213,74,.30)]" style={{background:'linear-gradient(145deg,#fff1d6,#ff8a1f 52%,#ff4d00)',boxShadow:'0 4px 14px rgba(255,106,0,.30)'}}><FabrickPeakIcon size={18}/></div>{!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-black uppercase tracking-[0.22em] text-[#ffd54a]">SOLUCIONES FABRICK</p><p className="truncate text-[9px] uppercase tracking-[0.2em] text-[#9f8d74]">Neo Admin</p></div>}</div><div className="min-h-0 flex-1 overflow-y-auto py-2 scrollbar-hide">{sections.map((section)=><div key={section.title} className="mb-1">{!collapsed && <p className="mb-1 px-3 pt-3 text-[10px] font-semibold uppercase tracking-widest text-[#9f8d74]">{section.title}</p>}{collapsed && <div className="my-1.5 mx-2 h-px bg-[rgba(255,246,230,.06)]"/>}<div className={collapsed ? 'space-y-0.5 px-1.5' : 'space-y-0.5 px-2'}>{section.links.map((link)=>{const hrefPath=link.href.split('?')[0]; const isActive=pathname===hrefPath; return <NavItem key={link.href} href={link.href} label={link.label} icon={link.icon} active={isActive} highlight={link.highlight} comingSoon={link.comingSoon} collapsed={collapsed} onNavigate={onNavigate}/>;})}</div></div>)}</div><div className="flex-shrink-0 border-t border-[rgba(255,246,230,.10)] p-2"><button type="button" onClick={onLogout} title={collapsed ? 'Cerrar sesión' : undefined} className={['group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-[#9f8d74] transition-colors hover:bg-[rgba(255,107,116,.10)] hover:text-[#ff6b74]', collapsed ? 'justify-center' : ''].join(' ')}><LogOut className="h-4 w-4 flex-shrink-0"/>{!collapsed && <span>Cerrar sesión</span>}</button></div></div>;
}

export function StudioSidebar({ collapsed, role, onLogout }: { collapsed: boolean; role: string | null; onLogout: () => void }) {
  return <aside data-studio-sidebar="" className={['fixed left-0 top-0 z-30 hidden h-full flex-col border-r border-[rgba(255,246,230,.10)] transition-[width] duration-200 ease-in-out lg:flex', collapsed ? 'w-14' : 'w-[272px]'].join(' ')} style={{background:'linear-gradient(180deg,rgba(17,11,6,.97),rgba(5,4,3,.99))',backdropFilter:'blur(18px)'}}><StudioSidebarContent collapsed={collapsed} role={role} onLogout={onLogout}/></aside>;
}

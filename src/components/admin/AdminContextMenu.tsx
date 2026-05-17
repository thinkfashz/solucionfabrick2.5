'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Boxes,
  Database,
  Eye,
  FileText,
  Fingerprint,
  FlaskConical,
  Home,
  Image as ImageIcon,
  KeyRound,
  LayoutGrid,
  Link2,
  LogOut,
  Megaphone,
  MessageCircle,
  Newspaper,
  Package,
  Plug,
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
  Truck,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';

interface AdminContextMenuProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

type MenuItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  highlight?: boolean;
};

type MenuSection = {
  title: string;
  tone: 'amber' | 'sky' | 'yellow' | 'purple' | 'pink' | 'blue' | 'emerald' | 'orange' | 'red';
  items: MenuItem[];
};

const SECTIONS: MenuSection[] = [
  {
    title: 'Módulos 1–7',
    tone: 'amber',
    items: [
      { href: '/admin/modulos', label: 'Centro de módulos', icon: LayoutGrid, description: 'Vista organizada de módulos', highlight: true },
      { href: '/admin/activar', label: 'Módulo 1 · Entorno', icon: KeyRound, description: 'Variables y servicios' },
      { href: '/admin/equipo', label: 'Módulo 2 · Acceso', icon: ShieldCheck, description: 'Roles, usuarios e invitaciones' },
      { href: '/admin/errores', label: 'Módulo 3 · Bloqueos', icon: AlertTriangle, description: 'Intentos, fallos y errores' },
      { href: '/admin/testing', label: 'Módulo 4 · Pruebas', icon: FlaskConical, description: 'Validaciones y smoke tests' },
      { href: '/admin/seguridad', label: 'Módulo 5 · Huella', icon: Fingerprint, description: 'Passkeys, Face ID y dispositivos' },
      { href: '/admin/sql', label: 'Módulo 6 · Base de datos', icon: Database, description: 'SQL y migraciones' },
      { href: '/admin/vercel-logs', label: 'Módulo 7 · Deploy', icon: Terminal, description: 'Builds y runtime logs' },
    ],
  },
  {
    title: 'Seguridad & acceso',
    tone: 'red',
    items: [
      { href: '/admin/sesiones', label: 'Sesiones y dispositivos', icon: Fingerprint, description: 'IPs, móviles, navegadores y auditoría', highlight: true },
      { href: '/admin/equipo', label: 'Equipo', icon: ShieldCheck, description: 'Roles, invitaciones y aprobaciones' },
      { href: '/admin/equipo/demo', label: 'Links demo 24h', icon: Eye, description: 'Accesos guiados de solo lectura', highlight: true },
      { href: '/admin/diagnostico', label: 'Diagnóstico APIs', icon: Stethoscope, description: 'Variables, tablas y servicios', highlight: true },
    ],
  },
  {
    title: 'Visión general',
    tone: 'sky',
    items: [
      { href: '/admin', label: 'Centro de control', icon: Home, description: 'KPIs y salud operativa' },
      { href: '/admin/saas', label: 'Mi SaaS', icon: Rocket, description: 'Clientes, instalación y plataforma', highlight: true },
      { href: '/admin/estado', label: 'Estado del sistema', icon: Activity, description: 'Diagnóstico general' },
      { href: '/admin/monitor', label: 'Monitor en tiempo real', icon: BarChart3, description: 'CPU, RAM, latencia y health checks' },
      { href: '/admin/manual', label: 'Manual técnico', icon: BookOpen, description: 'Guía técnica de la app' },
    ],
  },
  {
    title: 'Operación',
    tone: 'yellow',
    items: [
      { href: '/admin/productos', label: 'Productos', icon: Package, description: 'Catálogo, precios y stock' },
      { href: '/admin/productos/importar', label: 'Importar de ML', icon: Link2, description: 'Vista previa desde URL de ML Chile' },
      { href: '/admin/materiales', label: 'Materiales', icon: Package, description: 'Cotizador en vivo' },
      { href: '/admin/proyectos', label: 'Proyectos', icon: Boxes, description: 'Obras terminadas' },
      { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart, description: 'Órdenes y estados' },
      { href: '/admin/pagos', label: 'Pagos', icon: Wallet, description: 'Pasarela y métricas' },
      { href: '/admin/cotizaciones', label: 'Cotizaciones', icon: FileText, description: 'Solicitudes y diseños 3D' },
      { href: '/admin/presupuestos', label: 'Presupuestos', icon: FileText, description: 'Links temporales de presupuesto' },
      { href: '/admin/entregas', label: 'Entregas', icon: Truck, description: 'Seguimiento logístico' },
      { href: '/admin/inventario', label: 'Inventario', icon: Scan, description: 'Stock, bodega y movimientos', highlight: true },
      { href: '/admin/inventario/scan', label: 'Escáner inventario', icon: Scan, description: 'Códigos de barra y QR' },
      { href: '/admin/clientes', label: 'Clientes', icon: Users, description: 'Historial y recurrencia' },
      { href: '/admin/cupones', label: 'Cupones', icon: Tag, description: 'Descuentos y promociones', highlight: true },
      { href: '/admin/reviews', label: 'Reseñas', icon: Star, description: 'Opiniones y valoraciones', highlight: true },
      { href: '/admin/reportes', label: 'Reportes', icon: BarChart3, description: 'Ventas y métricas' },
    ],
  },
  {
    title: 'Contenido',
    tone: 'purple',
    items: [
      { href: '/admin/home', label: 'Pantalla principal', icon: LayoutGrid, description: 'Banners y secciones' },
      { href: '/admin/editor', label: 'Editor universal', icon: LayoutGrid, description: 'Navbar, footer, checkout y más', highlight: true },
      { href: '/admin/tienda', label: 'Tienda', icon: Store, description: 'Portada y catálogo' },
      { href: '/admin/blog', label: 'Blog', icon: Newspaper, description: 'Artículos y publicación' },
      { href: '/admin/medios', label: 'Medios', icon: ImageIcon, description: 'Biblioteca de imágenes' },
      { href: '/admin/medios?tab=cloudinary', label: 'Cloudinary', icon: ImageIcon, description: 'Subida y estado de nube', highlight: true },
    ],
  },
  {
    title: 'Marketing & IA',
    tone: 'pink',
    items: [
      { href: '/admin/asistente-ia', label: 'Asistente IA', icon: Sparkles, description: 'Chat con IA + análisis' },
      { href: '/admin/publicidad/coach', label: 'Coach de campañas', icon: Sparkles, description: 'Optimización con IA' },
      { href: '/admin/publicar', label: 'Publicar', icon: Send, description: 'Posts para redes' },
      { href: '/admin/newsletter', label: 'Boletín', icon: Newspaper, description: 'Suscriptores y campañas' },
      { href: '/admin/publicidad', label: 'Publicidad', icon: Megaphone, description: 'Meta Ads' },
      { href: '/admin/inteligencia-mercado', label: 'Inteligencia de mercado', icon: Telescope, description: 'Tendencias, SEO y productos ganadores', highlight: true },
      { href: '/admin/social', label: 'Hub social', icon: MessageCircle, description: 'Centro de redes sociales', highlight: true },
      { href: '/admin/social/inbox', label: 'Inbox social', icon: MessageCircle, description: 'Mensajes y canales' },
    ],
  },
  {
    title: 'Integraciones',
    tone: 'emerald',
    items: [
      { href: '/admin/integraciones', label: 'Centro de integraciones', icon: Link2, description: 'Conectar, probar y desactivar APIs', highlight: true },
      { href: '/admin/integraciones/marketplace', label: 'Marketplace', icon: Boxes, description: 'Apps, snippets, webhooks y OAuth' },
    ],
  },
  {
    title: 'MercadoLibre',
    tone: 'blue',
    items: [
      { href: '/admin/ml', label: 'Centro ML', icon: Store, description: 'Publicaciones, pedidos y preguntas' },
      { href: '/admin/ml/buscar', label: 'Buscador ML', icon: Search, description: 'Buscar catálogo ML Chile' },
      { href: '/admin/ml/publicaciones', label: 'Publicaciones ML', icon: Store, description: 'Gestión de listings' },
      { href: '/admin/ml/pedidos', label: 'Pedidos ML', icon: ShoppingCart, description: 'Sincronizar ventas' },
      { href: '/admin/ml/preguntas', label: 'Preguntas ML', icon: MessageCircle, description: 'Responder compradores' },
      { href: '/admin/ml/precios', label: 'Monitor precios ML', icon: TrendingDown, description: 'Comparar precios vs competencia', highlight: true },
    ],
  },
  {
    title: 'Sistema',
    tone: 'orange',
    items: [
      { href: '/admin/configuracion', label: 'Configuración del negocio', icon: Settings, description: 'Datos del negocio y acceso admin' },
      { href: '/admin/extensions', label: 'Extensiones y webhooks', icon: Plug, description: 'Webhooks, OAuth y signing keys' },
      { href: '/admin/facturas', label: 'Facturas DTE', icon: Receipt, description: 'Documentos tributarios' },
      { href: '/admin/setup', label: 'Setup', icon: Database, description: 'Verificar y crear tablas' },
      { href: '/admin/observatory', label: 'Observatory', icon: Radio, description: 'Red en tiempo real 3D', highlight: true },
      { href: '/admin/envios', label: 'Tarifas de envío', icon: Truck, description: 'Costos por región y transportista', highlight: true },
    ],
  },
];

const toneClass: Record<MenuSection['tone'], string> = {
  amber: 'text-amber-300 border-amber-300/25 hover:border-amber-300/40 hover:bg-amber-300/10',
  sky: 'text-sky-300 border-sky-300/25 hover:border-sky-300/40 hover:bg-sky-300/10',
  yellow: 'text-yellow-300 border-yellow-300/25 hover:border-yellow-300/40 hover:bg-yellow-300/10',
  purple: 'text-purple-300 border-purple-300/25 hover:border-purple-300/40 hover:bg-purple-300/10',
  pink: 'text-pink-300 border-pink-300/25 hover:border-pink-300/40 hover:bg-pink-300/10',
  blue: 'text-blue-300 border-blue-300/25 hover:border-blue-300/40 hover:bg-blue-300/10',
  emerald: 'text-emerald-300 border-emerald-300/25 hover:border-emerald-300/40 hover:bg-emerald-300/10',
  orange: 'text-orange-300 border-orange-300/25 hover:border-orange-300/40 hover:bg-orange-300/10',
  red: 'text-rose-300 border-rose-300/25 hover:border-rose-300/40 hover:bg-rose-300/10',
};

export default function AdminContextMenu({ open, onClose, onLogout }: AdminContextMenuProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['Módulos 1–7', 'Seguridad & acceso', 'Operación', 'Integraciones']));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)),
    })).filter((section) => section.items.length > 0);
  }, [query]);

  const totalItems = useMemo(() => SECTIONS.reduce((acc, section) => acc + section.items.length, 0), []);

  if (!open) return null;

  function toggle(title: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center bg-black/80 p-3 pt-[4vh] backdrop-blur-md lg:hidden">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/12 bg-zinc-950/98 shadow-[0_40px_120px_rgba(0,0,0,0.9)]">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-yellow-300 text-black shadow-[0_0_24px_rgba(250,204,21,0.35)]"><Zap className="h-4 w-4" /></span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-300">Control room</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">{totalItems} opciones disponibles</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 p-2 text-zinc-300" aria-label="Cerrar menú"><X className="h-4 w-4" /></button>
        </header>

        <div className="border-b border-white/10 p-3">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <Search className="h-4 w-4 text-zinc-500" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar módulo u opción…" className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600" />
            {query && <button onClick={() => setQuery('')} className="text-zinc-500"><X className="h-3 w-3" /></button>}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-500">Sin resultados.</div>
          ) : filtered.map((section) => {
            const isOpen = query ? true : expanded.has(section.title);
            return (
              <section key={section.title} className="mb-3 rounded-3xl border border-white/10 bg-black/40 p-3">
                <button onClick={() => toggle(section.title)} className="flex w-full items-center justify-between px-1 py-1 text-left">
                  <span className={`text-[10px] font-black uppercase tracking-[0.28em] ${toneClass[section.tone].split(' ')[0]}`}>{section.title}</span>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-500">{section.items.length}</span>
                </button>
                {isOpen && (
                  <div className="mt-2 space-y-2">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link key={`${section.title}-${item.href}-${item.label}`} href={item.href} onClick={onClose} className={`group flex items-center gap-3 rounded-2xl border bg-white/[0.03] px-3 py-3 transition ${toneClass[section.tone]}`}>
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8"><Icon className="h-4 w-4" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                              <span className="truncate">{item.label}</span>
                              {item.highlight && <span className="rounded-full border border-yellow-300/40 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-yellow-200">Nuevo</span>}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-zinc-500">{item.description}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <footer className="border-t border-white/10 p-3">
          <button onClick={() => { onClose(); onLogout(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-zinc-400 hover:border-red-400/50 hover:text-red-300">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </footer>
      </div>
    </div>
  );
}

'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  Boxes,
  Camera,
  FileText,
  Fingerprint,
  Home,
  Image as ImageIcon,
  KeyRound,
  LayoutGrid,
  Link2,
  LogOut,
  Mail,
  Menu as MenuIcon,
  MessageCircle,
  Newspaper,
  Package,
  Plug,
  Receipt,
  Rocket,
  Scan,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Tag,
  Terminal,
  Truck,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { BrandMark } from '@/components/admin/ui';

interface AdminContextMenuProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  onToggleTheme?: () => void;
  currentTheme?: string;
  profilePhoto?: string | null;
  onPhotoUpload?: (file: File) => void;
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
  subtitle: string;
  items: MenuItem[];
};

const SECTIONS: MenuSection[] = [
  {
    title: 'Inicio',
    subtitle: 'Control principal',
    items: [
      { href: '/admin', label: 'Centro de control', description: 'KPIs y salud operativa', icon: Home },
      { href: '/admin/modulos', label: 'Centro de módulos', description: 'Mapa completo del admin', icon: LayoutGrid, highlight: true },
      { href: '/admin/analytics', label: 'Analytics', description: 'Métricas y rendimiento', icon: BarChart3 },
      { href: '/admin/saas', label: 'Mi SaaS', description: 'Clientes, instalación y plataforma', icon: Rocket, highlight: true },
    ],
  },
  {
    title: 'Ventas',
    subtitle: 'Productos y clientes',
    items: [
      { href: '/admin/productos', label: 'Productos', description: 'Catálogo, precios y stock', icon: Package },
      { href: '/admin/productos/importar', label: 'Importar Mercado Libre', description: 'Importar productos desde URL', icon: Link2 },
      { href: '/admin/pedidos', label: 'Pedidos', description: 'Órdenes, estados y despacho', icon: ShoppingCart },
      { href: '/admin/clientes', label: 'Clientes', description: 'Historial y recurrencia', icon: Users },
      { href: '/admin/cotizaciones', label: 'Cotizaciones', description: 'Solicitudes y diseños 3D', icon: FileText },
      { href: '/admin/presupuestos', label: 'Presupuestos', description: 'Links temporales para vender', icon: FileText, highlight: true },
      { href: '/admin/cupones', label: 'Cupones', description: 'Promociones y descuentos', icon: Tag },
      { href: '/admin/reviews', label: 'Reseñas', description: 'Opiniones de clientes', icon: Star },
    ],
  },
  {
    title: 'Finanzas & SII',
    subtitle: 'Facturación y control mensual',
    items: [
      { href: '/admin/f29', label: 'F29 · IVA mensual', description: 'Acceso directo visible al F29', icon: Receipt, highlight: true },
      { href: '/admin/contabilidad', label: 'Contabilidad F29 / SII', description: 'IVA, PPM, compras y ventas', icon: FileText, highlight: true },
      { href: '/admin/facturas', label: 'Facturas DTE', description: 'Boletas, facturas y notas', icon: Receipt },
      { href: '/admin/contabilidad/f12', label: 'F12 · Registro mensual', description: 'Ventas, compras y respaldos', icon: BookOpen },
      { href: '/admin/contabilidad/f21', label: 'F21 · Pagos tributarios', description: 'Obligaciones y comprobantes', icon: Wallet },
      { href: '/admin/pagos', label: 'Pagos MercadoPago', description: 'Pasarela y métricas', icon: Wallet },
      { href: '/admin/reportes', label: 'Reportes financieros', description: 'Ventas y totales', icon: BarChart3 },
    ],
  },
  {
    title: 'Tienda & contenido',
    subtitle: 'Portada, páginas y medios',
    items: [
      { href: '/admin/tienda', label: 'Editar tienda', description: 'Portada y catálogo', icon: Store, highlight: true },
      { href: '/admin/home', label: 'Pantalla principal', description: 'Banners y secciones', icon: LayoutGrid },
      { href: '/admin/editor', label: 'Editor universal', description: 'Navbar, footer y checkout', icon: LayoutGrid, highlight: true },
      { href: '/admin/paginas', label: 'Creador de páginas', description: 'HTML por nicho con token', icon: LayoutGrid },
      { href: '/admin/blog', label: 'Blog', description: 'Entradas y publicación', icon: Newspaper },
      { href: '/admin/medios', label: 'Medios', description: 'Biblioteca de imágenes', icon: ImageIcon },
    ],
  },
  {
    title: 'Operación',
    subtitle: 'Inventario y logística',
    items: [
      { href: '/admin/inventario', label: 'Inventario', description: 'Stock, bodega y movimientos', icon: Scan, highlight: true },
      { href: '/admin/inventario/scan', label: 'Escáner inventario', description: 'Códigos de barra y QR', icon: Scan },
      { href: '/admin/entregas', label: 'Entregas', description: 'Seguimiento logístico', icon: Truck },
      { href: '/admin/materiales', label: 'Materiales', description: 'Cotizador en vivo', icon: Package },
      { href: '/admin/proyectos', label: 'Proyectos', description: 'Obras terminadas', icon: Boxes },
    ],
  },
  {
    title: 'IA & crecimiento',
    subtitle: 'Automatización y marketing',
    items: [
      { href: '/admin/ia-config', label: 'Configuración IA', description: 'Proveedor, API key y modelo', icon: Bot, highlight: true },
      { href: '/admin/agente', label: 'Agente IA', description: 'Playwright, precios y competencia', icon: Sparkles, highlight: true },
      { href: '/admin/ai-developer', label: 'Fabrick AI Developer', description: 'Chat real y herramientas Git', icon: Sparkles },
      { href: '/admin/correo', label: 'Correo Resend', description: 'Bandeja y estadísticas', icon: Mail },
      { href: '/admin/social/inbox', label: 'Inbox social', description: 'Mensajes y canales', icon: MessageCircle },
      { href: '/admin/ml', label: 'MercadoLibre', description: 'Publicaciones y pedidos', icon: Store },
    ],
  },
  {
    title: 'Sistema',
    subtitle: 'Seguridad y configuración',
    items: [
      { href: '/admin/perfil', label: 'Perfil administrador', description: 'Foto, bio y contacto', icon: User, highlight: true },
      { href: '/admin/seguridad', label: 'Seguridad Passkeys', description: 'Huella, Face ID y claves', icon: Fingerprint },
      { href: '/admin/sesiones', label: 'Sesiones', description: 'Dispositivos e IPs', icon: Activity },
      { href: '/admin/integraciones', label: 'Integraciones', description: 'APIs y conexiones', icon: Plug },
      { href: '/admin/sql', label: 'Terminal SQL', description: 'Consultas y migraciones', icon: Terminal },
      { href: '/admin/configuracion', label: 'Configuración', description: 'Datos del negocio', icon: Settings },
      { href: '/admin/manual', label: 'Manual', description: 'Guía técnica', icon: BookOpen },
      { href: '/admin/equipo', label: 'Equipo', description: 'Roles e invitaciones', icon: ShieldCheck },
    ],
  },
];

const railItems = [
  { label: 'Inicio', icon: Home },
  { label: 'Ventas', icon: ShoppingCart },
  { label: 'Finanzas & SII', icon: Receipt },
  { label: 'Tienda & contenido', icon: Store },
  { label: 'IA & crecimiento', icon: Sparkles },
  { label: 'Sistema', icon: Settings },
];

function matchText(item: MenuItem, query: string) {
  const q = query.trim().toLowerCase();
  return item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
}

export default function AdminContextMenu({ open, onClose, onLogout, profilePhoto, onPhotoUpload }: AdminContextMenuProps) {
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState('Inicio');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const filteredSections = useMemo(() => {
    const q = query.trim();
    if (!q) return SECTIONS.filter((section) => section.title === activeSection);
    return SECTIONS.map((section) => ({ ...section, items: section.items.filter((item) => matchText(item, q)) })).filter((section) => section.items.length > 0);
  }, [activeSection, query]);

  const totalResults = filteredSections.reduce((acc, section) => acc + section.items.length, 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-3 backdrop-blur-xl lg:hidden">
      <div className="relative flex h-[94vh] w-full max-w-[460px] overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/82 shadow-[0_40px_140px_rgba(0,0,0,.95)] backdrop-blur-3xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_8%,rgba(255,120,80,.26),transparent_24rem),radial-gradient(circle_at_18%_80%,rgba(250,204,21,.18),transparent_20rem)]" />

        <aside className="relative z-10 flex w-[72px] shrink-0 flex-col items-center border-r border-white/10 bg-black/32 px-2 py-4">
          <BrandMark size="sm" animated />
          <div className="mt-5 flex flex-1 flex-col items-center gap-2">
            {railItems.map(({ label, icon: Icon }) => {
              const active = !query && activeSection === label;
              return (
                <button key={label} onClick={() => { setActiveSection(label); setQuery(''); }} title={label} className={`grid h-11 w-11 place-items-center rounded-2xl border transition-all ${active ? 'border-yellow-300/50 bg-yellow-300 text-black shadow-[0_0_30px_rgba(250,204,21,.24)]' : 'border-white/8 bg-white/[0.035] text-zinc-500 hover:border-yellow-300/35 hover:text-yellow-300'}`}>
                  <Icon className="h-4.5 w-4.5" />
                </button>
              );
            })}
          </div>
          <button onClick={() => { onClose(); onLogout(); }} title="Salir" className="grid h-11 w-11 place-items-center rounded-2xl border border-white/8 bg-white/[0.035] text-zinc-500 transition hover:border-rose-400/50 hover:text-rose-300">
            <LogOut className="h-4 w-4" />
          </button>
        </aside>

        <main className="relative z-10 flex min-w-0 flex-1 flex-col">
          <header className="border-b border-white/10 px-4 pb-4 pt-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => fileRef.current?.click()} className="group relative h-12 w-12 overflow-hidden rounded-2xl border-2 border-yellow-300/35 bg-black/60">
                {profilePhoto ? <img src={profilePhoto} alt="Foto de perfil" className="h-full w-full object-cover" /> : <User className="m-auto mt-3 h-5 w-5 text-zinc-400" />}
                <span className="absolute inset-0 grid place-items-center bg-black/65 opacity-0 transition group-hover:opacity-100"><Camera className="h-3.5 w-3.5 text-yellow-300" /></span>
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file && onPhotoUpload) onPhotoUpload(file); e.target.value = ''; }} />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.34em] text-zinc-500">Neo Admin</p>
                <h2 className="truncate text-[15px] font-black uppercase tracking-[0.16em] text-white">Soluciones Fabrick</h2>
              </div>
              <button onClick={onClose} className="rounded-2xl border border-white/10 bg-white/5 p-2 text-zinc-400 transition hover:text-white" aria-label="Cerrar menú">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-black/45 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
              <div className="flex items-center gap-2 rounded-2xl bg-white/[0.045] px-3 py-2.5">
                <Search className="h-4 w-4 text-yellow-300/70" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar opción, módulo o ruta…" className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-zinc-600" />
                {query && <button onClick={() => setQuery('')} className="text-zinc-500 hover:text-white"><X className="h-3.5 w-3.5" /></button>}
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {query ? <p className="mb-3 px-1 text-[10px] font-black uppercase tracking-[0.26em] text-zinc-500">{totalResults} resultado{totalResults === 1 ? '' : 's'}</p> : null}
            {filteredSections.length === 0 ? (
              <div className="grid h-full place-items-center text-center text-sm text-zinc-500">Sin resultados para “{query}”.</div>
            ) : filteredSections.map((section) => (
              <section key={section.title} className="mb-3 rounded-[1.6rem] border border-white/10 bg-black/38 p-3">
                <div className="mb-2 flex items-end justify-between gap-3 px-1">
                  <div><h3 className="text-[11px] font-black uppercase tracking-[0.26em] text-yellow-300">{section.title}</h3><p className="text-[10px] text-zinc-600">{section.subtitle}</p></div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">{section.items.length}</span>
                </div>
                <div className="grid gap-2">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={`${section.title}-${item.href}`} href={item.href} onClick={() => { setQuery(''); onClose(); }} className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 transition ${item.highlight ? 'border-yellow-300/25 bg-yellow-300/8 hover:border-yellow-300/45' : 'border-white/8 bg-white/[0.035] hover:border-white/16 hover:bg-white/[0.06]'}`}>
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.highlight ? 'bg-yellow-300 text-black' : 'bg-white/8 text-zinc-300 group-hover:text-yellow-300'}`}><Icon className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><b className="truncate text-[13px] text-white">{item.label}</b>{item.highlight && <span className="rounded-full bg-yellow-300/15 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-yellow-200">Clave</span>}</span><span className="mt-0.5 block truncate text-[11px] text-zinc-500">{item.description}</span></span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <footer className="border-t border-white/10 p-3">
            <button onClick={() => { onClose(); onLogout(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400 transition hover:border-rose-400/50 hover:text-rose-300">
              <MenuIcon className="h-4 w-4" /> Cerrar sesión
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
}

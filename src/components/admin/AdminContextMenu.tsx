'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Database,
  FileText,
  FlaskConical,
  Home,
  Image as ImageIcon,
  KeyRound,
  LayoutGrid,
  Link2,
  LogOut,
  Newspaper,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Store,
  Terminal,
  Truck,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
  badge?: string;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const SECTIONS: MenuSection[] = [
  {
    title: 'Módulos 1–7',
    items: [
      { href: '/admin/modulos', label: 'Centro de módulos', description: 'Vista organizada de los módulos 1 al 7', icon: LayoutGrid, badge: 'Nuevo' },
      { href: '/admin/activar', label: 'Módulo 1 · Entorno', description: 'Variables, dominio, InsForge y servicios', icon: KeyRound },
      { href: '/admin/equipo', label: 'Módulo 2 · Sesión', description: 'Roles, usuarios e invitaciones', icon: ShieldCheck },
      { href: '/admin/errores', label: 'Módulo 3 · Rate limit', description: 'Intentos, bloqueos y errores admin', icon: AlertTriangle },
      { href: '/admin/testing', label: 'Módulo 4 · Validación', description: 'Pruebas y endpoints críticos', icon: FlaskConical },
      { href: '/admin/seguridad', label: 'Módulo 5 · Huella / Face ID', description: 'Passkeys y dispositivos confiables', icon: Smartphone, badge: 'Clave' },
      { href: '/admin/sql', label: 'Módulo 6 · Base de datos', description: 'Migraciones y terminal SQL', icon: Database },
      { href: '/admin/vercel-logs', label: 'Módulo 7 · Deploy', description: 'Builds, logs y salida a producción', icon: Terminal },
    ],
  },
  {
    title: 'Control',
    items: [
      { href: '/admin', label: 'Centro de control', description: 'KPIs y salud operativa', icon: Home },
      { href: '/admin/estado', label: 'Estado del sistema', description: 'Diagnóstico CMS, BD e integraciones', icon: Activity },
      { href: '/admin/monitor', label: 'Monitor', description: 'Health checks en tiempo real', icon: BarChart3 },
      { href: '/admin/manual', label: 'Manual técnico', description: 'Guía técnica de la app', icon: BookOpen },
    ],
  },
  {
    title: 'Operación',
    items: [
      { href: '/admin/productos', label: 'Productos', description: 'Catálogo, precios y stock', icon: Package },
      { href: '/admin/inventario', label: 'Inventario', description: 'Stock y movimientos', icon: Package },
      { href: '/admin/pedidos', label: 'Pedidos', description: 'Órdenes y estados', icon: ShoppingCart },
      { href: '/admin/cotizaciones', label: 'Cotizaciones', description: 'Solicitudes y diseños 3D', icon: FileText },
      { href: '/admin/clientes', label: 'Clientes', description: 'Historial y recurrencia', icon: Users },
      { href: '/admin/entregas', label: 'Entregas', description: 'Seguimiento logístico', icon: Truck },
    ],
  },
  {
    title: 'Contenido e integraciones',
    items: [
      { href: '/admin/home', label: 'Pantalla principal', description: 'Banners y secciones', icon: LayoutGrid },
      { href: '/admin/editor', label: 'Editor universal', description: 'Navbar, footer, checkout y más', icon: LayoutGrid },
      { href: '/admin/tienda', label: 'Tienda', description: 'Portada y catálogo', icon: Store },
      { href: '/admin/blog', label: 'Blog', description: 'Artículos y publicación', icon: Newspaper },
      { href: '/admin/medios', label: 'Medios', description: 'Biblioteca de imágenes', icon: ImageIcon },
      { href: '/admin/integraciones', label: 'Integraciones', description: 'APIs y proveedores', icon: Link2 },
      { href: '/admin/center', label: 'Credenciales', description: 'Claves API y proveedores', icon: KeyRound },
    ],
  },
];

export default function AdminContextMenu({ open, onClose, onLogout }: AdminContextMenuProps) {
  const [query, setQuery] = useState('');

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q),
      ),
    })).filter((section) => section.items.length > 0);
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] lg:hidden">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-[90%] max-w-md flex-col border-l border-white/10 bg-zinc-950 shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-300">Control room</p>
            <p className="mt-1 text-[11px] text-zinc-500">Módulos y navegación admin</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 p-2 text-zinc-300" aria-label="Cerrar menú">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="border-b border-white/10 p-3">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <Search className="h-4 w-4 text-zinc-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar módulo…"
              className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {filteredSections.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-500">Sin resultados.</div>
          ) : (
            <div className="space-y-4">
              {filteredSections.map((section) => (
                <section key={section.title} className="rounded-3xl border border-white/10 bg-black/40 p-3">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-zinc-500">{section.title}</p>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-500">{section.items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 transition hover:border-yellow-300/30 hover:bg-yellow-300/10"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-300/10 text-yellow-300">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                              <span className="truncate">{item.label}</span>
                              {item.badge && <span className="rounded-full border border-yellow-300/40 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em] text-yellow-200">{item.badge}</span>}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-zinc-500">{item.description}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <footer className="border-t border-white/10 p-3">
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-zinc-400 hover:border-red-400/50 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </footer>
      </aside>
    </div>
  );
}

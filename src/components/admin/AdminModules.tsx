'use client';

import Link from 'next/link';
import {
  Activity,
  BarChart3,
  Boxes,
  CircleDollarSign,
  FileText,
  Gauge,
  Globe2,
  Hammer,
  LayoutGrid,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

type ModuleItem = { href: string; label: string; description: string; icon: LucideIcon };
type ModuleSection = { title: string; description: string; items: ModuleItem[] };

const SECTIONS: ModuleSection[] = [
  {
    title: 'Operación',
    description: 'Trabajo diario, ventas y control comercial.',
    items: [
      { href: '/admin', label: 'Centro de control', description: 'KPIs y salud operativa', icon: Gauge },
      { href: '/admin/crm', label: 'CRM & Pipeline', description: 'Leads y oportunidades', icon: Users },
      { href: '/admin/pedidos', label: 'Pedidos', description: 'Órdenes y estados', icon: ShoppingCart },
      { href: '/admin/cotizaciones', label: 'Cotizaciones', description: 'Solicitudes y propuestas', icon: FileText },
    ],
  },
  {
    title: 'Fabrick Intelligence',
    description: 'Análisis, prioridades y automatizaciones seguras.',
    items: [
      { href: '/admin/intelligence', label: 'Centro Intelligence', description: 'Visión inteligente del negocio', icon: Sparkles },
      { href: '/admin/intelligence/today', label: 'Qué mejorar hoy', description: 'Health Score y prioridades', icon: Activity },
      { href: '/admin/intelligence/operations', label: 'Operaciones', description: 'Stock, margen y Price Watch', icon: Boxes },
      { href: '/admin/intelligence/automations', label: 'Automatizaciones', description: 'Tareas y diagnósticos', icon: Settings },
    ],
  },
  {
    title: 'Catálogo & inventario',
    description: 'Productos, materiales y existencias.',
    items: [
      { href: '/admin/productos', label: 'Productos', description: 'Catálogo, precios y stock', icon: Package },
      { href: '/admin/inventario', label: 'Inventario', description: 'Existencias y movimientos', icon: Boxes },
      { href: '/admin/inventario/scan', label: 'Escáner', description: 'EAN, SKU y movimientos', icon: Activity },
      { href: '/admin/materiales', label: 'Materiales', description: 'Materiales y cotización', icon: Hammer },
    ],
  },
  {
    title: 'Finanzas',
    description: 'Control tributario, cobros y reportes.',
    items: [
      { href: '/admin/f29', label: 'F29 · IVA mensual', description: 'IVA, PPM y remanentes', icon: FileText },
      { href: '/admin/contabilidad', label: 'Contabilidad', description: 'Impuestos y registros', icon: Wallet },
      { href: '/admin/pagos', label: 'Pagos', description: 'Cobros y conciliación', icon: CircleDollarSign },
      { href: '/admin/reportes', label: 'Reportes', description: 'Resultados financieros', icon: BarChart3 },
    ],
  },
  {
    title: 'Web & contenido',
    description: 'Experiencia pública, páginas y medios.',
    items: [
      { href: '/admin/editor', label: 'Editor del sitio', description: 'Home, tienda y estilos globales', icon: LayoutGrid },
      { href: '/admin/paginas', label: 'Páginas comerciales', description: 'Landings administrables', icon: Globe2 },
      { href: '/admin/blog', label: 'Blog', description: 'Artículos y contenido', icon: FileText },
      { href: '/admin/medios', label: 'Biblioteca de medios', description: 'Imágenes, video y Cloudinary', icon: LayoutGrid },
    ],
  },
  {
    title: 'Sistema & seguridad',
    description: 'Accesos, integraciones y estado de plataforma.',
    items: [
      { href: '/admin/equipo', label: 'Equipo & permisos', description: 'Roles y aprobaciones', icon: Users },
      { href: '/admin/seguridad', label: 'Seguridad', description: 'Passkeys y políticas de acceso', icon: ShieldCheck },
      { href: '/admin/integraciones', label: 'Integraciones', description: 'APIs y conexiones', icon: Settings },
      { href: '/admin/estado', label: 'Estado del sistema', description: 'Salud de servicios y base de datos', icon: Activity },
    ],
  },
];

export function AdminModules() {
  return (
    <div className="space-y-10">
      {SECTIONS.map((section) => (
        <section key={section.title} className="space-y-4">
          <div className="flex items-end justify-between gap-4 border-b border-black/10 pb-3">
            <div>
              <h2 className="text-sm font-black text-zinc-900">{section.title}</h2>
              <p className="mt-1 text-xs text-zinc-500">{section.description}</p>
            </div>
            <span className="text-[11px] font-semibold text-zinc-400">{section.items.length} módulos</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex min-h-28 items-start gap-3 rounded-2xl border border-black/10 bg-white/75 p-4 transition hover:-translate-y-0.5 hover:border-black/20 hover:bg-white"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-950 text-amber-300">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm text-zinc-950">{item.label}</strong>
                    <small className="mt-1 block text-xs leading-relaxed text-zinc-500">{item.description}</small>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default AdminModules;

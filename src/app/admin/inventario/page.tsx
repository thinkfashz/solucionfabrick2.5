'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, ScanLine, ArrowRight, TrendingDown, AlertTriangle, RefreshCw, BarChart3 } from 'lucide-react';
import { AdminPage, AdminPageHeader } from '@/components/admin/ui';

interface StockSummary {
  total_products: number;
  low_stock: number;
  out_of_stock: number;
  total_units: number;
}

const MODULES = [
  {
    href: '/admin/inventario/scan',
    icon: ScanLine,
    label: 'Escáner de inventario',
    description: 'Lee códigos de barras EAN-13 o QR con la cámara para registrar entradas y salidas rápidamente.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    badge: 'Nuevo',
  },
  {
    href: '/admin/productos',
    icon: Package,
    label: 'Catálogo de productos',
    description: 'Gestiona el stock, precio y variantes de cada producto desde el catálogo principal.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    href: '/admin/reportes',
    icon: BarChart3,
    label: 'Reportes de inventario',
    description: 'Histórico de movimientos, rotación de stock y productos más vendidos.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    href: '/admin/pedidos',
    icon: TrendingDown,
    label: 'Descuentos por pedido',
    description: 'Revisa el impacto en stock de los pedidos pendientes y confirmados.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
  },
];

export default function AdminInventarioPage() {
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/estado')
      .then((r) => r.json())
      .then((d) => {
        if (d?.counts) {
          setSummary({
            total_products: d.counts.products ?? 0,
            low_stock: d.counts.low_stock ?? 0,
            out_of_stock: d.counts.out_of_stock ?? 0,
            total_units: d.counts.total_stock_units ?? 0,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: 'Productos',
      value: loading ? '…' : (summary?.total_products ?? '—').toString(),
      color: 'text-white',
      icon: Package,
    },
    {
      label: 'Stock bajo',
      value: loading ? '…' : (summary?.low_stock ?? '—').toString(),
      color: 'text-orange-400',
      icon: AlertTriangle,
    },
    {
      label: 'Sin stock',
      value: loading ? '…' : (summary?.out_of_stock ?? '—').toString(),
      color: 'text-red-400',
      icon: AlertTriangle,
    },
    {
      label: 'Unidades totales',
      value: loading ? '…' : (summary?.total_units ?? '—').toString(),
      color: 'text-emerald-400',
      icon: BarChart3,
    },
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        title="Inventario"
        description="Control de stock, escaneo de productos y movimientos de bodega."
        icon={Package}
        actions={
          <button
            onClick={() => { setLoading(true); setSummary(null); }}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
          >
            <RefreshCw size={12} />
            Actualizar
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-white/8 bg-white/3 p-4 text-center">
            <div className={`text-2xl font-black ${s.color} mb-1`}>{s.value}</div>
            <div className="text-xs text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* CTA scanner */}
      <Link
        href="/admin/inventario/scan"
        className="flex items-center justify-between gap-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 mb-6 hover:bg-yellow-500/15 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <ScanLine size={18} className="text-yellow-400" />
          </div>
          <div>
            <div className="font-bold text-white">Abrir escáner</div>
            <div className="text-xs text-zinc-400">Lee EAN-13 y QR con la cámara del dispositivo</div>
          </div>
        </div>
        <ArrowRight size={16} className="text-yellow-400 group-hover:translate-x-1 transition-transform" />
      </Link>

      {/* Alertas de stock */}
      {!loading && summary && (summary.low_stock > 0 || summary.out_of_stock > 0) && (
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4 mb-6 flex items-start gap-3">
          <AlertTriangle size={16} className="text-orange-400 mt-0.5 shrink-0" />
          <div className="text-sm text-orange-200">
            <strong>Atención:</strong>{' '}
            {summary.out_of_stock > 0 && `${summary.out_of_stock} producto(s) sin stock. `}
            {summary.low_stock > 0 && `${summary.low_stock} producto(s) con stock bajo.`}
            {' '}
            <Link href="/admin/productos" className="underline hover:text-white">
              Revisar catálogo →
            </Link>
          </div>
        </div>
      )}

      {/* Módulos */}
      <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-3">Módulos</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {MODULES.map((m) => (
          <Link
            key={m.label}
            href={m.href}
            className={`rounded-xl border ${m.bg} p-4 flex items-start gap-3 hover:brightness-110 transition-all`}
          >
            <m.icon size={18} className={`${m.color} mt-0.5 shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-sm text-white">{m.label}</span>
                {m.badge && (
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-yellow-400 text-black px-2 py-0.5 rounded-full">
                    {m.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{m.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </AdminPage>
  );
}

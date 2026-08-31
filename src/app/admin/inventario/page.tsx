'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, BarChart3, Bot, Camera, Cloud, Package, RefreshCw, ScanLine, TrendingDown } from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

type StockSummary = {
  total_products: number;
  low_stock: number;
  out_of_stock: number;
  total_units: number;
};

const MODULES = [
  { href: '/admin/inventario/recepcion', icon: Camera, label: 'Recepción rápida por foto', description: 'Fotografía productos, deja que la IA prepare la ficha, suma cantidades y continúa. El lote queda persistido para retomarlo desde otro equipo.' },
  { href: '/admin/inventario/scan', icon: ScanLine, label: 'Escáner QR y códigos', description: 'Lee QR, EAN, UPC y códigos de barras para localizar productos y operar con códigos físicos.' },
  { href: '/admin/inventario/asistente', icon: Bot, label: 'Asistente de stock', description: 'Busca por nombre, SKU, EAN o código y consulta rápidamente cuántas unidades quedan.' },
  { href: '/admin/inventario/sync', icon: Cloud, label: 'Sincronizaciones', description: 'Supervisa eventos provenientes de Mercado Libre, pedidos u otros sistemas conectados al inventario.' },
  { href: '/admin/inventario/movimientos', icon: BarChart3, label: 'Movimientos', description: 'Trazabilidad de entradas, salidas, ajustes, pedidos, devoluciones y sincronizaciones.' },
  { href: '/admin/productos', icon: Package, label: 'Catálogo de productos', description: 'Gestiona fichas maestras, stock, precios, imágenes, SKU, EAN y publicación.' },
  { href: '/admin/pedidos', icon: TrendingDown, label: 'Impacto por pedidos', description: 'Revisa pedidos y su relación con la operación y el stock disponible.' },
];

const secondaryButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3.5 text-xs font-black text-[#5f594f] transition hover:bg-white disabled:opacity-50';

export default function AdminInventarioPage() {
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/estado', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
      setSummary({
        total_products: data?.counts?.products ?? 0,
        low_stock: data?.counts?.low_stock ?? 0,
        out_of_stock: data?.counts?.out_of_stock ?? 0,
        total_units: data?.counts?.total_stock_units ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el inventario.');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSummary(); }, [loadSummary]);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Catálogo · Inventario V2"
        title="Inventario"
        description="Una sola fuente de stock para recepción, catálogo, pedidos, códigos físicos, sincronizaciones externas y consultas rápidas."
        icon={Package}
        actions={<><Link href="/admin/inventario/recepcion" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white"><Camera className="h-4 w-4" /> Recepción rápida</Link><button type="button" onClick={() => void loadSummary()} disabled={loading} className={secondaryButton}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar</button></>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Productos" value={loading ? '…' : summary?.total_products ?? '—'} icon={Package} hint="Catálogo registrado" />
        <AdminStat label="Stock bajo" value={loading ? '…' : summary?.low_stock ?? '—'} icon={AlertTriangle} accent="yellow" hint="Requiere revisión" />
        <AdminStat label="Sin stock" value={loading ? '…' : summary?.out_of_stock ?? '—'} icon={TrendingDown} accent="rose" hint="Disponibilidad crítica" />
        <AdminStat label="Unidades" value={loading ? '…' : summary?.total_units ?? '—'} icon={BarChart3} accent="cyan" hint="Stock total registrado" />
      </section>

      {error ? <div className="rounded-xl border border-rose-600/15 bg-rose-500/8 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

      {!loading && summary && (summary.low_stock > 0 || summary.out_of_stock > 0) ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-600/15 bg-amber-500/8 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div><strong>Atención de stock.</strong> {summary.out_of_stock > 0 ? `${summary.out_of_stock} producto(s) sin stock. ` : ''}{summary.low_stock > 0 ? `${summary.low_stock} producto(s) con stock bajo. ` : ''}<Link href="/admin/productos" className="font-black underline">Revisar catálogo</Link>.</div>
        </div>
      ) : null}

      <div>
        <div className="mb-3 border-b border-black/10 pb-3">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Operación</p>
          <h2 className="mt-1 text-xl font-black tracking-[-.025em] text-[#171612]">Centro de inventario</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[#817a6f]">El catálogo contiene la ficha maestra. Las recepciones, pedidos y sistemas externos generan movimientos sobre ese catálogo, sin duplicar la lógica de stock.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.href} href={module.href} className="group flex min-h-36 items-start gap-3 rounded-[18px] border border-black/10 bg-white/60 p-4 transition hover:-translate-y-0.5 hover:bg-white sm:p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ffb000]/10 text-[#a56600]"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><strong className="block text-sm text-[#171612]">{module.label}</strong><small className="mt-1 block text-xs leading-5 text-[#817a6f]">{module.description}</small></span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#aaa294] transition group-hover:translate-x-0.5 group-hover:text-[#8e5c00]" />
              </Link>
            );
          })}
        </div>
      </div>

      <AdminCard className="text-xs leading-5 text-[#817a6f]">
        <strong className="text-[#171612]">Modelo V2:</strong> la recepción rápida se guarda en la base de datos antes de modificar existencias. Al incorporar, cada línea genera un movimiento atómico e idempotente. Así puedes interrumpir una carga, continuarla desde otro PC y reintentar una sincronización sin sumar stock dos veces.
      </AdminCard>
    </AdminPage>
  );
}

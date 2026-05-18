'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, ScanLine, ArrowRight, TrendingDown, AlertTriangle, RefreshCw, BarChart3 } from 'lucide-react';
import { AdminBaseCard, AdminBaseGrid, AdminBaseMetric, AdminBasePage } from '@/components/admin/baseui-kit';

interface StockSummary {
  total_products: number;
  low_stock: number;
  out_of_stock: number;
  total_units: number;
}

const MODULES = [
  { href: '/admin/inventario/scan', icon: ScanLine, label: 'Escáner de inventario', description: 'Lee códigos de barras EAN-13 o QR con la cámara para registrar entradas y salidas rápidamente.', tone: 'gold' as const, badge: 'Nuevo' },
  { href: '/admin/productos', icon: Package, label: 'Catálogo de productos', description: 'Gestiona stock, precio, imágenes y variantes desde el catálogo principal.', tone: 'emerald' as const },
  { href: '/admin/estado', icon: BarChart3, label: 'Diagnóstico de stock', description: 'Revisa contadores reales, tablas y salud técnica del inventario.', tone: 'blue' as const },
  { href: '/admin/pedidos', icon: TrendingDown, label: 'Impacto por pedidos', description: 'Revisa el impacto operativo de pedidos pendientes y confirmados.', tone: 'purple' as const },
];

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
    <AdminBasePage
      eyebrow="Operación"
      title="Inventario"
      description="Control real de stock, escaneo de productos y movimientos de bodega conectado al estado actual de la plataforma."
      actions={
        <button onClick={() => void loadSummary()} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-yellow-300 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-black disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      }
    >
      <AdminBaseGrid cols="4">
        <AdminBaseMetric label="Productos" value={loading ? '…' : summary?.total_products ?? '—'} hint="desde /api/admin/estado" />
        <AdminBaseMetric label="Stock bajo" value={loading ? '…' : summary?.low_stock ?? '—'} hint="requiere revisión" />
        <AdminBaseMetric label="Sin stock" value={loading ? '…' : summary?.out_of_stock ?? '—'} hint="crítico" />
        <AdminBaseMetric label="Unidades" value={loading ? '…' : summary?.total_units ?? '—'} hint="stock total" />
      </AdminBaseGrid>

      {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">{error}</div> : null}

      <Link href="/admin/inventario/scan" className="group flex items-center justify-between gap-4 rounded-[2rem] border border-yellow-300/25 bg-yellow-300/10 p-5 transition hover:bg-yellow-300/15">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-300/20 text-yellow-200">
            <ScanLine className="h-5 w-5" />
          </div>
          <div>
            <div className="font-black text-white">Abrir escáner</div>
            <div className="text-xs text-zinc-400">Lee EAN-13 y QR con la cámara del dispositivo</div>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-yellow-300 transition-transform group-hover:translate-x-1" />
      </Link>

      {!loading && summary && (summary.low_stock > 0 || summary.out_of_stock > 0) ? (
        <div className="flex items-start gap-3 rounded-2xl border border-orange-500/25 bg-orange-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
          <div className="text-sm text-orange-100">
            <strong>Atención:</strong>{' '}
            {summary.out_of_stock > 0 ? `${summary.out_of_stock} producto(s) sin stock. ` : ''}
            {summary.low_stock > 0 ? `${summary.low_stock} producto(s) con stock bajo.` : ''}{' '}
            <Link href="/admin/productos" className="font-bold underline hover:text-white">Revisar catálogo →</Link>
          </div>
        </div>
      ) : null}

      <div className="rounded-[2rem] border border-white/10 bg-black/30 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-yellow-300">Módulos reales</p>
            <h2 className="mt-1 text-xl font-black text-white">Acciones de inventario</h2>
          </div>
        </div>
        <AdminBaseGrid cols="2">
          {MODULES.map((module) => (
            <AdminBaseCard key={module.href} href={module.href} icon={module.icon} title={module.label} description={module.description} tone={module.tone} badge={module.badge} />
          ))}
        </AdminBaseGrid>
      </div>
    </AdminBasePage>
  );
}

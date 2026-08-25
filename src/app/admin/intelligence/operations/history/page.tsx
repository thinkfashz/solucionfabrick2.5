'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, History, Loader2, RefreshCw, ShieldCheck, TrendingDown, TrendingUp, Watch } from 'lucide-react';
import { AdminEmptyState, AdminPage, AdminPageHeader, AdminStat, AdminStats, AdminSurface } from '@/components/admin/AdminPage';

type HistoryRow = {
  supplier_price: number | string;
  currency?: string | null;
  in_stock?: boolean | null;
  source_url?: string | null;
  observed_at?: string | null;
};

type Payload = {
  ok?: boolean;
  product?: {
    id: string;
    name?: string | null;
    price?: number | string | null;
    supplier_price?: number | string | null;
    source?: string | null;
    source_url?: string | null;
    stock?: number | null;
  };
  watch?: {
    id: string;
    enabled?: boolean;
    check_interval_minutes?: number;
    last_checked_at?: string | null;
    last_status?: string | null;
    last_error?: string | null;
  } | null;
  history?: HistoryRow[];
  summary?: {
    observations: number;
    firstPrice: number;
    latestPrice: number;
    changePercent: number;
    minPrice: number;
    maxPrice: number;
  };
  error?: string;
};

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export default function PriceHistoryPage() {
  const search = useSearchParams();
  const productId = search.get('productId') || '';
  const [data, setData] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    if (!productId) {
      setError('Falta productId en la URL.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/intelligence/operations/history?productId=${encodeURIComponent(productId)}`, { cache: 'no-store' });
      const json = await response.json() as Payload;
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar el historial.');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [productId]);

  async function checkNow() {
    setChecking(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/intelligence/operations/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo ejecutar Price Watch.');
      setMessage(
        json.matched?.ok === false
          ? `Revisión ejecutada con observación: ${json.matched?.error || 'sin precio detectable'}`
          : 'Revisión completada. El historial ya fue actualizado.',
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ejecutar Price Watch.');
    } finally {
      setChecking(false);
    }
  }

  const rows = data.history || [];
  const chart = useMemo(() => {
    const values = rows.map((row) => Number(row.supplier_price || 0)).filter((value) => value > 0);
    if (!values.length) return [] as Array<{ x: number; y: number; value: number }>;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1, max - min);
    return values.map((value, index) => ({
      x: values.length === 1 ? 50 : (index / (values.length - 1)) * 100,
      y: 92 - ((value - min) / range) * 78,
      value,
    }));
  }, [rows]);
  const polyline = chart.map((point) => `${point.x},${point.y}`).join(' ');
  const summary = data.summary;
  const changePositive = (summary?.changePercent || 0) > 0;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Fabrick Intelligence · Price Watch"
        title={data.product?.name || 'Historial de proveedor'}
        description="Observa la evolución del costo detectado en el proveedor. Una revisión nunca cambia el precio de venta automáticamente."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/intelligence/operations" className="rounded-xl border border-black/10 bg-white/65 px-4 py-2.5 text-xs font-black text-[#514b42] transition hover:border-[#c77a00]/35 hover:text-[#9b6a12]">
              Operaciones
            </Link>
            <button
              type="button"
              onClick={() => void checkNow()}
              disabled={checking || !data.watch?.enabled}
              className="inline-flex items-center gap-2 rounded-xl bg-[#171612] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#2b2924] disabled:opacity-35"
            >
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Revisar ahora
            </button>
          </div>
        )}
      />

      {error ? <div className="rounded-[16px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
      {message ? <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div> : null}

      {loading ? (
        <div className="grid min-h-[420px] place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#c77a00]" />
        </div>
      ) : null}

      {!loading && data.product ? (
        <>
          <AdminStats>
            <AdminStat label="Costo actual" value={money.format(summary?.latestPrice || Number(data.product.supplier_price || 0))} note="Última observación disponible" icon={History} />
            <AdminStat label="Mínimo observado" value={summary?.minPrice ? money.format(summary.minPrice) : 'N/D'} note={`${summary?.observations || 0} observaciones`} icon={TrendingDown} />
            <AdminStat label="Máximo observado" value={summary?.maxPrice ? money.format(summary.maxPrice) : 'N/D'} note="Máximo del historial" icon={TrendingUp} />
            <AdminStat label="Variación total" value={`${summary?.changePercent || 0}%`} note={changePositive ? 'Costo al alza' : 'Costo estable o a la baja'} icon={changePositive ? TrendingUp : TrendingDown} />
          </AdminStats>

          <AdminSurface
            title="Evolución del costo proveedor"
            description={`${summary?.observations || 0} observaciones registradas. El gráfico usa únicamente precios positivos detectados.`}
          >
            {chart.length ? (
              <div className="rounded-[16px] border border-black/8 bg-[#f7f2e9] p-3">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-64 w-full overflow-visible">
                  <line x1="0" x2="100" y1="92" y2="92" stroke="rgba(23,22,18,.12)" strokeWidth=".5" />
                  <line x1="0" x2="100" y1="14" y2="14" stroke="rgba(23,22,18,.12)" strokeWidth=".5" />
                  <polyline fill="none" stroke="#c77a00" strokeWidth="1.6" vectorEffect="non-scaling-stroke" points={polyline} />
                  {chart.map((point, index) => (
                    <circle key={index} cx={point.x} cy={point.y} r="1.3" fill="#c77a00" vectorEffect="non-scaling-stroke" />
                  ))}
                </svg>
              </div>
            ) : (
              <AdminEmptyState
                title="Todavía no hay observaciones suficientes"
                description="Activa Price Watch y ejecuta revisiones para construir el historial del proveedor."
                icon={History}
              />
            )}
          </AdminSurface>

          <div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr]">
            <AdminSurface title="Estado del monitor" description="Frecuencia y resultado de la última comprobación automática.">
              <div className="space-y-3 text-sm leading-6 text-[#716b60]">
                <p>Estado: <b className="text-[#171612]">{data.watch?.enabled ? 'Activo' : 'Desactivado'}</b></p>
                <p>Intervalo: <b className="text-[#171612]">{data.watch?.check_interval_minutes ? `${Math.round(data.watch.check_interval_minutes / 60)} h` : 'N/D'}</b></p>
                <p>Última revisión: <b className="text-[#171612]">{data.watch?.last_checked_at ? new Date(data.watch.last_checked_at).toLocaleString('es-CL') : 'Nunca'}</b></p>
                <p>Resultado: <b className="text-[#171612]">{data.watch?.last_status || 'Sin ejecutar'}</b></p>
                {data.watch?.last_error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">{data.watch.last_error}</p> : null}
              </div>

              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900/80">
                <ShieldCheck className="mr-2 inline h-4 w-4" /> Las variaciones relevantes generan propuestas para aprobación; no cambios automáticos.
              </div>

              {data.product.source_url ? (
                <a href={data.product.source_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#9b6a12]">
                  <ExternalLink className="h-4 w-4" /> Abrir proveedor
                </a>
              ) : null}
            </AdminSurface>

            <AdminSurface title="Observaciones recientes" description="Últimas 30 lecturas del costo y disponibilidad detectada.">
              <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
                {[...rows].reverse().slice(0, 30).map((row, index) => (
                  <div key={`${row.observed_at}-${index}`} className="flex items-center justify-between gap-4 rounded-xl border border-black/8 bg-[#f7f2e9] p-3">
                    <div>
                      <b className="text-sm text-[#171612]">{money.format(Number(row.supplier_price || 0))}</b>
                      <p className="mt-1 text-[10px] text-[#8f887c]">{row.observed_at ? new Date(row.observed_at).toLocaleString('es-CL') : 'Sin fecha'}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${row.in_stock === false ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>
                      {row.in_stock === false ? 'Sin stock' : row.in_stock === true ? 'Con stock' : 'Stock N/D'}
                    </span>
                  </div>
                ))}
                {!rows.length ? <p className="rounded-xl border border-black/8 bg-[#f7f2e9] p-4 text-sm text-[#817a6f]">Sin historial todavía.</p> : null}
              </div>
            </AdminSurface>
          </div>
        </>
      ) : null}

      {!loading && !data.product && !error ? (
        <AdminEmptyState title="Producto no disponible" description="Abre este historial desde Fabrick Operations para incluir un productId válido." icon={Watch} />
      ) : null}
    </AdminPage>
  );
}

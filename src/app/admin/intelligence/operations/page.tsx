'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Boxes, ChartNoAxesCombined, CircleDollarSign, ExternalLink, Loader2, RefreshCw, ShieldCheck, TriangleAlert, Watch } from 'lucide-react';
import { AdminEmptyState, AdminPage, AdminPageHeader, AdminStat, AdminStats, AdminSurface } from '@/components/admin/AdminPage';

type Product = {
  id: string;
  name: string;
  active: boolean;
  price: number;
  stock: number;
  stockStatus: 'out' | 'critical' | 'low' | 'ok';
  source?: string | null;
  sourceUrl?: string | null;
  supplierPrice: number;
  supplierCurrency: string;
  marginPercent: number;
  marginStatus: 'risk' | 'ok';
  watch?: { id: string; enabled: boolean; intervalMinutes: number; lastCheckedAt?: string | null; lastStatus?: string | null; lastError?: string | null } | null;
  latestObservation?: { supplierPrice: number; currency: string; inStock?: boolean | null; observedAt?: string | null; deltaPercent: number } | null;
};

type Payload = {
  ok?: boolean;
  summary?: { products: number; activeProducts: number; outOfStock: number; criticalStock: number; lowStock: number; marginRisk: number; watchEnabled: number; watchCandidates: number };
  products?: Product[];
  error?: string;
};

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export default function IntelligenceOperationsPage() {
  const [data, setData] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const [filter, setFilter] = useState<'all' | 'stock' | 'margin' | 'watch'>('all');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/intelligence/operations', { cache: 'no-store' });
      const json = await response.json() as Payload;
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar Fabrick Operations.');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando datos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const products = useMemo(() => {
    const list = data.products || [];
    if (filter === 'stock') return list.filter((product) => product.stockStatus !== 'ok');
    if (filter === 'margin') return list.filter((product) => product.marginStatus === 'risk');
    if (filter === 'watch') return list.filter((product) => product.watch?.enabled || product.sourceUrl);
    return list;
  }, [data.products, filter]);

  async function toggleWatch(product: Product) {
    setSaving(product.id);
    setError('');
    try {
      const response = await fetch('/api/admin/intelligence/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, enabled: !(product.watch?.enabled ?? false), intervalMinutes: product.watch?.intervalMinutes || 1440 }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo cambiar el monitor.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el monitor.');
    } finally {
      setSaving('');
    }
  }

  const summary = data.summary;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Fabrick Intelligence · Operations"
        title="Precios, margen y stock en una sola vista"
        description="Detecta quiebres de stock, margen bajo y productos listos para monitorizar por proveedor. Activar Price Watch no cambia precios ni publica productos."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/intelligence" className="rounded-xl border border-black/10 bg-white/65 px-4 py-2.5 text-xs font-black text-[#514b42] transition hover:border-[#c77a00]/35 hover:text-[#9b6a12]">
              Centro Intelligence
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#171612] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#2b2924] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
          </div>
        )}
      />

      {summary ? (
        <AdminStats>
          <AdminStat label="Stock crítico" value={summary.outOfStock + summary.criticalStock} note={`${summary.outOfStock} agotados · ${summary.lowStock} bajos`} icon={Boxes} />
          <AdminStat label="Margen en riesgo" value={summary.marginRisk} note="Margen inferior al 25 %" icon={CircleDollarSign} />
          <AdminStat label="Monitores activos" value={summary.watchEnabled} note={`${summary.watchCandidates} candidatos disponibles`} icon={Watch} />
          <AdminStat label="Productos activos" value={summary.activeProducts} note={`${summary.products} productos analizados`} icon={ShieldCheck} />
        </AdminStats>
      ) : null}

      {error ? (
        <div className="rounded-[16px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <TriangleAlert className="mr-2 inline h-4 w-4" />{error}
        </div>
      ) : null}

      <AdminSurface
        title="Control operativo"
        description="Filtra alertas y activa monitoreo solo en productos que tengan una URL de proveedor disponible."
        actions={(
          <div className="flex flex-wrap gap-1.5">
            {([['all', 'Todos'], ['stock', 'Stock'], ['margin', 'Margen'], ['watch', 'Price Watch']] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-[.12em] transition ${filter === key ? 'bg-[#171612] text-white' : 'border border-black/10 bg-white/70 text-[#817a6f] hover:text-[#9b6a12]'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      >
        {loading ? (
          <div className="grid min-h-[360px] place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#c77a00]" />
          </div>
        ) : products.length ? (
          <div className="space-y-3">
            {products.map((product) => (
              <article key={product.id} className="rounded-[18px] border border-black/10 bg-white/72 p-4 shadow-[0_12px_30px_rgba(70,55,25,.05)] sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge text={stockLabel(product.stockStatus)} tone={product.stockStatus === 'ok' ? 'green' : product.stockStatus === 'low' ? 'amber' : 'red'} />
                      <Badge text={`Margen ${product.marginPercent}%`} tone={product.marginStatus === 'risk' ? 'red' : 'green'} />
                      {product.watch?.enabled ? <Badge text="Monitor activo" tone="gold" /> : null}
                    </div>
                    <h3 className="mt-3 text-lg font-black tracking-[-.025em] text-[#171612] sm:text-xl">{product.name}</h3>
                    <p className="mt-1 text-xs leading-5 text-[#817a6f]">
                      {product.source || 'Proveedor sin identificar'}
                      {product.latestObservation?.observedAt ? ` · última observación ${new Date(product.latestObservation.observedAt).toLocaleString('es-CL')}` : ''}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 lg:min-w-[390px]">
                    <Mini label="Venta" value={money.format(product.price)} />
                    <Mini label="Proveedor" value={product.supplierPrice ? money.format(product.supplierPrice) : 'N/D'} />
                    <Mini label="Stock" value={String(product.stock)} />
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <Link
                    href={`/admin/intelligence/operations/history?productId=${encodeURIComponent(product.id)}`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#c77a00]/20 bg-[#fff7e8] px-4 text-xs font-black text-[#9b6a12]"
                  >
                    <ChartNoAxesCombined className="h-4 w-4" /> Historial de precio
                  </Link>

                  {product.sourceUrl ? (
                    <a
                      href={product.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-black text-[#514b42]"
                    >
                      <ExternalLink className="h-4 w-4" /> Ver proveedor
                    </a>
                  ) : (
                    <span className="inline-flex h-11 items-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-xs text-amber-800">
                      Sin URL de proveedor
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={!product.sourceUrl || saving === product.id}
                    onClick={() => void toggleWatch(product)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#c77a00] px-4 text-xs font-black text-white transition hover:bg-[#a96500] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    {saving === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Watch className="h-4 w-4" />}
                    {product.watch?.enabled ? 'Desactivar monitor' : 'Activar monitor diario'}
                  </button>

                  {product.watch?.lastError ? <span className="text-xs text-red-700">Último error: {product.watch.lastError}</span> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="No hay productos para este filtro"
            description="Prueba con otra vista o actualiza la información operativa."
            icon={Boxes}
          />
        )}
      </AdminSurface>
    </AdminPage>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/8 bg-[#f7f2e9] p-3">
      <p className="text-[9px] font-black uppercase tracking-[.12em] text-[#8f887c]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#171612]">{value}</p>
    </div>
  );
}

function Badge({ text, tone }: { text: string; tone: 'green' | 'amber' | 'red' | 'gold' }) {
  const cls = tone === 'green'
    ? 'bg-emerald-50 text-emerald-800'
    : tone === 'amber'
      ? 'bg-amber-50 text-amber-800'
      : tone === 'red'
        ? 'bg-red-50 text-red-800'
        : 'bg-[#fff2d8] text-[#9b6a12]';
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${cls}`}>{text}</span>;
}

function stockLabel(status: Product['stockStatus']) {
  return status === 'out' ? 'Agotado' : status === 'critical' ? 'Stock crítico' : status === 'low' ? 'Stock bajo' : 'Stock OK';
}

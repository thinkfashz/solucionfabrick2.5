'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Boxes, ChartNoAxesCombined, CircleDollarSign, ExternalLink, Loader2, RefreshCw, ShieldCheck, TriangleAlert, Watch } from 'lucide-react';

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
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/intelligence/operations', { cache: 'no-store' });
      const json = await response.json() as Payload;
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar Fabrick Operations.');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando datos.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const products = useMemo(() => {
    const list = data.products || [];
    if (filter === 'stock') return list.filter((p) => p.stockStatus !== 'ok');
    if (filter === 'margin') return list.filter((p) => p.marginStatus === 'risk');
    if (filter === 'watch') return list.filter((p) => p.watch?.enabled || p.sourceUrl);
    return list;
  }, [data.products, filter]);

  async function toggleWatch(product: Product) {
    setSaving(product.id); setError('');
    try {
      const response = await fetch('/api/admin/intelligence/operations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, enabled: !(product.watch?.enabled ?? false), intervalMinutes: product.watch?.intervalMinutes || 1440 }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo cambiar el monitor.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el monitor.');
    } finally { setSaving(''); }
  }

  const s = data.summary;
  return <main className="min-h-screen bg-[#101116] px-4 py-6 text-white sm:px-6">
    <section className="mx-auto max-w-7xl space-y-5">
      <header className="rounded-[2rem] border border-[#f4cf57]/20 bg-[radial-gradient(circle_at_top_right,rgba(244,207,87,.16),transparent_34%),#171820] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin/intelligence" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-white/45"><ArrowLeft className="h-4 w-4"/> Fabrick Intelligence</Link>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-white/60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/> Actualizar</button>
        </div>
        <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#f4cf57]/10 px-3 py-2 text-[10px] font-black uppercase tracking-[.18em] text-[#f4cf57]"><Watch className="h-4 w-4"/> V2 · Price Watch + Stock Intelligence</span>
        <h1 className="mt-4 text-4xl font-black tracking-[-.055em] sm:text-6xl">Precios, margen y stock en una sola vista.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">Detecta quiebres de stock, margen bajo y productos listos para monitorizar por proveedor. Activar el monitor no cambia precios ni publica productos.</p>
      </header>

      {s ? <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card icon={<Boxes className="h-5 w-5"/>} label="Stock crítico" value={String(s.outOfStock + s.criticalStock)} note={`${s.outOfStock} agotados · ${s.lowStock} bajos`}/>
        <Card icon={<CircleDollarSign className="h-5 w-5"/>} label="Margen en riesgo" value={String(s.marginRisk)} note="Margen inferior al 25 %"/>
        <Card icon={<Watch className="h-5 w-5"/>} label="Monitores activos" value={String(s.watchEnabled)} note={`${s.watchCandidates} candidatos disponibles`}/>
        <Card icon={<ShieldCheck className="h-5 w-5"/>} label="Productos activos" value={String(s.activeProducts)} note={`${s.products} productos analizados`}/>
      </section> : null}

      <section className="rounded-[2rem] border border-white/8 bg-white/[0.035] p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {([['all','Todos'],['stock','Stock'],['margin','Margen'],['watch','Price Watch']] as const).map(([key,label]) => <button key={key} onClick={() => setFilter(key)} className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[.12em] ${filter === key ? 'bg-[#f4cf57] text-black' : 'bg-white/5 text-white/50'}`}>{label}</button>)}
        </div>
        {error ? <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100"><TriangleAlert className="mr-2 inline h-4 w-4"/>{error}</p> : null}
        {loading ? <div className="grid min-h-[420px] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#f4cf57]"/></div> : <div className="mt-5 space-y-3">
          {products.map((product) => <article key={product.id} className="rounded-[1.6rem] border border-white/8 bg-black/20 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge text={stockLabel(product.stockStatus)} tone={product.stockStatus === 'ok' ? 'green' : product.stockStatus === 'low' ? 'amber' : 'red'}/>
                  <Badge text={`Margen ${product.marginPercent}%`} tone={product.marginStatus === 'risk' ? 'red' : 'green'}/>
                  {product.watch?.enabled ? <Badge text="Monitor activo" tone="gold"/> : null}
                </div>
                <h2 className="mt-3 text-lg font-black sm:text-xl">{product.name}</h2>
                <p className="mt-1 text-xs text-white/35">{product.source || 'Proveedor sin identificar'}{product.latestObservation?.observedAt ? ` · última observación ${new Date(product.latestObservation.observedAt).toLocaleString('es-CL')}` : ''}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 lg:min-w-[390px]">
                <Mini label="Venta" value={money.format(product.price)}/>
                <Mini label="Proveedor" value={product.supplierPrice ? money.format(product.supplierPrice) : 'N/D'}/>
                <Mini label="Stock" value={String(product.stock)}/>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Link href={`/admin/intelligence/operations/history?productId=${encodeURIComponent(product.id)}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#f4cf57]/20 bg-[#f4cf57]/[0.06] px-4 text-xs font-black text-[#f4cf57]"><ChartNoAxesCombined className="h-4 w-4"/> Historial de precio</Link>
              {product.sourceUrl ? <a href={product.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-black"><ExternalLink className="h-4 w-4"/> Ver proveedor</a> : <span className="inline-flex h-11 items-center rounded-xl border border-amber-300/10 bg-amber-300/[0.04] px-4 text-xs text-amber-100/60">Sin URL de proveedor</span>}
              <button disabled={!product.sourceUrl || saving === product.id} onClick={() => void toggleWatch(product)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#f4cf57] px-4 text-xs font-black text-black disabled:cursor-not-allowed disabled:opacity-35">{saving === product.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Watch className="h-4 w-4"/>}{product.watch?.enabled ? 'Desactivar monitor' : 'Activar monitor diario'}</button>
              {product.watch?.lastError ? <span className="text-xs text-red-200/70">Último error: {product.watch.lastError}</span> : null}
            </div>
          </article>)}
          {!products.length ? <div className="grid min-h-[320px] place-items-center rounded-[1.6rem] border border-dashed border-white/10 p-8 text-center text-sm text-white/40">No hay productos para este filtro.</div> : null}
        </div>}
      </section>
    </section>
  </main>;
}

function Card({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return <article className="rounded-[1.5rem] border border-white/8 bg-white/[0.035] p-5"><div className="flex items-center gap-2 text-[#f4cf57]">{icon}<span className="text-[10px] font-black uppercase tracking-[.14em]">{label}</span></div><p className="mt-3 text-4xl font-black tracking-[-.05em]">{value}</p><p className="mt-1 text-xs text-white/35">{note}</p></article>;
}
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white/5 p-3"><p className="text-[9px] font-black uppercase tracking-[.12em] text-white/35">{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>; }
function Badge({ text, tone }: { text: string; tone: 'green'|'amber'|'red'|'gold' }) {
  const cls = tone === 'green' ? 'bg-emerald-400/10 text-emerald-200' : tone === 'amber' ? 'bg-amber-300/10 text-amber-100' : tone === 'red' ? 'bg-red-400/10 text-red-200' : 'bg-[#f4cf57]/10 text-[#f4cf57]';
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${cls}`}>{text}</span>;
}
function stockLabel(status: Product['stockStatus']) { return status === 'out' ? 'Agotado' : status === 'critical' ? 'Stock crítico' : status === 'low' ? 'Stock bajo' : 'Stock OK'; }

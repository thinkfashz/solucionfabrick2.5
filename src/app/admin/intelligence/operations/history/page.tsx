'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, History, Loader2, RefreshCw, ShieldCheck, TrendingDown, TrendingUp, Watch } from 'lucide-react';

type HistoryRow = { supplier_price: number | string; currency?: string | null; in_stock?: boolean | null; source_url?: string | null; observed_at?: string | null };
type Payload = {
  ok?: boolean;
  product?: { id: string; name?: string | null; price?: number | string | null; supplier_price?: number | string | null; source?: string | null; source_url?: string | null; stock?: number | null };
  watch?: { id: string; enabled?: boolean; check_interval_minutes?: number; last_checked_at?: string | null; last_status?: string | null; last_error?: string | null } | null;
  history?: HistoryRow[];
  summary?: { observations: number; firstPrice: number; latestPrice: number; changePercent: number; minPrice: number; maxPrice: number };
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
    if (!productId) { setError('Falta productId en la URL.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/admin/intelligence/operations/history?productId=${encodeURIComponent(productId)}`, { cache: 'no-store' });
      const json = await response.json() as Payload;
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar el historial.');
      setData(json);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar el historial.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [productId]);

  async function checkNow() {
    setChecking(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/admin/intelligence/operations/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo ejecutar Price Watch.');
      setMessage(json.matched?.ok === false ? `Revisión ejecutada con observación: ${json.matched?.error || 'sin precio detectable'}` : 'Revisión completada. El historial ya fue actualizado.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo ejecutar Price Watch.'); }
    finally { setChecking(false); }
  }

  const rows = data.history || [];
  const chart = useMemo(() => {
    const values = rows.map((r) => Number(r.supplier_price || 0)).filter((v) => v > 0);
    if (!values.length) return [] as Array<{ x: number; y: number; value: number }>;
    const min = Math.min(...values); const max = Math.max(...values); const range = Math.max(1, max - min);
    return values.map((value, i) => ({ x: values.length === 1 ? 50 : (i / (values.length - 1)) * 100, y: 92 - ((value - min) / range) * 78, value }));
  }, [rows]);
  const polyline = chart.map((p) => `${p.x},${p.y}`).join(' ');
  const s = data.summary;
  const changePositive = (s?.changePercent || 0) > 0;

  return <main className="min-h-screen bg-[#101116] px-4 py-6 text-white sm:px-6"><section className="mx-auto max-w-6xl space-y-5">
    <header className="rounded-[2rem] border border-[#f4cf57]/20 bg-[radial-gradient(circle_at_top_right,rgba(244,207,87,.16),transparent_34%),#171820] p-6 sm:p-8">
      <Link href="/admin/intelligence/operations" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-white/45"><ArrowLeft className="h-4 w-4"/> Operaciones</Link>
      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><span className="inline-flex items-center gap-2 rounded-full bg-[#f4cf57]/10 px-3 py-2 text-[10px] font-black uppercase tracking-[.18em] text-[#f4cf57]"><History className="h-4 w-4"/> Historial Price Watch</span><h1 className="mt-4 text-3xl font-black tracking-[-.045em] sm:text-5xl">{data.product?.name || 'Historial de proveedor'}</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">Observa la evolución real del costo del proveedor. Ninguna revisión cambia el precio de venta automáticamente.</p></div><button onClick={() => void checkNow()} disabled={checking || !data.watch?.enabled} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#f4cf57] px-5 text-xs font-black uppercase tracking-[.12em] text-black disabled:opacity-35">{checking ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>} Revisar ahora</button></div>
    </header>

    {error ? <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</div> : null}
    {message ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">{message}</div> : null}
    {loading ? <div className="grid min-h-[420px] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#f4cf57]"/></div> : null}

    {!loading && data.product ? <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Costo actual" value={money.format(s?.latestPrice || Number(data.product.supplier_price || 0))} />
        <Metric label="Mínimo observado" value={s?.minPrice ? money.format(s.minPrice) : 'N/D'} />
        <Metric label="Máximo observado" value={s?.maxPrice ? money.format(s.maxPrice) : 'N/D'} />
        <Metric label="Variación total" value={`${s?.changePercent || 0}%`} icon={changePositive ? <TrendingUp className="h-5 w-5"/> : <TrendingDown className="h-5 w-5"/>} />
      </section>

      <section className="rounded-[2rem] border border-white/8 bg-white/[0.035] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#f4cf57]">Evolución</p><h2 className="mt-1 text-2xl font-black">Costo del proveedor</h2></div><span className="text-xs text-white/35">{s?.observations || 0} observaciones</span></div>
        {chart.length ? <div className="mt-6 rounded-[1.5rem] border border-white/8 bg-black/20 p-3"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-64 w-full overflow-visible"><line x1="0" x2="100" y1="92" y2="92" stroke="rgba(255,255,255,.08)" strokeWidth=".5"/><line x1="0" x2="100" y1="14" y2="14" stroke="rgba(255,255,255,.08)" strokeWidth=".5"/><polyline fill="none" stroke="#f4cf57" strokeWidth="1.6" vectorEffect="non-scaling-stroke" points={polyline}/>{chart.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1.3" fill="#f4cf57" vectorEffect="non-scaling-stroke"/>)}</svg></div> : <div className="mt-6 grid min-h-64 place-items-center rounded-[1.5rem] border border-dashed border-white/10 text-sm text-white/35">Todavía no hay observaciones suficientes.</div>}
      </section>

      <section className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
        <article className="rounded-[2rem] border border-white/8 bg-white/[0.035] p-5"><div className="flex items-center gap-3"><Watch className="h-5 w-5 text-[#f4cf57]"/><h3 className="font-black">Estado del monitor</h3></div><div className="mt-5 space-y-3 text-sm text-white/55"><p>Estado: <b className="text-white">{data.watch?.enabled ? 'Activo' : 'Desactivado'}</b></p><p>Intervalo: <b className="text-white">{data.watch?.check_interval_minutes ? `${Math.round(data.watch.check_interval_minutes / 60)} h` : 'N/D'}</b></p><p>Última revisión: <b className="text-white">{data.watch?.last_checked_at ? new Date(data.watch.last_checked_at).toLocaleString('es-CL') : 'Nunca'}</b></p><p>Resultado: <b className="text-white">{data.watch?.last_status || 'Sin ejecutar'}</b></p>{data.watch?.last_error ? <p className="rounded-xl bg-red-400/10 p-3 text-red-100">{data.watch.last_error}</p> : null}</div><div className="mt-5 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] p-3 text-xs leading-5 text-emerald-100/70"><ShieldCheck className="mr-2 inline h-4 w-4"/> Las variaciones relevantes generan propuestas para aprobación; no cambios automáticos.</div>{data.product.source_url ? <a href={data.product.source_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#f4cf57]"><ExternalLink className="h-4 w-4"/> Abrir proveedor</a> : null}</article>
        <article className="rounded-[2rem] border border-white/8 bg-white/[0.035] p-5"><h3 className="font-black">Observaciones recientes</h3><div className="mt-4 max-h-[420px] space-y-2 overflow-auto pr-1">{[...rows].reverse().slice(0, 30).map((row, index) => <div key={`${row.observed_at}-${index}`} className="flex items-center justify-between gap-4 rounded-xl bg-black/20 p-3"><div><b className="text-sm">{money.format(Number(row.supplier_price || 0))}</b><p className="mt-1 text-[10px] text-white/35">{row.observed_at ? new Date(row.observed_at).toLocaleString('es-CL') : 'Sin fecha'}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${row.in_stock === false ? 'bg-red-400/10 text-red-200' : 'bg-emerald-400/10 text-emerald-200'}`}>{row.in_stock === false ? 'Sin stock' : row.in_stock === true ? 'Con stock' : 'Stock N/D'}</span></div>)}{!rows.length ? <p className="rounded-xl bg-black/20 p-4 text-sm text-white/35">Sin historial todavía.</p> : null}</div></article>
      </section>
    </> : null}
  </section></main>;
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) { return <article className="rounded-[1.5rem] border border-white/8 bg-white/[0.035] p-5"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-[.14em] text-white/35">{label}</p>{icon ? <span className="text-[#f4cf57]">{icon}</span> : null}</div><p className="mt-3 text-3xl font-black tracking-[-.05em]">{value}</p></article>; }

'use client';

import { useEffect, useState } from 'react';
import { Copy, ExternalLink, RefreshCcw, Trash2 } from 'lucide-react';

type RecordRow = { id: string; slug: string; cliente: string; empresa_cliente?: string; titulo?: string; estado?: string; total_con_iva?: number | string; public_link?: string; generated_at?: string };
const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function rowsFrom(json: any): RecordRow[] {
  if (Array.isArray(json.records)) return json.records;
  const rows = json?.data?.data?.rows;
  return Array.isArray(rows) ? rows : [];
}
function fmt(date?: string) { const d = new Date(date || ''); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }); }
function price(value: unknown) { const n = Number(value); return Number.isFinite(n) ? money.format(n) : '$0'; }

export default function BudgetLinksHistory() {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/presupuestos/registros', { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setStatus(json.error || 'No pude cargar presupuestos.'); return; }
    setRecords(rowsFrom(json));
    setStatus('');
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este presupuesto del historial?')) return;
    const res = await fetch(`/api/admin/presupuestos/registros?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setStatus(json.error || 'No se pudo eliminar.'); return; }
    setRecords((list) => list.filter((item) => item.id !== id));
    setStatus('Presupuesto eliminado.');
  }

  useEffect(() => { void load(); }, []);

  return <section className="mx-auto mt-4 w-full max-w-[1680px] rounded-[28px] border border-amber-300/15 bg-black/55 p-4 text-white shadow-[0_24px_90px_rgba(0,0,0,.45)] backdrop-blur-2xl">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.32em] text-amber-300">Historial presupuestos</p><h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Links generados Radier / Aire</h2></div><button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm font-black text-amber-100 disabled:opacity-60"><RefreshCcw className="h-4 w-4" />Actualizar</button></div>
    {status && <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-100">{status}</p>}
    <div className="mt-4 grid gap-2">{records.length ? records.map((row) => { const url = row.public_link || `${location.origin}/presupuestos/${row.slug}`; return <article key={row.id} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 md:grid-cols-[1fr_auto] md:items-center"><div className="min-w-0"><b className="block truncate text-white">{row.titulo || row.slug}</b><span className="mt-1 block text-xs text-white/45">{row.cliente} · {row.empresa_cliente || 'sin empresa'} · {price(row.total_con_iva)} · {fmt(row.generated_at)}</span><a href={url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-amber-200 underline">{url}</a></div><div className="flex flex-wrap gap-2"><button onClick={() => navigator.clipboard.writeText(url)} className="rounded-xl bg-white/[.06] p-3 text-white"><Copy className="h-4 w-4" /></button><a href={url} target="_blank" rel="noreferrer" className="rounded-xl bg-white/[.06] p-3 text-white"><ExternalLink className="h-4 w-4" /></a><button onClick={() => remove(row.id)} className="rounded-xl bg-red-500/10 p-3 text-red-300"><Trash2 className="h-4 w-4" /></button></div></article>; }) : <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-white/50">No hay presupuestos guardados todavía.</p>}</div>
  </section>;
}

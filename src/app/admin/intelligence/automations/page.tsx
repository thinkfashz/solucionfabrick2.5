'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, Clock3, Loader2, RefreshCw, ShieldCheck, TriangleAlert, Workflow } from 'lucide-react';

type Automation = {
  id: string;
  name: string;
  description: string;
  schedule: string;
  status: 'active' | 'warning' | 'idle';
  lastRunAt?: string | null;
  lastResult?: string | null;
  detail?: string;
  href: string;
};

type Payload = {
  generatedAt: string;
  summary: { total: number; active: number; warning: number; monitoredProducts: number };
  automations: Automation[];
};

export default function IntelligenceAutomationsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/intelligence/automations', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar Automation Center.');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando automatizaciones.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return <main className="min-h-screen bg-[#0f1015] px-4 py-5 text-white sm:px-6 lg:px-8">
    <section className="mx-auto max-w-[1500px] space-y-5">
      <header className="rounded-[2rem] border border-[#f4cf57]/20 bg-[radial-gradient(circle_at_top_right,rgba(244,207,87,.18),transparent_35%),linear-gradient(135deg,#191a22,#0b0c10)] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/intelligence" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-white/45"><ArrowLeft className="h-4 w-4"/> Intelligence</Link>
          <button onClick={() => void load()} disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#f4cf57] px-4 text-xs font-black text-black disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>} Actualizar</button>
        </div>
        <div className="mt-6 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f4cf57] text-black"><Workflow className="h-6 w-6"/></span><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#f4cf57]">Automation Center</p><p className="text-xs text-white/40">Fabrick Intelligence V2</p></div></div>
        <h1 className="mt-5 max-w-5xl text-4xl font-black tracking-[-.055em] sm:text-6xl">Automatizaciones visibles, auditables y bajo control.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">Unifica tareas programadas del agente, sus últimas ejecuciones y señales de advertencia. Las acciones comerciales sensibles siguen requiriendo aprobación.</p>
      </header>

      {error ? <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100"><TriangleAlert className="mr-2 inline h-4 w-4"/>{error}</div> : null}
      {loading ? <div className="grid min-h-[40vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#f4cf57]"/></div> : null}

      {data && !loading ? <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Automatizaciones" value={data.summary.total}/>
          <Metric label="Activas" value={data.summary.active}/>
          <Metric label="Advertencias" value={data.summary.warning}/>
          <Metric label="Productos monitorizados" value={data.summary.monitoredProducts}/>
        </section>

        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {data.automations.map((item) => <article key={item.id} className="rounded-[1.8rem] border border-white/8 bg-white/[0.035] p-5">
            <div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/7 text-[#f4cf57]"><Bot className="h-5 w-5"/></span><Status value={item.status}/></div>
            <h2 className="mt-5 text-xl font-black">{item.name}</h2>
            <p className="mt-2 min-h-12 text-sm leading-6 text-white/48">{item.description}</p>
            <div className="mt-5 space-y-3 rounded-2xl bg-black/20 p-4 text-xs text-white/45">
              <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#f4cf57]"/>{item.schedule}</p>
              <p>Última ejecución: <b className="text-white/75">{item.lastRunAt ? new Date(item.lastRunAt).toLocaleString('es-CL') : 'Pendiente'}</b></p>
              <p>Resultado: <b className="text-white/75">{item.lastResult || 'Sin datos'}</b></p>
              {item.detail ? <p>{item.detail}</p> : null}
            </div>
            <Link href={item.href} className="mt-4 flex h-11 items-center justify-between rounded-xl bg-[#f4cf57] px-4 text-xs font-black text-black"><span>Abrir módulo</span><ArrowRight className="h-4 w-4"/></Link>
          </article>)}
        </section>

        <section className="rounded-[1.8rem] border border-emerald-400/15 bg-emerald-400/[0.05] p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300"/><div><h3 className="font-black">Modelo operativo seguro</h3><p className="mt-1 text-sm leading-6 text-white/50">Monitorear, analizar y crear propuestas puede ser automático. Publicar productos, alterar precios o ejecutar cambios comerciales sigue pasando por Policy Engine, aprobación y auditoría.</p></div></div></section>

        <footer className="rounded-[1.3rem] border border-white/8 bg-black/30 p-4 text-xs text-white/35">Actualizado {new Date(data.generatedAt).toLocaleString('es-CL')}</footer>
      </> : null}
    </section>
  </main>;
}

function Metric({ label, value }: { label: string; value: number }) { return <article className="rounded-[1.5rem] border border-white/8 bg-white/[0.035] p-5"><p className="text-3xl font-black">{value}</p><p className="mt-2 text-[10px] font-black uppercase tracking-[.15em] text-white/35">{label}</p></article>; }
function Status({ value }: { value: Automation['status'] }) { const cls = value === 'active' ? 'bg-emerald-400/10 text-emerald-200' : value === 'warning' ? 'bg-amber-300/10 text-amber-100' : 'bg-white/8 text-white/50'; const Icon = value === 'warning' ? TriangleAlert : CheckCircle2; return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.12em] ${cls}`}><Icon className="h-3.5 w-3.5"/>{value}</span>; }

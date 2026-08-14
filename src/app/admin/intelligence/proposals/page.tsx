'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Bot, Check, Loader2, Play, RefreshCw, X } from 'lucide-react';

type Proposal = {
  id: string;
  status: 'pending' | 'approved' | 'executed' | 'rejected' | 'failed';
  actorEmail: string;
  actorRole: string;
  createdAt: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
  executedAt?: string | null;
  action: { type: string; resourceId?: string | null; payload: Record<string, unknown> };
  decision: { permission: string; requiresApproval: boolean };
  result?: Record<string, unknown> | null;
};

const STATUS: Record<Proposal['status'], string> = {
  pending: 'Pendiente', approved: 'Aprobada', executed: 'Ejecutada', rejected: 'Rechazada', failed: 'Fallida',
};

export default function IntelligenceProposalsPage() {
  const [items, setItems] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/intelligence/proposals', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudieron cargar las propuestas.');
      setItems(json.proposals || []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Error cargando propuestas.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function operate(id: string, operation: 'approve' | 'reject' | 'execute') {
    setWorking(`${id}:${operation}`); setError('');
    try {
      const res = await fetch(`/api/admin/intelligence/proposals/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo procesar la propuesta.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error procesando propuesta.'); }
    finally { setWorking(''); }
  }

  return <main className="min-h-screen bg-[#101116] px-4 py-6 text-white sm:px-6">
    <section className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-[2rem] border border-[#f4cf57]/20 bg-[radial-gradient(circle_at_top_right,rgba(244,207,87,.16),transparent_35%),#171820] p-6 sm:p-8">
        <Link href="/admin/intelligence/actions" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-white/45"><ArrowLeft className="h-4 w-4"/> Action Lab</Link>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><span className="inline-flex items-center gap-2 rounded-full bg-[#f4cf57]/10 px-3 py-2 text-[10px] font-black uppercase tracking-[.18em] text-[#f4cf57]"><Bot className="h-4 w-4"/> V2 · Approval Queue</span><h1 className="mt-4 text-4xl font-black tracking-[-.05em] sm:text-6xl">Propuestas y ejecución.</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">Nada se ejecuta sin pasar por política, tenant activo y aprobación cuando corresponde. Cada estado queda registrado en auditoría.</p></div><button onClick={() => void load()} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 text-xs font-black"><RefreshCw className="h-4 w-4"/> Actualizar</button></div>
      </header>

      {error ? <p className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</p> : null}
      {loading ? <div className="grid min-h-[35vh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-[#f4cf57]"/></div> : null}

      {!loading ? <section className="space-y-3">{items.length ? items.map((item) => <article key={item.id} className="rounded-[1.6rem] border border-white/8 bg-white/[0.035] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f4cf57]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-[#f4cf57]">{item.action.type}</span><span className="rounded-full bg-white/7 px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-white/55">{STATUS[item.status]}</span></div><h2 className="mt-3 truncate text-lg font-black">{String(item.action.payload.name || item.action.payload.title || item.action.resourceId || item.id)}</h2><p className="mt-1 text-xs text-white/40">{item.decision.permission} · {new Date(item.createdAt).toLocaleString('es-CL')} · {item.actorEmail}</p></div>
          <div className="flex flex-wrap gap-2">{item.status === 'pending' ? <><button disabled={!!working} onClick={() => void operate(item.id, 'approve')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#f4cf57] px-4 text-xs font-black text-black disabled:opacity-50"><Check className="h-4 w-4"/> Aprobar</button><button disabled={!!working} onClick={() => void operate(item.id, 'reject')} className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-4 text-xs font-black text-red-200 disabled:opacity-50"><X className="h-4 w-4"/> Rechazar</button></> : null}{item.status === 'approved' ? <button disabled={!!working} onClick={() => void operate(item.id, 'execute')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-300 px-4 text-xs font-black text-black disabled:opacity-50"><Play className="h-4 w-4"/> Ejecutar</button> : null}</div></div>
        <details className="mt-4 rounded-2xl bg-black/20 p-4 text-xs text-white/55"><summary className="cursor-pointer font-black text-white/70">Ver payload y resultado</summary><pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words">{JSON.stringify({ resourceId: item.action.resourceId || null, payload: item.action.payload, result: item.result || null }, null, 2)}</pre></details>
      </article>) : <div className="rounded-[2rem] border border-white/8 bg-white/[0.035] p-8 text-center text-sm text-white/45">Todavía no hay propuestas guardadas.</div>}</section> : null}
    </section>
  </main>;
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Bot, Check, CheckCircle2, Clock3, Loader2, Play, RefreshCw, ShieldCheck, X, XCircle } from 'lucide-react';
import { AdminEmptyState, AdminPage, AdminPageHeader, AdminStat, AdminStats, AdminSurface } from '@/components/admin/AdminPage';

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
  pending: 'Pendiente',
  approved: 'Aprobada',
  executed: 'Ejecutada',
  rejected: 'Rechazada',
  failed: 'Fallida',
};

export default function IntelligenceProposalsPage() {
  const [items, setItems] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/intelligence/proposals', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudieron cargar las propuestas.');
      setItems(json.proposals || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando propuestas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function operate(id: string, operation: 'approve' | 'reject' | 'execute') {
    setWorking(`${id}:${operation}`);
    setError('');
    try {
      const res = await fetch(`/api/admin/intelligence/proposals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo procesar la propuesta.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error procesando propuesta.');
    } finally {
      setWorking('');
    }
  }

  const pending = items.filter((item) => item.status === 'pending').length;
  const approved = items.filter((item) => item.status === 'approved').length;
  const executed = items.filter((item) => item.status === 'executed').length;
  const blocked = items.filter((item) => item.status === 'rejected' || item.status === 'failed').length;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Fabrick Intelligence · Approval Queue"
        title="Propuestas y ejecución"
        description="Nada se ejecuta sin pasar por política, tenant activo y aprobación cuando corresponde. Cada transición permanece registrada en auditoría."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/intelligence/actions" className="rounded-xl border border-black/10 bg-white/65 px-4 py-2.5 text-xs font-black text-[#514b42] transition hover:border-[#c77a00]/35 hover:text-[#9b6a12]">
              Action Lab
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

      <AdminStats>
        <AdminStat label="Pendientes" value={pending} note="Esperan decisión humana" icon={Clock3} />
        <AdminStat label="Aprobadas" value={approved} note="Listas para ejecutar" icon={ShieldCheck} />
        <AdminStat label="Ejecutadas" value={executed} note="Acciones completadas" icon={CheckCircle2} />
        <AdminStat label="Rechazadas / fallidas" value={blocked} note={`${items.length} propuestas registradas`} icon={XCircle} />
      </AdminStats>

      {error ? (
        <div className="rounded-[16px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}

      <AdminSurface
        title="Cola de aprobación"
        description="Revisa qué se quiere cambiar, quién originó la propuesta y qué permiso exige antes de aprobar o ejecutar."
      >
        {loading ? (
          <div className="grid min-h-72 place-items-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#c77a00]" />
          </div>
        ) : items.length ? (
          <div className="space-y-3">
            {items.map((item) => {
              const title = String(item.action.payload.name || item.action.payload.title || item.action.resourceId || item.id);
              return (
                <article key={item.id} className="rounded-[18px] border border-black/10 bg-white/72 p-4 shadow-[0_12px_30px_rgba(70,55,25,.05)] sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#fff2d8] px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-[#9b6a12]">
                          {item.action.type}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] ${statusTone(item.status)}`}>
                          {STATUS[item.status]}
                        </span>
                        {item.decision.requiresApproval ? (
                          <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] text-[#716b60]">
                            Requiere aprobación
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-3 truncate text-lg font-black tracking-[-.025em] text-[#171612]">{title}</h3>
                      <p className="mt-1 text-xs leading-5 text-[#817a6f]">
                        {item.decision.permission} · {new Date(item.createdAt).toLocaleString('es-CL')} · {item.actorEmail}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            disabled={!!working}
                            onClick={() => void operate(item.id, 'approve')}
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-[#2b2924] disabled:opacity-50"
                          >
                            {working === `${item.id}:approve` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aprobar
                          </button>
                          <button
                            type="button"
                            disabled={!!working}
                            onClick={() => void operate(item.id, 'reject')}
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-black text-red-800 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            {working === `${item.id}:reject` ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Rechazar
                          </button>
                        </>
                      ) : null}
                      {item.status === 'approved' ? (
                        <button
                          type="button"
                          disabled={!!working}
                          onClick={() => void operate(item.id, 'execute')}
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#c77a00] px-4 text-xs font-black text-white transition hover:bg-[#a96500] disabled:opacity-50"
                        >
                          {working === `${item.id}:execute` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Ejecutar
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <details className="mt-4 rounded-[14px] border border-black/8 bg-[#f7f2e9] p-4 text-xs text-[#716b60]">
                    <summary className="cursor-pointer font-black text-[#514b42]">Ver payload y resultado</summary>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5">
                      {JSON.stringify({ resourceId: item.action.resourceId || null, payload: item.action.payload, result: item.result || null }, null, 2)}
                    </pre>
                  </details>
                </article>
              );
            })}
          </div>
        ) : (
          <AdminEmptyState
            title="Todavía no hay propuestas"
            description="Las acciones sensibles creadas por Fabrick Intelligence aparecerán aquí antes de ejecutarse."
            icon={Bot}
          />
        )}
      </AdminSurface>
    </AdminPage>
  );
}

function statusTone(status: Proposal['status']) {
  if (status === 'executed') return 'bg-emerald-50 text-emerald-800';
  if (status === 'approved') return 'bg-sky-50 text-sky-800';
  if (status === 'rejected' || status === 'failed') return 'bg-red-50 text-red-800';
  return 'bg-amber-50 text-amber-800';
}

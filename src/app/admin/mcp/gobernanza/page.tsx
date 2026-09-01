'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock3,
  Gauge,
  Loader2,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';

type Policy = {
  enabled: boolean;
  requestLimit5m: number;
  writeLimit5m: number;
  approvalPublish: boolean;
  approvalInventory: boolean;
};

type Connection = {
  keyId: string;
  label: string;
  tokenPrefix: string;
  scopes: string[];
  legacy?: boolean;
  policy: Policy;
  usage: null | { windowStart: string; requestCount: number; writeCount: number };
};

type Approval = {
  id: string;
  key_id: string;
  client_label?: string | null;
  tool_name: string;
  summary?: string | null;
  payload?: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'consumed' | 'expired';
  requested_at: string;
  expires_at: string;
  decided_at?: string | null;
  decided_by?: string | null;
  decision_note?: string | null;
  consumed_at?: string | null;
};

type Audit = {
  id: string;
  key_id: string;
  client_label?: string | null;
  tool_name: string;
  phase: string;
  outcome: string;
  request_id?: string | null;
  result_summary?: Record<string, unknown>;
  created_at: string;
};

type GovernanceResponse = {
  connections: Connection[];
  approvals: Approval[];
  audit: Audit[];
  summary: { connections: number; pendingApprovals: number; approvedWaitingUse: number; auditedEvents: number };
};

const EMPTY: GovernanceResponse = {
  connections: [],
  approvals: [],
  audit: [],
  summary: { connections: 0, pendingApprovals: 0, approvedWaitingUse: 0, auditedEvents: 0 },
};

function dateLabel(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-CL');
}

function statusClass(status: Approval['status']) {
  if (status === 'pending') return 'border-amber-400/25 bg-amber-400/10 text-amber-200';
  if (status === 'approved') return 'border-sky-400/25 bg-sky-400/10 text-sky-200';
  if (status === 'consumed') return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200';
  if (status === 'rejected') return 'border-red-400/25 bg-red-500/10 text-red-200';
  return 'border-white/10 bg-white/5 text-zinc-400';
}

function PolicyEditor({ connection, onSaved }: { connection: Connection; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState(connection.policy);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => setDraft(connection.policy), [connection.policy]);

  async function save() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/mcp/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_policy', keyId: connection.keyId, ...draft }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la política.');
      setMessage('Guardado');
      await onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black text-white">{connection.label || 'Cliente MCP'}</p>
            {connection.legacy && <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-yellow-200">legacy</span>}
          </div>
          <p className="mt-1 font-mono text-[11px] text-zinc-500">{connection.tokenPrefix}•••• · {connection.keyId}</p>
          <p className="mt-1 text-[11px] text-zinc-600">{connection.scopes.join(' · ')}</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-zinc-300">
          <input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft((value) => ({ ...value, enabled: event.target.checked }))} />
          Conexión activa
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-[10px] font-black uppercase tracking-wider text-zinc-500">
          Solicitudes / 5 min
          <input type="number" min={10} max={10000} value={draft.requestLimit5m} onChange={(event) => setDraft((value) => ({ ...value, requestLimit5m: Number(event.target.value) || 10 }))} className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-white outline-none" />
        </label>
        <label className="grid gap-2 text-[10px] font-black uppercase tracking-wider text-zinc-500">
          Escrituras / 5 min
          <input type="number" min={1} max={5000} value={draft.writeLimit5m} onChange={(event) => setDraft((value) => ({ ...value, writeLimit5m: Number(event.target.value) || 1 }))} className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-white outline-none" />
        </label>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.025] px-3 py-2 text-xs font-bold text-zinc-300">
          <input type="checkbox" checked={draft.approvalPublish} onChange={(event) => setDraft((value) => ({ ...value, approvalPublish: event.target.checked }))} />
          Aprobar publicación/despublicación
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.025] px-3 py-2 text-xs font-bold text-zinc-300">
          <input type="checkbox" checked={draft.approvalInventory} onChange={(event) => setDraft((value) => ({ ...value, approvalInventory: event.target.checked }))} />
          Aprobar movimientos de stock
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] text-zinc-500">
          Ventana actual: {connection.usage ? `${connection.usage.requestCount}/${draft.requestLimit5m} requests · ${connection.usage.writeCount}/${draft.writeLimit5m} writes` : 'sin actividad reciente'}
        </div>
        <div className="flex items-center gap-3">
          {message && <span className="text-[11px] font-bold text-zinc-400">{message}</span>}
          <button type="button" disabled={busy} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-3 py-2 text-xs font-black text-black disabled:opacity-50">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar política
          </button>
        </div>
      </div>
    </div>
  );
}

export default function McpGovernancePage() {
  const [data, setData] = useState<GovernanceResponse>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'approvals' | 'clients' | 'audit'>('approvals');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/mcp/governance', { cache: 'no-store' });
      const body = await response.json() as GovernanceResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || 'No se pudo cargar la gobernanza MCP.');
      setData(body);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la gobernanza MCP.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function decide(approvalId: string, action: 'approve' | 'reject') {
    setBusy(`${action}:${approvalId}`);
    try {
      const response = await fetch('/api/admin/mcp/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, approvalId }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || 'No se pudo actualizar la aprobación.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo decidir la aprobación.');
    } finally {
      setBusy('');
    }
  }

  const pending = useMemo(() => data.approvals.filter((item) => item.status === 'pending'), [data.approvals]);
  const history = useMemo(() => data.approvals.filter((item) => item.status !== 'pending'), [data.approvals]);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Soluciones Fabrick · MCP"
        title="Gobernanza de agentes"
        description="Aprobaciones humanas, límites por credencial y auditoría de cada acción ejecutada por clientes MCP."
        icon={ShieldCheck}
        actions={<Link href="/admin/mcp" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white hover:bg-white/10"><ArrowLeft className="h-4 w-4" /> MCP & conectores</Link>}
      />

      <AdminMotion>
        <div className="grid gap-5">
          {error && <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</div>}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminCard><div className="flex items-center gap-3"><Bot className="h-5 w-5 text-sky-300" /><div><p className="text-2xl font-black text-white">{data.summary.connections}</p><p className="text-xs text-zinc-500">Clientes MCP</p></div></div></AdminCard>
            <AdminCard><div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-amber-300" /><div><p className="text-2xl font-black text-white">{data.summary.pendingApprovals}</p><p className="text-xs text-zinc-500">Pendientes</p></div></div></AdminCard>
            <AdminCard><div className="flex items-center gap-3"><ShieldAlert className="h-5 w-5 text-violet-300" /><div><p className="text-2xl font-black text-white">{data.summary.approvedWaitingUse}</p><p className="text-xs text-zinc-500">Aprobadas sin consumir</p></div></div></AdminCard>
            <AdminCard><div className="flex items-center gap-3"><Activity className="h-5 w-5 text-emerald-300" /><div><p className="text-2xl font-black text-white">{data.summary.auditedEvents}</p><p className="text-xs text-zinc-500">Eventos recientes</p></div></div></AdminCard>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {([
              ['approvals', `Aprobaciones${pending.length ? ` (${pending.length})` : ''}`],
              ['clients', 'Clientes & límites'],
              ['audit', 'Auditoría'],
            ] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-xl px-3 py-2 text-xs font-black ${tab === id ? 'bg-white text-black' : 'border border-white/10 bg-white/5 text-zinc-300'}`}>{label}</button>
            ))}
            <button type="button" onClick={() => void load()} disabled={loading} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-zinc-300"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar</button>
          </div>

          {tab === 'approvals' && (
            <div className="grid gap-5">
              <AdminCard>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-amber-300"><ShieldAlert className="h-4 w-4" /> Pendientes de decisión</div>
                <div className="mt-4 grid gap-3">
                  {pending.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-zinc-500">No hay operaciones esperando aprobación.</div> : pending.map((approval) => (
                    <div key={approval.id} className="rounded-2xl border border-amber-300/20 bg-amber-300/[.04] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusClass(approval.status)}`}>{approval.status}</span>
                            <p className="font-black text-white">{approval.summary || approval.tool_name}</p>
                          </div>
                          <p className="mt-2 text-xs text-zinc-500">{approval.client_label || approval.key_id} · {approval.tool_name} · solicitada {dateLabel(approval.requested_at)}</p>
                          <p className="mt-1 text-[11px] text-zinc-600">Expira: {dateLabel(approval.expires_at)} · ID {approval.id}</p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" disabled={Boolean(busy)} onClick={() => void decide(approval.id, 'reject')} className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-200 disabled:opacity-40"><XCircle className="h-4 w-4" /> Rechazar</button>
                          <button type="button" disabled={Boolean(busy)} onClick={() => void decide(approval.id, 'approve')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-3 py-2 text-xs font-black text-black disabled:opacity-40">{busy === `approve:${approval.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Aprobar</button>
                        </div>
                      </div>
                      <details className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
                        <summary className="cursor-pointer text-xs font-black text-zinc-300">Ver payload exacto</summary>
                        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-5 text-zinc-500">{JSON.stringify(approval.payload || {}, null, 2)}</pre>
                      </details>
                    </div>
                  ))}
                </div>
              </AdminCard>

              <AdminCard>
                <div className="text-xs font-black uppercase tracking-[.2em] text-zinc-400">Historial de aprobaciones</div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-xs">
                    <thead className="text-[10px] uppercase tracking-wider text-zinc-600"><tr><th className="pb-3">Estado</th><th className="pb-3">Cliente</th><th className="pb-3">Herramienta</th><th className="pb-3">Resumen</th><th className="pb-3">Decidida por</th><th className="pb-3">Fecha</th></tr></thead>
                    <tbody>{history.slice(0, 60).map((item) => <tr key={item.id} className="border-t border-white/5"><td className="py-3"><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${statusClass(item.status)}`}>{item.status}</span></td><td className="py-3 text-zinc-400">{item.client_label || item.key_id}</td><td className="py-3 font-mono text-zinc-400">{item.tool_name}</td><td className="max-w-[300px] py-3 text-zinc-500">{item.summary || '—'}</td><td className="py-3 text-zinc-500">{item.decided_by || '—'}</td><td className="py-3 text-zinc-600">{dateLabel(item.decided_at || item.requested_at)}</td></tr>)}</tbody>
                  </table>
                </div>
              </AdminCard>
            </div>
          )}

          {tab === 'clients' && (
            <AdminCard>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-sky-300"><Gauge className="h-4 w-4" /> Política por credencial</div>
              <p className="mt-2 text-sm leading-6 text-zinc-500">Cada cliente puede tener límites y nivel de autonomía diferentes. Desactivar una conexión aquí la bloquea sin borrar su token.</p>
              <div className="mt-5 grid gap-3">{data.connections.length ? data.connections.map((connection) => <PolicyEditor key={connection.keyId} connection={connection} onSaved={load} />) : <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-zinc-500">No hay credenciales MCP configuradas.</div>}</div>
            </AdminCard>
          )}

          {tab === 'audit' && (
            <AdminCard>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-emerald-300"><Activity className="h-4 w-4" /> Registro de acciones</div>
              <p className="mt-2 text-sm text-zinc-500">El registro muestra lecturas, vistas previas, commits, aprobaciones y bloqueos de las IAs conectadas.</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-zinc-600"><tr><th className="pb-3">Fecha</th><th className="pb-3">Cliente</th><th className="pb-3">Herramienta</th><th className="pb-3">Fase</th><th className="pb-3">Resultado</th><th className="pb-3">Resumen</th></tr></thead>
                  <tbody>{data.audit.map((item) => <tr key={item.id} className="border-t border-white/5"><td className="py-3 text-zinc-600">{dateLabel(item.created_at)}</td><td className="py-3 text-zinc-400">{item.client_label || item.key_id}</td><td className="py-3 font-mono text-zinc-400">{item.tool_name}</td><td className="py-3 text-zinc-500">{item.phase}</td><td className={`py-3 font-black ${item.outcome === 'ok' ? 'text-emerald-300' : item.outcome === 'denied' ? 'text-amber-300' : 'text-red-300'}`}>{item.outcome}</td><td className="max-w-[320px] py-3 font-mono text-[10px] text-zinc-600">{JSON.stringify(item.result_summary || {})}</td></tr>)}</tbody>
                </table>
              </div>
            </AdminCard>
          )}
        </div>
      </AdminMotion>
    </AdminPage>
  );
}

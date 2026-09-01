'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ExternalLink, Loader2, RefreshCcw, Rocket, ShieldCheck, TriangleAlert } from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';

type Context = {
  vercelEnv: string;
  branch: string;
  canPreview: boolean;
  canProduction: boolean;
};

type Bootstrap = {
  ok: boolean;
  context: Context;
  vercelConfigured: boolean;
};

type Deployment = {
  id: string;
  url: string;
  readyState: string;
  target: 'preview' | 'production';
  branch?: string;
  sha?: string;
};

type StartResult = {
  ok: boolean;
  source: { id: string; branch: string; sha: string };
  deployment: Deployment;
  next: string;
};

type Smoke = {
  checked: boolean;
  healthy: boolean | null;
  expected?: 'enabled' | 'disabled';
  reason?: string;
  error?: string;
  metadata?: { status?: number; noStore?: boolean };
  mcpChallenge?: { status?: number; hasBearer?: boolean; hasResourceMetadata?: boolean };
};

type StatusResult = {
  ok: boolean;
  deployment: Deployment;
  smoke: Smoke;
};

function stateTone(state: string) {
  const normalized = state.toUpperCase();
  if (normalized === 'READY') return 'text-emerald-300';
  if (['ERROR', 'CANCELED'].includes(normalized)) return 'text-red-300';
  return 'text-amber-300';
}

export default function McpOAuthRedeployPage() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [target, setTarget] = useState<'preview' | 'production'>('preview');
  const [expected, setExpected] = useState<'enabled' | 'disabled'>('enabled');
  const [alignedConfirmed, setAlignedConfirmed] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [started, setStarted] = useState<StartResult | null>(null);
  const [status, setStatus] = useState<StatusResult | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/admin/mcp/oauth/activate', { cache: 'no-store' });
      const data = await response.json() as Bootstrap & { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar el contexto Vercel.');
      setBootstrap(data);
      if (data.context.canProduction) setTarget('production');
      else if (data.context.canPreview) setTarget('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el contexto Vercel.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const allowed = useMemo(() => {
    if (!bootstrap) return false;
    return target === 'preview' ? bootstrap.context.canPreview : bootstrap.context.canProduction;
  }, [bootstrap, target]);

  const phrase = target === 'production' ? 'REDESPLEGAR OAUTH PRODUCCION' : 'REDESPLEGAR OAUTH PREVIEW';
  const deploymentId = started?.deployment.id || '';
  const current = status?.deployment ?? started?.deployment;
  const terminal = current ? ['READY', 'ERROR', 'CANCELED'].includes(current.readyState.toUpperCase()) : false;

  const refreshStatus = useCallback(async () => {
    if (!deploymentId) return;
    try {
      const response = await fetch(`/api/admin/mcp/oauth/redeploy?id=${encodeURIComponent(deploymentId)}&expected=${expected}`, { cache: 'no-store' });
      const data = await response.json() as StatusResult & { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo consultar el deployment.');
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar el deployment.');
    }
  }, [deploymentId, expected]);

  useEffect(() => {
    if (!deploymentId || (terminal && status)) return;
    void refreshStatus();
    if (terminal) return;
    const timer = window.setInterval(() => void refreshStatus(), 6_000);
    return () => window.clearInterval(timer);
  }, [deploymentId, refreshStatus, status, terminal]);

  async function redeploy() {
    setBusy(true);
    setError('');
    setStarted(null);
    setStatus(null);
    try {
      const response = await fetch('/api/admin/mcp/oauth/redeploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, confirmation }),
      });
      const data = await response.json() as StartResult & { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo iniciar el redeploy.');
      setStarted(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el redeploy.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Soluciones Fabrick · MCP · OAuth"
        title="Deploy & Verify"
        description="Crea un deployment nuevo del mismo snapshot después de cambiar variables OAuth y verifica que el resultado cargó la configuración esperada."
        icon={Rocket}
      />
      <AdminMotion>
        <div className="grid gap-5">
          {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{error}</div>}

          <div className="grid gap-4 xl:grid-cols-4">
            <AdminCard><p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Runtime</p><p className="mt-3 text-xl font-black text-white">{bootstrap?.context.vercelEnv || '—'}</p><p className="mt-2 break-all font-mono text-[11px] text-zinc-500">{bootstrap?.context.branch || 'sin rama'}</p></AdminCard>
            <AdminCard><p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Destino</p><p className={`mt-3 text-xl font-black ${allowed ? 'text-emerald-300' : 'text-amber-300'}`}>{allowed ? 'Permitido' : 'Bloqueado'}</p><p className="mt-2 text-xs text-zinc-500">Preview no puede crear deployments productivos.</p></AdminCard>
            <AdminCard><p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Código</p><p className="mt-3 text-xl font-black text-white">Snapshot exacto</p><p className="mt-2 text-xs leading-5 text-zinc-500">Se redepliega el deployment que ejecuta este panel; no “el último commit” mutable.</p></AdminCard>
            <AdminCard><p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Smoke</p><p className="mt-3 text-xl font-black text-white">Post-deploy</p><p className="mt-2 text-xs leading-5 text-zinc-500">Producción comprueba RFC 9728 y el challenge Bearer del MCP.</p></AdminCard>
          </div>

          <AdminCard>
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" /><div><h2 className="text-lg font-black text-white">1. Confirmar estado que debe cargar</h2><p className="mt-1 text-sm leading-6 text-zinc-400">Primero alinea las variables desde Activar OAuth. Aquí solo se crea un deployment nuevo para que Vercel cargue esas variables.</p></div></div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <select value={target} onChange={(e) => { setTarget(e.target.value as 'preview' | 'production'); setConfirmation(''); setStarted(null); setStatus(null); }} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none">
                <option value="preview">Preview · rama actual</option>
                <option value="production">Producción · main</option>
              </select>
              <select value={expected} onChange={(e) => { setExpected(e.target.value as 'enabled' | 'disabled'); setStarted(null); setStatus(null); }} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none">
                <option value="enabled">Espero OAuth ACTIVADO</option>
                <option value="disabled">Espero OAuth DESACTIVADO / kill switch</option>
              </select>
            </div>
            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
              <input type="checkbox" checked={alignedConfirmed} onChange={(e) => setAlignedConfirmed(e.target.checked)} className="mt-1 h-4 w-4 accent-emerald-400" />
              <span><span className="block text-sm font-black text-white">Ya revisé y apliqué las variables del destino desde Activar OAuth</span><span className="mt-1 block text-xs leading-5 text-zinc-500">Este paso evita iniciar builds inútiles antes de cambiar la configuración.</span></span>
            </label>
          </AdminCard>

          <AdminCard>
            <div className="flex items-start gap-3"><TriangleAlert className="mt-0.5 h-5 w-5 text-amber-300" /><div><h2 className="text-lg font-black text-white">2. Confirmar redeploy</h2><p className="mt-1 text-sm leading-6 text-zinc-400">El backend comprobará que el deployment de origen corresponde a esta rama y al SHA que ejecuta el panel.</p></div></div>
            <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 font-mono text-xs font-black text-amber-100">{phrase}</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row"><input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="Frase de confirmación" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" /><button type="button" disabled={busy || !allowed || !bootstrap?.vercelConfigured || !alignedConfirmed || confirmation.trim() !== phrase} onClick={() => void redeploy()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}Crear deployment</button></div>
          </AdminCard>

          {current && (
            <AdminCard>
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black text-white">3. Estado del deployment</h2><p className="mt-1 break-all font-mono text-xs text-zinc-500">{current.id}</p></div><button type="button" onClick={() => void refreshStatus()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-zinc-300 hover:text-white"><RefreshCcw className="h-3.5 w-3.5" />Actualizar</button></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">Estado</p><p className={`mt-2 text-lg font-black ${stateTone(current.readyState)}`}>{current.readyState}</p></div><div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">Destino</p><p className="mt-2 text-lg font-black text-white">{current.target}</p></div><div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">Polling</p><p className="mt-2 text-lg font-black text-white">{terminal ? 'Finalizado' : 'Cada 6 s'}</p></div></div>
              {current.url && <a href={current.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-amber-200 hover:text-amber-100">Abrir deployment <ExternalLink className="h-3.5 w-3.5" /></a>}
            </AdminCard>
          )}

          {status?.smoke && current?.readyState.toUpperCase() === 'READY' && (
            <div className={`rounded-2xl border p-5 ${status.smoke.checked ? status.smoke.healthy ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
              <div className="flex items-start gap-3">{status.smoke.checked && status.smoke.healthy ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" /> : <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-300" />}<div><h2 className="font-black text-white">{status.smoke.checked ? status.smoke.healthy ? 'Smoke OAuth correcto' : 'Smoke OAuth requiere revisión' : 'Preview READY'}</h2><p className="mt-1 text-sm leading-6 text-zinc-300">{status.smoke.reason || status.smoke.error || (status.smoke.expected === 'disabled' ? 'La verificación espera que metadata OAuth esté desactivada y que el MCP mantenga su challenge Bearer normal.' : 'La verificación espera metadata RFC 9728 pública y un 401 Bearer con resource_metadata.')}</p>{status.smoke.checked && <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-zinc-400"><div>Metadata HTTP: <strong className="text-white">{status.smoke.metadata?.status ?? '—'}</strong></div><div>MCP HTTP: <strong className="text-white">{status.smoke.mcpChallenge?.status ?? '—'}</strong></div></div>}</div></div>
            </div>
          )}

          <div className="flex flex-wrap gap-2"><Link href="/admin/mcp/oauth/activar" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-zinc-300 hover:text-white">Activar variables</Link><Link href="/admin/mcp/oauth/diagnostico" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-zinc-300 hover:text-white">Diagnóstico OAuth</Link><Link href="/admin/mcp/gobernanza" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-zinc-300 hover:text-white">Gobernanza</Link></div>
        </div>
      </AdminMotion>
    </AdminPage>
  );
}

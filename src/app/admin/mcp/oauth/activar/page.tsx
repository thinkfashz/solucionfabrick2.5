'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, CloudCog, Loader2, Power, RefreshCcw, ShieldAlert, TriangleAlert } from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';

type Context = {
  vercelEnv: string;
  branch: string;
  canPreview: boolean;
  canProduction: boolean;
};

type StatusItem = { key: string; state: 'missing' | 'match' | 'different'; hasBranchOverride: boolean };

type Bootstrap = {
  ok: boolean;
  context: Context;
  vercelConfigured: boolean;
  audience: string;
};

type PreviewResult = {
  ok: boolean;
  action: 'enable' | 'disable';
  target: 'preview' | 'production';
  audience: string;
  issuer?: string;
  before: StatusItem[];
  confirmationRequired: string;
  redeployRequired: boolean;
  readiness?: { chatgptCoreReady?: boolean; persistentSessionReady?: boolean; score?: number } | null;
};

type CommitResult = {
  ok: boolean;
  action: 'enable' | 'disable';
  target: 'preview' | 'production';
  after: StatusItem[];
  next: string;
  redeployRequired: boolean;
};

function badge(state: StatusItem['state']) {
  if (state === 'match') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (state === 'different') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  return 'border-red-500/30 bg-red-500/10 text-red-200';
}

export default function McpOAuthActivatePage() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [issuer, setIssuer] = useState('');
  const [resourceConfirmed, setResourceConfirmed] = useState(false);
  const [target, setTarget] = useState<'preview' | 'production'>('preview');
  const [action, setAction] = useState<'enable' | 'disable'>('enable');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/admin/mcp/oauth/activate', { cache: 'no-store' });
      const data = await response.json() as Bootstrap & { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar el activador OAuth.');
      setBootstrap(data);
      if (data.context.canProduction) setTarget('production');
      else if (data.context.canPreview) setTarget('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el activador OAuth.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const targetAllowed = useMemo(() => {
    if (!bootstrap) return false;
    return target === 'preview' ? bootstrap.context.canPreview : bootstrap.context.canProduction;
  }, [bootstrap, target]);

  async function run(commit: boolean) {
    setBusy(true);
    setError('');
    if (!commit) {
      setPreview(null);
      setResult(null);
      setConfirmation('');
    }
    try {
      const response = await fetch('/api/admin/mcp/oauth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          target,
          issuer,
          resourceCompatibilityConfirmed: resourceConfirmed,
          commit,
          confirmation,
        }),
      });
      const data = await response.json() as (PreviewResult & CommitResult & { error?: string });
      if (!response.ok) throw new Error(data.error || 'No se pudo procesar la activación OAuth.');
      if (commit) setResult(data);
      else setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar OAuth.');
    } finally {
      setBusy(false);
    }
  }

  const statuses = result?.after ?? preview?.before ?? [];

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Soluciones Fabrick · MCP · OAuth"
        title="Activación segura"
        description="Alinea las variables OAuth de Vercel con separación estricta entre preview y producción. Solo Root/superadmin puede ejecutar este flujo."
        icon={Power}
      />
      <AdminMotion>
        <div className="grid gap-5">
          {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{error}</div>}

          <div className="grid gap-4 xl:grid-cols-4">
            <AdminCard>
              <p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Runtime</p>
              <p className="mt-3 text-xl font-black text-white">{bootstrap?.context.vercelEnv || '—'}</p>
              <p className="mt-2 break-all font-mono text-[11px] text-zinc-500">{bootstrap?.context.branch || 'sin rama'}</p>
            </AdminCard>
            <AdminCard>
              <p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Vercel</p>
              <p className={`mt-3 text-xl font-black ${bootstrap?.vercelConfigured ? 'text-emerald-300' : 'text-red-300'}`}>{bootstrap?.vercelConfigured ? 'Configurado' : 'Falta configurar'}</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">Usa el proveedor Vercel ya guardado en `/admin/configuracion`.</p>
            </AdminCard>
            <AdminCard>
              <p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Preview</p>
              <p className={`mt-3 text-xl font-black ${bootstrap?.context.canPreview ? 'text-emerald-300' : 'text-zinc-500'}`}>{bootstrap?.context.canPreview ? 'Permitido' : 'Bloqueado aquí'}</p>
            </AdminCard>
            <AdminCard>
              <p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Producción</p>
              <p className={`mt-3 text-xl font-black ${bootstrap?.context.canProduction ? 'text-emerald-300' : 'text-amber-300'}`}>{bootstrap?.context.canProduction ? 'Permitido' : 'Solo desde main'}</p>
            </AdminCard>
          </div>

          <AdminCard>
            <div className="flex items-start gap-3">
              <CloudCog className="mt-0.5 h-5 w-5 text-amber-300" />
              <div>
                <h2 className="text-lg font-black text-white">1. Elegir operación</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-400">Preview escribe variables únicamente para la rama actual. Producción está bloqueada hasta que este código exista en el deployment productivo de `main`.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select value={action} onChange={(e) => { setAction(e.target.value as 'enable' | 'disable'); setPreview(null); setResult(null); }} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none">
                <option value="enable">Activar OAuth</option>
                <option value="disable">Kill switch / desactivar</option>
              </select>
              <select value={target} onChange={(e) => { setTarget(e.target.value as 'preview' | 'production'); setPreview(null); setResult(null); }} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none">
                <option value="preview">Preview · rama actual</option>
                <option value="production">Producción · main</option>
              </select>
              <div className={`rounded-2xl border px-4 py-3 text-sm font-black ${targetAllowed ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/20 bg-amber-500/10 text-amber-100'}`}>{targetAllowed ? 'Destino permitido' : 'Destino bloqueado en este runtime'}</div>
              <Link href="/admin/mcp/oauth/auth0/provision" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-black text-zinc-300 hover:text-white">Provisionar Auth0</Link>
            </div>
          </AdminCard>

          {action === 'enable' && (
            <AdminCard>
              <div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 text-amber-300" /><div><h2 className="text-lg font-black text-white">2. Validar issuer</h2><p className="mt-1 text-sm leading-6 text-zinc-400">El backend repetirá discovery, PKCE y JWKS antes de tocar Vercel. Producción exige además sesión persistente con offline_access/refresh.</p></div></div>
              <input value={issuer} onChange={(e) => { setIssuer(e.target.value); setPreview(null); setResult(null); }} placeholder="https://tu-tenant.us.auth0.com" className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40" />
              <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                <input type="checkbox" checked={resourceConfirmed} onChange={(e) => { setResourceConfirmed(e.target.checked); setPreview(null); setResult(null); }} className="mt-1 h-4 w-4 accent-amber-300" />
                <span><span className="block text-sm font-black text-white">Resource Parameter Compatibility Profile está activado en Auth0</span><span className="mt-1 block text-xs leading-5 text-zinc-500">Este requisito RFC 8707 no se infiere de discovery y debe confirmarse explícitamente.</span></span>
              </label>
            </AdminCard>
          )}

          <AdminCard>
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-white">3. Revisar antes de escribir</h2><p className="mt-1 text-sm text-zinc-400">El preview de cambios nunca devuelve el token Vercel ni secretos.</p></div><button type="button" disabled={busy || !targetAllowed || !bootstrap?.vercelConfigured || (action === 'enable' && (!issuer.trim() || !resourceConfirmed))} onClick={() => void run(false)} className="inline-flex items-center gap-2 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-black disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}Revisar plan</button></div>

            {statuses.length > 0 && <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{statuses.map((item) => <div key={item.key} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-center justify-between gap-2"><p className="break-all font-mono text-xs font-black text-zinc-200">{item.key}</p><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${badge(item.state)}`}>{item.state}</span></div><p className="mt-2 text-[11px] text-zinc-500">{item.hasBranchOverride ? 'Override específico de rama' : 'Sin override específico de rama'}</p></div>)}</div>}

            {preview?.readiness && <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-zinc-400">Core OAuth: <strong className={preview.readiness.chatgptCoreReady ? 'text-emerald-300' : 'text-red-300'}>{preview.readiness.chatgptCoreReady ? 'listo' : 'incompleto'}</strong></div><div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-zinc-400">Persistencia: <strong className={preview.readiness.persistentSessionReady ? 'text-emerald-300' : 'text-amber-300'}>{preview.readiness.persistentSessionReady ? 'lista' : 'revisar'}</strong></div><div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-zinc-400">Score: <strong className="text-white">{preview.readiness.score ?? 0}/100</strong></div></div>}
          </AdminCard>

          {preview && (
            <AdminCard>
              <div className="flex items-start gap-3"><TriangleAlert className="mt-0.5 h-5 w-5 text-amber-300" /><div><h2 className="text-lg font-black text-white">4. Confirmación explícita</h2><p className="mt-1 text-sm leading-6 text-zinc-400">Escribe exactamente la frase mostrada. La API vuelve a validar todo al aplicar; no confía en este preview.</p></div></div>
              <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 font-mono text-xs font-black text-amber-100">{preview.confirmationRequired}</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row"><input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="Frase de confirmación" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" /><button type="button" disabled={busy || confirmation.trim() !== preview.confirmationRequired} onClick={() => void run(true)} className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black disabled:opacity-40 ${action === 'disable' ? 'bg-red-500 text-white' : 'bg-emerald-400 text-black'}`}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}{action === 'disable' ? 'Aplicar kill switch' : 'Aplicar variables'}</button></div>
            </AdminCard>
          )}

          {result && (
            <div className={`rounded-2xl border p-5 ${result.ok ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
              <div className="flex items-start gap-3"><CheckCircle2 className={`mt-0.5 h-5 w-5 ${result.ok ? 'text-emerald-300' : 'text-amber-300'}`} /><div><h2 className="font-black text-white">{result.ok ? 'Variables alineadas' : 'Revisar alineación'}</h2><p className="mt-1 text-sm leading-6 text-zinc-300">{result.next}</p>{result.redeployRequired && <p className="mt-2 text-xs font-bold text-amber-100">Los cambios de environment variables requieren un nuevo deployment para entrar al runtime.</p>}</div></div>
            </div>
          )}

          <div className="flex flex-wrap gap-2"><Link href="/admin/mcp/oauth/auth0" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-zinc-300 hover:text-white">Preset Auth0</Link><Link href="/admin/mcp/oauth/diagnostico" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-zinc-300 hover:text-white">Diagnóstico OAuth</Link><Link href="/admin/mcp/gobernanza" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-zinc-300 hover:text-white">Gobernanza</Link></div>
        </div>
      </AdminMotion>
    </AdminPage>
  );
}

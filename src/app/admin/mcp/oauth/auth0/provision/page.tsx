'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, KeyRound, Loader2, ShieldCheck, Sparkles, TriangleAlert, Wrench } from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';

type Snapshot = {
  ready: boolean;
  tenant: { resourceParameterProfile: string; compatible: boolean };
  resourceServer: {
    exists: boolean;
    id: string;
    identifier: string;
    name: string;
    signingAlg: string;
    allowOfflineAccess: boolean;
    rbac: boolean;
    tokenDialect: string;
    scopes: Array<{ value: string; description: string }>;
    missingScopes: string[];
    unexpectedScopes: string[];
    ready: boolean;
  };
};

type ProvisionResult = {
  ok: boolean;
  commit: boolean;
  domain: string;
  audience: string;
  requiredManagementScopes: string[];
  before: Snapshot;
  after?: Snapshot;
  plannedChanges: string[];
  applied?: string[];
  tokenStored: boolean;
  next?: string;
  error?: string;
};

function Status({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${ok ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200' : 'border-amber-400/20 bg-amber-500/10 text-amber-100'}`}>
      {ok ? <Check className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
      {ok ? yes : no}
    </span>
  );
}

export default function Auth0ProvisionPage() {
  const [domain, setDomain] = useState('');
  const [managementToken, setManagementToken] = useState('');
  const [confirmWrite, setConfirmWrite] = useState(false);
  const [busy, setBusy] = useState<'inspect' | 'apply' | ''>('');
  const [result, setResult] = useState<ProvisionResult | null>(null);
  const [error, setError] = useState('');

  async function run(commit: boolean) {
    setBusy(commit ? 'apply' : 'inspect');
    setError('');
    try {
      const response = await fetch('/api/admin/mcp/oauth/auth0-provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ domain, managementToken, commit }),
      });
      const data = await response.json() as ProvisionResult;
      if (!response.ok) throw new Error(data.error || 'Auth0 rechazó la operación.');
      setResult(data);
      if (commit) {
        setManagementToken('');
        setConfirmWrite(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo contactar Auth0.');
    } finally {
      setBusy('');
    }
  }

  const current = result?.after ?? result?.before;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Soluciones Fabrick · MCP · OAuth · Auth0"
        title="Provisionar Auth0"
        description="Automatiza únicamente la configuración determinista del tenant y la Custom API Fabrick usando un Management API token temporal que no se persiste."
        icon={Wrench}
      />

      <AdminMotion>
        <div className="grid gap-5">
          {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</div>}

          <AdminCard>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" />
              <div>
                <h2 className="text-lg font-black text-white">Qué modifica</h2>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-zinc-400">
                  Fabrick puede activar <strong className="text-zinc-200">resource_parameter_profile=compatibility</strong> y crear o alinear la API
                  <span className="font-mono text-xs text-amber-200"> https://www.solucionesfabrick.com/api/mcp</span> con RS256, RBAC, offline access y los cuatro scopes MCP.
                  No crea usuarios, roles, conexiones, Actions ni la Application de ChatGPT.
                </p>
              </div>
            </div>
          </AdminCard>

          <AdminCard>
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-5 w-5 text-amber-300" />
              <div>
                <h2 className="text-lg font-black text-white">Management API token de un solo uso</h2>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-zinc-400">
                  Usa el dominio estándar del tenant <span className="font-mono text-xs">*.auth0.com</span>. El token viaja solo en esta petición servidor→Auth0,
                  no se escribe en base de datos, variables de entorno ni respuesta. Puedes revocarlo al terminar.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <input
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                placeholder="tu-tenant.us.auth0.com"
                spellCheck={false}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40"
              />
              <input
                type="password"
                value={managementToken}
                onChange={(event) => setManagementToken(event.target.value)}
                placeholder="Management API access token temporal"
                autoComplete="new-password"
                spellCheck={false}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40"
              />
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Scopes mínimos del token</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['read:tenant_settings', 'update:tenant_settings', 'read:resource_servers', 'create:resource_servers', 'update:resource_servers'].map((scope) => (
                  <span key={scope} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[11px] text-zinc-300">{scope}</span>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={Boolean(busy) || !domain.trim() || !managementToken.trim()}
                onClick={() => void run(false)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white disabled:opacity-40"
              >
                {busy === 'inspect' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Revisar sin cambiar
              </button>
            </div>
          </AdminCard>

          {result && (
            <>
              <div className="grid gap-4 xl:grid-cols-3">
                <AdminCard>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Tenant RFC 8707</p>
                  <div className="mt-3"><Status ok={current?.tenant.compatible === true} yes="Compatibility ON" no="Falta activar" /></div>
                  <p className="mt-3 font-mono text-xs text-zinc-500">{current?.tenant.resourceParameterProfile}</p>
                </AdminCard>
                <AdminCard>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Custom API</p>
                  <div className="mt-3"><Status ok={current?.resourceServer.ready === true} yes="Alineada" no={current?.resourceServer.exists ? 'Requiere cambios' : 'No existe'} /></div>
                  <p className="mt-3 break-all font-mono text-xs text-zinc-500">{result.audience}</p>
                </AdminCard>
                <AdminCard>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Provisionamiento</p>
                  <div className="mt-3"><Status ok={current?.ready === true} yes="Listo" no="Pendiente" /></div>
                  <p className="mt-3 text-xs text-zinc-500">Token guardado: {result.tokenStored ? 'sí' : 'no'}</p>
                </AdminCard>
              </div>

              <AdminCard>
                <h2 className="text-lg font-black text-white">Plan seguro</h2>
                {result.plannedChanges.length ? (
                  <div className="mt-4 grid gap-2">
                    {result.plannedChanges.map((change) => (
                      <div key={change} className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-zinc-400">
                        <Sparkles className="mt-1 h-4 w-4 shrink-0 text-amber-300" />{change}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-emerald-200">No hay cambios pendientes en tenant/API.</p>
                )}

                {current?.resourceServer.unexpectedScopes?.length ? (
                  <p className="mt-4 text-xs leading-5 text-zinc-500">
                    Scopes adicionales detectados y preservados: <span className="font-mono">{current.resourceServer.unexpectedScopes.join(', ')}</span>.
                  </p>
                ) : null}
              </AdminCard>

              {!result.commit && !current?.ready && (
                <AdminCard>
                  <div className="flex items-start gap-3">
                    <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-300" />
                    <div>
                      <h2 className="text-lg font-black text-white">Aplicar cambios en Auth0</h2>
                      <p className="mt-1 text-sm leading-6 text-zinc-400">
                        Esta acción modifica el tenant Auth0 externo. No elimina scopes existentes y no toca otras Applications/APIs.
                      </p>
                    </div>
                  </div>
                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <input type="checkbox" checked={confirmWrite} onChange={(event) => setConfirmWrite(event.target.checked)} className="mt-1 h-4 w-4 accent-amber-300" />
                    <span>
                      <span className="block text-sm font-black text-white">Confirmo aplicar solo los cambios listados</span>
                      <span className="mt-1 block text-xs leading-5 text-zinc-500">El token temporal se borra del formulario al terminar.</span>
                    </span>
                  </label>
                  <button
                    type="button"
                    disabled={Boolean(busy) || !confirmWrite || !managementToken.trim()}
                    onClick={() => void run(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-black disabled:opacity-40"
                  >
                    {busy === 'apply' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                    Provisionar tenant + API
                  </button>
                </AdminCard>
              )}

              {result.commit && (
                <AdminCard>
                  <h2 className="text-lg font-black text-white">Resultado</h2>
                  <div className="mt-4 grid gap-2">
                    {(result.applied || []).map((item) => (
                      <div key={item} className="flex items-start gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/5 p-3 text-sm text-emerald-100">
                        <Check className="mt-0.5 h-4 w-4 shrink-0" />{item}
                      </div>
                    ))}
                  </div>
                  {result.next && <p className="mt-4 text-sm leading-6 text-zinc-400">{result.next}</p>}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link href="/admin/mcp/oauth/auth0" className="rounded-xl bg-amber-300 px-3 py-2 text-xs font-black text-black">Validar issuer Auth0</Link>
                    <Link href="/admin/mcp/oauth/diagnostico" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-zinc-300 hover:text-white">Diagnóstico OAuth</Link>
                  </div>
                </AdminCard>
              )}
            </>
          )}
        </div>
      </AdminMotion>
    </AdminPage>
  );
}

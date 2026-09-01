'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Clipboard, Cloud, Loader2, SearchCheck, ShieldCheck, TriangleAlert } from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';

type Scope = { name: string; description: string };
type CheckItem = { id: string; label: string; status: 'pass' | 'warn' | 'fail'; message: string };
type Kit = {
  endpoint: string;
  audience: string;
  protectedResourceMetadata: string;
  scopes: Scope[];
  requestedScopes: string[];
  auth0Api: { name: string; identifier: string; signingAlgorithm: string; allowOfflineAccess: boolean; rbac: boolean; note: string };
  auth0Tenant: { resourceParameterCompatibilityProfileRequired: boolean; resourceParameter: string; cimdOptional: boolean; note: string };
};
type Result = {
  ok: boolean;
  activationReady: boolean;
  issuer: string;
  standardAuth0Domain: boolean;
  resourceCompatibilityConfirmed: boolean;
  kit: Kit;
  readiness: { chatgptCoreReady: boolean; persistentSessionReady: boolean; score: number; metadataUrl: string; checks: CheckItem[] };
  auth0Application: { name: string; clientId: string; allowedCallbackUrls: string[]; grantTypes: string[]; pkce: string; requestedScopes: string[]; tokenEndpointAuthentication: string };
  environment: string;
  nextSteps: string[];
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch { /* clipboard can be denied */ }
  }
  return <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] font-black text-zinc-300 hover:text-white">{copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Clipboard className="h-3.5 w-3.5" />}{copied ? 'Copiado' : 'Copiar'}</button>;
}

export default function Auth0McpPage() {
  const [kit, setKit] = useState<Kit | null>(null);
  const [domain, setDomain] = useState('');
  const [clientId, setClientId] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('');
  const [resourceCompatibilityConfirmed, setResourceCompatibilityConfirmed] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/mcp/oauth/auth0-kit', { cache: 'no-store' });
      const data = await response.json() as { kit?: Kit; error?: string };
      if (!response.ok || !data.kit) throw new Error(data.error || 'No se pudo cargar el preset Auth0.');
      setKit(data.kit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar Auth0.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function inspect() {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/admin/mcp/oauth/auth0-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, clientId, callbackUrl, resourceCompatibilityConfirmed }),
      });
      const data = await response.json() as Result & { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo validar Auth0.');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo validar Auth0.');
    } finally {
      setBusy(false);
    }
  }

  const apiJson = useMemo(() => JSON.stringify({
    name: kit?.auth0Api.name,
    identifier: kit?.audience,
    signing_algorithm: 'RS256',
    allow_offline_access: true,
    scopes: kit?.scopes,
  }, null, 2), [kit]);

  return (
    <AdminPage>
      <AdminPageHeader eyebrow="Soluciones Fabrick · MCP · OAuth" title="Auth0 recomendado" description="Preset operativo para emitir access tokens JWT destinados al MCP. Fabrick nunca solicita ni guarda aquí el client_secret de Auth0." icon={Cloud} />
      <AdminMotion>
        <div className="grid gap-5">
          {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</div>}

          <div className="grid gap-4 xl:grid-cols-3">
            <AdminCard><p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">API Identifier / resource</p><p className="mt-3 break-all font-mono text-xs text-white">{kit?.audience || 'Cargando…'}</p><p className="mt-3 text-xs leading-5 text-zinc-500">Debe coincidir exactamente con `resource` de RFC 8707 y con `aud` del access token.</p></AdminCard>
            <AdminCard><p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Firma</p><p className="mt-3 text-xl font-black text-emerald-300">RS256</p><p className="mt-3 text-xs leading-5 text-zinc-500">Fabrick valida la firma contra JWKS; no comparte la clave privada.</p></AdminCard>
            <AdminCard><p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Sesión persistente</p><p className="mt-3 text-xl font-black text-amber-300">offline_access</p><p className="mt-3 text-xs leading-5 text-zinc-500">Auth0 debe permitir refresh tokens para evitar reautorizaciones frecuentes.</p></AdminCard>
          </div>

          <AdminCard>
            <div className="flex items-start gap-3"><TriangleAlert className="mt-0.5 h-5 w-5 text-amber-300" /><div><h2 className="text-lg font-black text-white">0. Activar compatibilidad MCP / RFC 8707</h2><p className="mt-1 max-w-4xl text-sm leading-6 text-zinc-400">En Auth0: <strong className="text-zinc-200">Settings → Advanced → Resource Parameter Compatibility Profile = ON</strong>. ChatGPT/MCP usa el parámetro estándar `resource`; sin este perfil Auth0 puede emitir un token para otro audience. Este ajuste no se puede inferir de forma confiable solo desde discovery, por eso requiere confirmación explícita.</p></div></div>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
              <input type="checkbox" checked={resourceCompatibilityConfirmed} onChange={(event) => setResourceCompatibilityConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-amber-300" />
              <span><span className="block text-sm font-black text-white">Confirmo que Resource Parameter Compatibility Profile está activado</span><span className="mt-1 block text-xs leading-5 text-zinc-500">El panel no marcará el setup como listo para activar hasta confirmar este requisito.</span></span>
            </label>
            <p className="mt-3 text-xs leading-5 text-zinc-500">Opcional para futuros clientes MCP: Auth0 también permite habilitar Client ID Metadata Document Registration (CIMD). No es necesario para una Application ChatGPT pre-registrada.</p>
          </AdminCard>

          <AdminCard>
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" /><div><h2 className="text-lg font-black text-white">1. Crear la Custom API en Auth0</h2><p className="mt-1 text-sm leading-6 text-zinc-400">Crea una API con estos valores. Activa <strong className="text-zinc-200">Allow Offline Access</strong> y RBAC. La capa Fabrick seguirá aplicando scopes, cuotas y aprobaciones aunque Auth0 autorice al usuario.</p></div></div>
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"><pre className="min-w-0 flex-1 overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-zinc-300">{apiJson}</pre>{apiJson && <CopyButton value={apiJson} />}</div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">{(kit?.scopes || []).map((scope) => <div key={scope.name} className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="font-mono text-xs font-black text-amber-200">{scope.name}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{scope.description}</p></div>)}</div>
          </AdminCard>

          <AdminCard>
            <div className="flex items-start gap-3"><SearchCheck className="mt-0.5 h-5 w-5 text-amber-300" /><div><h2 className="text-lg font-black text-white">2. Probar tu tenant Auth0</h2><p className="mt-1 text-sm leading-6 text-zinc-400">Pega el dominio Auth0. Client ID y callback son opcionales aquí y se usan solo para generar el perfil; no se guardan. No pegues un client secret.</p></div></div>
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="tu-tenant.us.auth0.com" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40" />
              <input value={clientId} onChange={(event) => setClientId(event.target.value)} placeholder="Client ID (opcional)" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40" />
              <input value={callbackUrl} onChange={(event) => setCallbackUrl(event.target.value)} placeholder="Callback exacta de ChatGPT (opcional)" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40" />
            </div>
            <button type="button" disabled={busy || !domain.trim()} onClick={() => void inspect()} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-black disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />}Validar y generar</button>
          </AdminCard>

          {result && (
            <>
              <div className="grid gap-4 xl:grid-cols-4">
                <AdminCard><p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Activación MCP</p><p className={`mt-3 text-xl font-black ${result.activationReady ? 'text-emerald-300' : 'text-amber-300'}`}>{result.activationReady ? 'Lista' : 'No activar aún'}</p></AdminCard>
                <AdminCard><p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Core OAuth</p><p className={`mt-3 text-xl font-black ${result.readiness.chatgptCoreReady ? 'text-emerald-300' : 'text-red-300'}`}>{result.readiness.chatgptCoreReady ? 'Listo' : 'Incompleto'}</p></AdminCard>
                <AdminCard><p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Refresh persistente</p><p className={`mt-3 text-xl font-black ${result.readiness.persistentSessionReady ? 'text-emerald-300' : 'text-amber-300'}`}>{result.readiness.persistentSessionReady ? 'Listo' : 'Revisar'}</p></AdminCard>
                <AdminCard><p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Readiness discovery</p><p className="mt-3 text-xl font-black text-white">{result.readiness.score}/100</p><p className="mt-2 text-xs text-zinc-500">{result.standardAuth0Domain ? 'Dominio estándar Auth0' : 'Dominio personalizado / compatible'}</p></AdminCard>
              </div>

              {!result.resourceCompatibilityConfirmed && <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">Discovery puede verse correcto y aun así fallar MCP si Resource Parameter Compatibility Profile está apagado. Confirma el toggle en Auth0 antes de activar las variables en producción.</div>}

              <AdminCard>
                <h2 className="text-lg font-black text-white">Checks del issuer</h2>
                <div className="mt-4 grid gap-2">{result.readiness.checks.map((item) => <div key={item.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3">{item.status === 'pass' ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> : <TriangleAlert className={`mt-0.5 h-4 w-4 shrink-0 ${item.status === 'fail' ? 'text-red-300' : 'text-amber-300'}`} />}<div><p className="text-sm font-black text-zinc-200">{item.label}</p><p className="mt-1 break-all text-xs leading-5 text-zinc-500">{item.message}</p></div></div>)}</div>
              </AdminCard>

              <AdminCard>
                <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-white">3. Variables de activación Fabrick</h2><p className="mt-1 text-sm text-zinc-400">Úsalas únicamente cuando Activación MCP indique Lista. JWKS se descubre automáticamente.</p></div><CopyButton value={result.environment} /></div>
                <pre className="mt-4 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/30 p-4 text-[11px] leading-5 text-zinc-300">{result.environment}</pre>
              </AdminCard>

              <AdminCard>
                <h2 className="text-lg font-black text-white">4. Application que representa a ChatGPT</h2>
                <div className="mt-4 grid gap-2 text-sm leading-6 text-zinc-400">
                  <p><strong className="text-zinc-200">Nombre:</strong> {result.auth0Application.name}</p>
                  <p><strong className="text-zinc-200">Client ID:</strong> <span className="font-mono text-xs">{result.auth0Application.clientId}</span></p>
                  <p><strong className="text-zinc-200">Callback:</strong> <span className="break-all font-mono text-xs">{result.auth0Application.allowedCallbackUrls.join(', ')}</span></p>
                  <p><strong className="text-zinc-200">Grant types:</strong> {result.auth0Application.grantTypes.join(', ')}</p>
                  <p><strong className="text-zinc-200">PKCE:</strong> {result.auth0Application.pkce}</p>
                  <p><strong className="text-zinc-200">Scopes:</strong> <span className="font-mono text-xs">{result.auth0Application.requestedScopes.join(' ')}</span></p>
                  <p className="text-amber-100">{result.auth0Application.tokenEndpointAuthentication}</p>
                </div>
              </AdminCard>

              <AdminCard>
                <h2 className="text-lg font-black text-white">Secuencia final</h2>
                <ol className="mt-4 grid gap-2 text-sm leading-6 text-zinc-400">{result.nextSteps.map((step, index) => <li key={step}><span className="mr-2 font-black text-amber-300">{index + 1}.</span>{step}</li>)}</ol>
                <div className="mt-5 flex flex-wrap gap-2"><Link href="/admin/mcp/oauth/diagnostico" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-zinc-300 hover:text-white">Abrir diagnóstico</Link><Link href="/admin/mcp/oauth/conexion" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-zinc-300 hover:text-white">Abrir kit de conexión</Link><Link href="/admin/mcp/oauth" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-zinc-300 hover:text-white">Vincular identidad</Link></div>
              </AdminCard>
            </>
          )}
        </div>
      </AdminMotion>
    </AdminPage>
  );
}

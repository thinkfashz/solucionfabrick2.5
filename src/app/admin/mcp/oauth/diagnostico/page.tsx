'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, SearchCheck, ShieldCheck, XCircle } from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';

type Check = { id: string; label: string; status: 'pass' | 'warn' | 'fail'; message: string };
type Report = {
  ok: boolean;
  chatgptCoreReady: boolean;
  persistentSessionReady: boolean;
  issuer: string;
  metadataUrl: string;
  registrationMode: 'cimd' | 'dcr' | 'preregister' | 'unknown';
  score: number;
  checks: Check[];
  endpoints: {
    authorizationEndpoint?: string;
    tokenEndpoint?: string;
    jwksUri?: string;
    registrationEndpoint?: string;
  };
};

type OAuthConfigResponse = { config?: { issuer?: string; jwksMode?: string; ready?: boolean }; error?: string };

const statusStyles = {
  pass: 'border-emerald-500/20 bg-emerald-500/8 text-emerald-200',
  warn: 'border-amber-500/20 bg-amber-500/8 text-amber-200',
  fail: 'border-red-500/20 bg-red-500/8 text-red-200',
};

function StatusIcon({ status }: { status: Check['status'] }) {
  if (status === 'pass') return <CheckCircle2 className="h-4 w-4 shrink-0" />;
  if (status === 'warn') return <AlertTriangle className="h-4 w-4 shrink-0" />;
  return <XCircle className="h-4 w-4 shrink-0" />;
}

export default function McpOAuthDiagnosticsPage() {
  const [issuer, setIssuer] = useState('');
  const [jwksUri, setJwksUri] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadConfiguredIssuer = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/mcp/oauth', { cache: 'no-store' });
      const data = await response.json() as OAuthConfigResponse;
      if (response.ok && data.config?.issuer) setIssuer((current) => current || data.config?.issuer || '');
    } catch { /* diagnostics can still be entered manually */ }
  }, []);

  useEffect(() => { void loadConfiguredIssuer(); }, [loadConfiguredIssuer]);

  async function diagnose() {
    setBusy(true);
    setError('');
    setReport(null);
    try {
      const response = await fetch('/api/admin/mcp/oauth/readiness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issuer, jwksUri }),
      });
      const data = await response.json() as { report?: Report; error?: string };
      if (!response.ok || !data.report) throw new Error(data.error || 'No se pudo diagnosticar el issuer.');
      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el diagnóstico.');
    } finally {
      setBusy(false);
    }
  }

  const registrationLabel = report?.registrationMode === 'cimd'
    ? 'CIMD moderno'
    : report?.registrationMode === 'dcr'
      ? 'DCR legacy'
      : report?.registrationMode === 'preregister'
        ? 'Pre-registro manual'
        : 'Sin determinar';

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Soluciones Fabrick · MCP · OAuth"
        title="Diagnóstico del Authorization Server"
        description="Comprueba discovery, PKCE, refresh tokens, JWKS y registro de cliente antes de activar un issuer para ChatGPT u otro cliente MCP. No guarda secretos ni modifica la configuración."
        icon={SearchCheck}
      />

      <AdminMotion>
        <div className="grid gap-5">
          {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</div>}

          <AdminCard>
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
              <input value={issuer} onChange={(event) => setIssuer(event.target.value)} placeholder="https://issuer.example.com" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40" />
              <input value={jwksUri} onChange={(event) => setJwksUri(event.target.value)} placeholder="JWKS URI opcional; vacío = discovery" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40" />
              <button type="button" disabled={busy || !issuer.trim()} onClick={() => void diagnose()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-black disabled:opacity-40">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />}
                Probar issuer
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-500">Las consultas salientes validan HTTPS, bloquean localhost/redes privadas y validan cada redirect antes de seguirlo.</p>
          </AdminCard>

          {report && (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AdminCard>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Compatibilidad base</p>
                  <p className={`mt-3 text-xl font-black ${report.chatgptCoreReady ? 'text-emerald-300' : 'text-red-300'}`}>{report.chatgptCoreReady ? 'Lista' : 'Bloqueada'}</p>
                  <p className="mt-2 text-xs text-zinc-500">Authorization Code + PKCE + JWT/JWKS.</p>
                </AdminCard>
                <AdminCard>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Sesión persistente</p>
                  <p className={`mt-3 text-xl font-black ${report.persistentSessionReady ? 'text-emerald-300' : 'text-amber-300'}`}>{report.persistentSessionReady ? 'Lista' : 'Revisar refresh'}</p>
                  <p className="mt-2 text-xs text-zinc-500">offline_access + refresh_token.</p>
                </AdminCard>
                <AdminCard>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Registro MCP</p>
                  <p className="mt-3 text-xl font-black text-white">{registrationLabel}</p>
                  <p className="mt-2 text-xs text-zinc-500">CIMD es preferido en MCP 2026; DCR queda como fallback.</p>
                </AdminCard>
                <AdminCard>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Readiness</p>
                  <p className="mt-3 text-3xl font-black text-white">{report.score}%</p>
                  <p className="mt-2 text-xs text-zinc-500">No reemplaza la prueba final con un access token real.</p>
                </AdminCard>
              </div>

              <AdminCard>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-300" />
                  <div>
                    <h2 className="font-black text-white">Checklist de interoperabilidad</h2>
                    <p className="mt-1 break-all text-xs text-zinc-500">Metadata: {report.metadataUrl || '—'}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 lg:grid-cols-2">
                  {report.checks.map((item) => (
                    <div key={item.id} className={`rounded-2xl border p-4 ${statusStyles[item.status]}`}>
                      <div className="flex items-center gap-2 text-sm font-black"><StatusIcon status={item.status} />{item.label}</div>
                      <p className="mt-2 break-all text-xs leading-5 opacity-80">{item.message}</p>
                    </div>
                  ))}
                </div>
              </AdminCard>

              <AdminCard>
                <p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Endpoints descubiertos</p>
                <div className="mt-3 grid gap-2 font-mono text-xs text-zinc-300">
                  <p className="break-all">authorize: {report.endpoints.authorizationEndpoint || '—'}</p>
                  <p className="break-all">token: {report.endpoints.tokenEndpoint || '—'}</p>
                  <p className="break-all">jwks: {report.endpoints.jwksUri || '—'}</p>
                  <p className="break-all">registration: {report.endpoints.registrationEndpoint || (report.registrationMode === 'cimd' ? 'CIMD; no DCR necesario' : 'pre-registro manual')}</p>
                </div>
              </AdminCard>

              <AdminCard>
                <p className="text-sm font-black text-white">Qué falta para una prueba end-to-end</p>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-400">Un resultado verde confirma que el Authorization Server publica las capacidades necesarias, pero Fabrick todavía debe recibir un access token real con `aud` igual al recurso MCP, `sub`, `client_id`/`azp` y scopes. Después se crea la vinculación en OAuth 2.1 y se prueba `/api/mcp` con ese token.</p>
              </AdminCard>
            </>
          )}
        </div>
      </AdminMotion>
    </AdminPage>
  );
}

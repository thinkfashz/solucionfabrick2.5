'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Cable, Check, Clipboard, KeyRound, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';

type Kit = {
  endpoint: string;
  resource: string;
  protectedResourceMetadata: string;
  issuer: string;
  oauthReady: boolean;
  resourceScopes: string[];
  recommendedInteractiveScopes: string[];
  authorization: {
    flow: string;
    pkce: string;
    refreshTokensRecommended: boolean;
    registrationPriority: string[];
    jwtAudienceRequired: string;
  };
  bearer: { supported: boolean; header: string; note: string };
};

type Generated = {
  callback: { url: string; exactMatchRequired: boolean; looksLikeCurrentChatGptCallback: boolean };
  warnings: string[];
  preRegistrationExample: Record<string, unknown>;
  connectionProfile: Record<string, unknown>;
  steps: string[];
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch { /* clipboard permissions can be denied */ }
  }
  return (
    <button type="button" onClick={() => void copy()} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] font-black text-zinc-300 hover:border-white/20 hover:text-white">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Clipboard className="h-3.5 w-3.5" />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">{label}</p>
        <p className="mt-1 break-all font-mono text-xs text-zinc-200">{value || '—'}</p>
      </div>
      {value && <CopyButton value={value} />}
    </div>
  );
}

export default function McpOAuthConnectionKitPage() {
  const [kit, setKit] = useState<Kit | null>(null);
  const [callbackUrl, setCallbackUrl] = useState('');
  const [clientType, setClientType] = useState<'chatgpt' | 'generic' | 'bearer'>('chatgpt');
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/mcp/oauth/setup-kit', { cache: 'no-store' });
      const data = await response.json() as { kit?: Kit; error?: string };
      if (!response.ok || !data.kit) throw new Error(data.error || 'No se pudo cargar el kit MCP.');
      setKit(data.kit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el kit MCP.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function generate() {
    setBusy(true);
    setError('');
    setGenerated(null);
    try {
      const response = await fetch('/api/admin/mcp/oauth/setup-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callbackUrl, clientType }),
      });
      const data = await response.json() as Generated & { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo generar el perfil de conexión.');
      setGenerated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el perfil.');
    } finally {
      setBusy(false);
    }
  }

  const bearerSnippet = useMemo(() => kit ? JSON.stringify({
    mcpServers: {
      'soluciones-fabrick': {
        transport: 'streamable-http',
        url: kit.endpoint,
        headers: { Authorization: 'Bearer <TOKEN_SFMCP>' },
      },
    },
  }, null, 2) : '', [kit]);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Soluciones Fabrick · MCP · conexión"
        title="Kit de conexión"
        description="Centraliza los valores exactos para ChatGPT, clientes MCP OAuth y clientes que usan Bearer. Fabrick no inventa callbacks ni guarda la callback que pegues aquí."
        icon={Cable}
      />

      <AdminMotion>
        <div className="grid gap-5">
          {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</div>}

          <div className="grid gap-4 xl:grid-cols-3">
            <AdminCard>
              <p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Endpoint MCP</p>
              <p className="mt-3 break-all font-mono text-xs text-white">{kit?.endpoint || 'Cargando…'}</p>
              <p className="mt-3 text-xs leading-5 text-zinc-500">Streamable HTTP. Es la URL que se entrega al cliente MCP.</p>
            </AdminCard>
            <AdminCard>
              <p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Resource / audience</p>
              <p className="mt-3 break-all font-mono text-xs text-white">{kit?.resource || 'Cargando…'}</p>
              <p className="mt-3 text-xs leading-5 text-zinc-500">El access token JWT debe estar emitido específicamente para este recurso.</p>
            </AdminCard>
            <AdminCard>
              <p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">OAuth</p>
              <p className={`mt-3 text-xl font-black ${kit?.oauthReady ? 'text-emerald-300' : 'text-amber-300'}`}>{kit?.oauthReady ? 'Configurado' : 'Pendiente de issuer'}</p>
              <p className="mt-3 break-all text-xs text-zinc-500">{kit?.issuer || 'MCP_OAUTH_ISSUER todavía no configurado'}</p>
            </AdminCard>
          </div>

          <AdminCard>
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-amber-300" />
              <div>
                <h2 className="text-lg font-black text-white">Valores canónicos de Fabrick</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-400">Copia estos valores; no uses URLs del preview como configuración permanente.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              <ValueRow label="MCP endpoint" value={kit?.endpoint || ''} />
              <ValueRow label="Resource / audience" value={kit?.resource || ''} />
              <ValueRow label="Protected Resource Metadata" value={kit?.protectedResourceMetadata || ''} />
              <ValueRow label="Scopes Fabrick" value={kit?.resourceScopes?.join(' ') || ''} />
              <ValueRow label="Scopes interactivos recomendados" value={kit?.recommendedInteractiveScopes?.join(' ') || ''} />
            </div>
          </AdminCard>

          <AdminCard>
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-5 w-5 text-amber-300" />
              <div>
                <h2 className="text-lg font-black text-white">Registrar ChatGPT u otro cliente OAuth</h2>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-zinc-400">Cuando ChatGPT cree la app te mostrará una callback propia. Cópiala exactamente aquí y Fabrick generará el perfil de registro. No hay una callback genérica que debamos inventar.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[220px_1fr_auto]">
              <select value={clientType} onChange={(event) => setClientType(event.target.value as typeof clientType)} className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40">
                <option value="chatgpt">ChatGPT</option>
                <option value="generic">Otro cliente OAuth</option>
                <option value="bearer">Cliente Bearer</option>
              </select>
              <input value={callbackUrl} onChange={(event) => setCallbackUrl(event.target.value)} placeholder="Pega aquí la callback exacta mostrada por el cliente" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40" />
              <button type="button" disabled={busy || !callbackUrl.trim()} onClick={() => void generate()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-black disabled:opacity-40">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cable className="h-4 w-4" />}
                Generar perfil
              </button>
            </div>

            {generated && (
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-white">Perfil de conexión</p>
                    <CopyButton value={JSON.stringify(generated.connectionProfile, null, 2)} />
                  </div>
                  <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-black/30 p-3 text-[11px] leading-5 text-zinc-300">{JSON.stringify(generated.connectionProfile, null, 2)}</pre>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-white">Ejemplo de pre-registro</p>
                    <CopyButton value={JSON.stringify(generated.preRegistrationExample, null, 2)} />
                  </div>
                  <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-black/30 p-3 text-[11px] leading-5 text-zinc-300">{JSON.stringify(generated.preRegistrationExample, null, 2)}</pre>
                  <p className="mt-3 text-xs leading-5 text-zinc-500">`token_endpoint_auth_method: none` representa un cliente público con PKCE. Si tu Authorization Server exige cliente confidencial, usa el método/secret que ese proveedor configure y no expongas el secret en Fabrick.</p>
                </div>

                {generated.warnings.length > 0 && (
                  <div className="xl:col-span-2 rounded-2xl border border-amber-500/20 bg-amber-500/8 p-4 text-sm text-amber-100">
                    {generated.warnings.map((warning) => <p key={warning}>• {warning}</p>)}
                  </div>
                )}

                <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-black text-white">Secuencia de conexión</p>
                  <ol className="mt-3 grid gap-2 text-sm leading-6 text-zinc-400">
                    {generated.steps.map((step, index) => <li key={step}><span className="mr-2 font-black text-amber-300">{index + 1}.</span>{step}</li>)}
                  </ol>
                </div>
              </div>
            )}
          </AdminCard>

          <AdminCard>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-black text-white">Clientes sin OAuth</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-400">Ollama, clientes internos y otras interfaces que permitan headers pueden seguir usando una credencial `sfmcp_` individual con scopes y gobernanza.</p>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
              <pre className="min-w-0 flex-1 overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-zinc-300">{bearerSnippet}</pre>
              {bearerSnippet && <CopyButton value={bearerSnippet} />}
            </div>
          </AdminCard>
        </div>
      </AdminMotion>
    </AdminPage>
  );
}

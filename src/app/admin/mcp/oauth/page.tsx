'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Link2, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';

type OAuthConfig = {
  ready: boolean;
  verifierEnabled: boolean;
  metadataEnabled: boolean;
  allowSubjectOnlyBinding: boolean;
  issuer: string;
  audience: string;
  jwksMode: 'explicit' | 'discovery';
  jwksConfigured: boolean;
  allowedAlgs: string[];
  clockSkewSeconds: number;
};

type Connection = { keyId: string; label: string; tokenPrefix: string; scopes: string[]; legacy: boolean };
type Binding = {
  id: string;
  issuer: string;
  subject_hint: string;
  client_id: string;
  key_id: string;
  label: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

type ResponseData = { config: OAuthConfig; connections: Connection[]; bindings: Binding[]; error?: string };

export default function McpOAuthPage() {
  const [data, setData] = useState<ResponseData | null>(null);
  const [subject, setSubject] = useState('');
  const [clientId, setClientId] = useState('');
  const [keyId, setKeyId] = useState('');
  const [label, setLabel] = useState('ChatGPT OAuth');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/mcp/oauth', { cache: 'no-store' });
    const next = await response.json() as ResponseData;
    if (!response.ok) {
      setError(next.error || 'No se pudo cargar OAuth MCP.');
      return;
    }
    setData(next);
    setKeyId((current) => current || next.connections[0]?.keyId || '');
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveBinding() {
    setBusy('save');
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/mcp/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, clientId, keyId, label }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'No se pudo crear la vinculación.');
      setSubject('');
      setClientId('');
      setMessage('Identidad OAuth vinculada a la credencial MCP.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setBusy('');
    }
  }

  async function removeBinding(id: string) {
    setBusy(`delete:${id}`);
    setError('');
    try {
      const response = await fetch(`/api/admin/mcp/oauth?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'No se pudo eliminar.');
      setMessage('Vinculación OAuth eliminada.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar.');
    } finally {
      setBusy('');
    }
  }

  const config = data?.config;
  const requiresClientId = config?.allowSubjectOnlyBinding !== true;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Soluciones Fabrick · MCP"
        title="OAuth 2.1 & JWKS"
        description="Valida tokens JWT del Authorization Server y vincula identidades externas a una credencial MCP concreta, sin confiar el tenant al cliente."
        icon={ShieldCheck}
      />

      <AdminMotion>
        <div className="grid gap-5">
          {(error || message) && (
            <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${error ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}>
              {error || message}
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-3">
            <AdminCard>
              <p className="text-xs font-black uppercase tracking-[.2em] text-zinc-500">Estado</p>
              <p className={`mt-3 text-xl font-black ${config?.ready ? 'text-emerald-300' : 'text-amber-300'}`}>{config?.ready ? 'OAuth listo' : 'OAuth apagado'}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">El verificador y la metadata deben estar habilitados a la vez. Hasta entonces las credenciales `sfmcp_` siguen siendo el método activo.</p>
            </AdminCard>
            <AdminCard>
              <p className="text-xs font-black uppercase tracking-[.2em] text-zinc-500">Issuer</p>
              <p className="mt-3 break-all font-mono text-xs text-zinc-300">{config?.issuer || 'MCP_OAUTH_ISSUER no configurado'}</p>
              <p className="mt-3 text-xs text-zinc-500">JWKS: {config?.jwksMode === 'explicit' ? 'URI explícita' : 'descubrimiento RFC 8414 / OIDC'}</p>
            </AdminCard>
            <AdminCard>
              <p className="text-xs font-black uppercase tracking-[.2em] text-zinc-500">Audience / resource</p>
              <p className="mt-3 break-all font-mono text-xs text-zinc-300">{config?.audience || '—'}</p>
              <p className="mt-3 text-xs text-zinc-500">Algoritmos: {config?.allowedAlgs?.join(' · ') || '—'}</p>
            </AdminCard>
          </div>

          <AdminCard>
            <div className="flex items-start gap-3">
              <KeyRound className="mt-1 h-5 w-5 text-amber-300" />
              <div>
                <h2 className="text-lg font-black text-white">Vincular identidad del Authorization Server</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-400">Copia el claim `sub` y el `client_id`/`azp` del access token. Fabrick guarda solo un hash SHA-256 del subject. Por defecto exige ambas identidades; el modo solo-subject debe habilitarse explícitamente.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="subject (sub) exacto" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40" />
              <input value={clientId} onChange={(event) => setClientId(event.target.value)} placeholder={requiresClientId ? 'client_id / azp obligatorio' : 'client_id / azp opcional'} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40" />
              <select value={keyId} onChange={(event) => setKeyId(event.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40">
                {(data?.connections || []).map((connection) => <option key={connection.keyId} value={connection.keyId}>{connection.label} · {connection.scopes.join(', ')}</option>)}
              </select>
              <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Etiqueta visible" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40" />
            </div>
            <button type="button" disabled={busy === 'save' || !subject || !keyId || (requiresClientId && !clientId)} onClick={() => void saveBinding()} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-black text-black disabled:opacity-40">
              {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Vincular identidad
            </button>
          </AdminCard>

          <AdminCard>
            <div className="flex items-center gap-2"><Link2 className="h-5 w-5 text-amber-300" /><h2 className="text-lg font-black text-white">Vinculaciones activas</h2></div>
            <div className="mt-4 grid gap-3">
              {(data?.bindings || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-zinc-500">No hay identidades OAuth vinculadas todavía.</div>
              ) : data?.bindings.map((binding) => (
                <div key={binding.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-white">{binding.label || 'OAuth MCP'}</p>
                    <p className="mt-1 text-xs text-zinc-500">subject: {binding.subject_hint || 'hash'} {binding.client_id ? `· client: ${binding.client_id}` : '· solo subject (modo explícito)'}</p>
                    <p className="mt-1 font-mono text-[11px] text-zinc-600">credencial: {binding.key_id}</p>
                  </div>
                  <button type="button" disabled={Boolean(busy)} onClick={() => void removeBinding(binding.id)} className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-200 disabled:opacity-40">
                    {busy === `delete:${binding.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Eliminar
                  </button>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard>
            <p className="text-xs font-black uppercase tracking-[.2em] text-zinc-500">Activación segura</p>
            <div className="mt-3 grid gap-2 font-mono text-xs text-zinc-300">
              <p>MCP_OAUTH_ENABLED=1</p>
              <p>MCP_OAUTH_METADATA_ENABLED=1</p>
              <p>MCP_OAUTH_ISSUER=https://tu-authorization-server</p>
              <p>MCP_OAUTH_AUDIENCE=https://www.solucionesfabrick.com/api/mcp</p>
              <p className="text-zinc-500">Opcional: MCP_OAUTH_JWKS_URI, MCP_OAUTH_ALLOWED_ALGS y MCP_OAUTH_ALLOW_SUBJECT_ONLY_BINDING=1. Este último reduce el vínculo de identidad y debe usarse solo si el issuer no entrega client_id/azp.</p>
            </div>
          </AdminCard>
        </div>
      </AdminMotion>
    </AdminPage>
  );
}

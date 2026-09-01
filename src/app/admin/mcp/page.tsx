'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Clipboard,
  Cloud,
  KeyRound,
  Link2,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';

type McpConnection = {
  keyId: string;
  tokenPrefix: string;
  scopes: string[];
  label: string;
  createdAt: string;
  updatedAt: string | null;
  legacy?: boolean;
};

type McpStatus = {
  configured: boolean;
  tokenPrefix: string;
  scopes: string[];
  label: string;
  updatedAt: string | null;
  endpoint: string;
  secretEndpointTemplate: string;
  connections: McpConnection[];
  availableScopes: Array<{ id: string; label: string }>;
};

type FieldStatus = { set?: boolean; preview?: string };
type IntegrationsResponse = {
  encrypted?: boolean;
  providers?: Record<string, { credentials?: Record<string, FieldStatus>; updated_at?: string }>;
};

type CreatedAccess = {
  token: string;
  keyId: string;
  secretEndpoint: string;
  endpoint: string;
  scopes: string[];
  label: string;
};

const EMPTY_STATUS: McpStatus = {
  configured: false,
  tokenPrefix: '',
  scopes: [],
  label: '',
  updatedAt: null,
  endpoint: '',
  secretEndpointTemplate: '',
  connections: [],
  availableScopes: [
    { id: 'products:read', label: 'Leer, supervisar y buscar mercado' },
    { id: 'products:write', label: 'Crear y editar borradores' },
    { id: 'products:publish', label: 'Activar o desactivar productos' },
    { id: 'inventory:write', label: 'Mover stock' },
  ],
};

function maskLabel(field?: FieldStatus) {
  if (!field?.set) return 'No configurado';
  return field.preview || 'Configurado';
}

function dateLabel(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-CL');
}

export default function McpAdminPage() {
  const [status, setStatus] = useState<McpStatus>(EMPTY_STATUS);
  const [integrations, setIntegrations] = useState<IntegrationsResponse>({});
  const [created, setCreated] = useState<CreatedAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [clientLabel, setClientLabel] = useState('ChatGPT');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['products:read']);
  const [ollamaKey, setOllamaKey] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [customModel, setCustomModel] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mcpRes, integrationsRes] = await Promise.all([
        fetch('/api/admin/mcp/access', { cache: 'no-store' }),
        fetch('/api/admin/tenant-integrations', { cache: 'no-store' }),
      ]);
      if (mcpRes.ok) setStatus(await mcpRes.json() as McpStatus);
      if (integrationsRes.ok) setIntegrations(await integrationsRes.json() as IntegrationsResponse);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function flash(text: string) {
    setMessage(text);
    setError('');
    window.setTimeout(() => setMessage(''), 3500);
  }

  async function copy(value: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    flash('Copiado al portapapeles.');
  }

  function toggleScope(scope: string) {
    setSelectedScopes((current) => {
      if (current.includes(scope)) {
        const next = current.filter((item) => item !== scope);
        return next.length > 0 ? next : ['products:read'];
      }
      return [...current, scope];
    });
  }

  async function generateAccess() {
    setBusy('token');
    setError('');
    try {
      const res = await fetch('/api/admin/mcp/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: clientLabel.trim() || 'Cliente MCP', scopes: selectedScopes }),
      });
      const data = await res.json() as CreatedAccess & { error?: string };
      if (!res.ok) throw new Error(data.error || 'No se pudo generar el acceso.');
      setCreated(data);
      flash('Credencial MCP generada. Guarda el token ahora.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el acceso.');
    } finally {
      setBusy('');
    }
  }

  async function revokeAccess(keyId?: string) {
    const busyKey = keyId ? `revoke:${keyId}` : 'revoke:all';
    setBusy(busyKey);
    setError('');
    try {
      const suffix = keyId ? `?keyId=${encodeURIComponent(keyId)}` : '';
      const res = await fetch(`/api/admin/mcp/access${suffix}`, { method: 'DELETE' });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || 'No se pudo revocar.');
      if (!keyId || created?.keyId === keyId) setCreated(null);
      flash(keyId ? 'Credencial revocada.' : 'Todas las credenciales MCP fueron revocadas.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo revocar.');
    } finally {
      setBusy('');
    }
  }

  async function saveProvider(provider: 'ollama' | 'custom', credentials: Record<string, string>) {
    setBusy(provider);
    setError('');
    try {
      const res = await fetch('/api/admin/tenant-integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, credentials }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar la integración.');
      if (provider === 'ollama') setOllamaKey('');
      if (provider === 'custom') {
        setCustomKey('');
        setCustomUrl('');
        setCustomModel('');
      }
      flash(provider === 'ollama' ? 'Ollama Cloud guardado.' : 'Conector personalizado guardado.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setBusy('');
    }
  }

  const ollama = integrations.providers?.ollama?.credentials ?? {};
  const custom = integrations.providers?.custom?.credentials ?? {};
  const connectionJson = useMemo(() => {
    const url = created?.secretEndpoint || status.secretEndpointTemplate || status.endpoint || 'https://www.solucionesfabrick.com/api/mcp/{TOKEN}';
    return JSON.stringify({
      mcpServers: {
        'soluciones-fabrick': { url },
      },
    }, null, 2);
  }, [created, status]);

  const bearerExample = useMemo(() => JSON.stringify({
    transport: 'streamable-http',
    url: status.endpoint || 'https://www.solucionesfabrick.com/api/mcp',
    headers: { Authorization: 'Bearer <TOKEN>' },
  }, null, 2), [status.endpoint]);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Soluciones Fabrick · IA"
        title="MCP & conectores IA"
        description="Conecta clientes MCP y proveedores de IA con catálogo, mercado e Inventario V2 usando permisos independientes por cliente."
        icon={Link2}
      />

      <AdminMotion>
        <div className="grid gap-5">
          {(message || error) && (
            <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${error ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}>
              {error || message}
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <AdminCard>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-amber-300">
                    <ShieldCheck className="h-4 w-4" /> Gateway MCP
                  </div>
                  <h2 className="mt-3 text-2xl font-black tracking-[-.04em] text-white">Credenciales por cliente</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Crea una credencial distinta para cada interfaz. Cada token se guarda solo como hash, tiene permisos propios y puede revocarse sin desconectar las demás IAs.</p>
                </div>
                <div className={`rounded-full border px-3 py-1 text-xs font-black ${status.configured ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-white/5 text-zinc-400'}`}>
                  {loading ? 'Comprobando…' : `${status.connections.length} conexión${status.connections.length === 1 ? '' : 'es'}`}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Endpoint estándar</p>
                <p className="mt-2 break-all font-mono text-xs text-zinc-300">{status.endpoint || '—'}</p>
                <button type="button" onClick={() => void copy(status.endpoint)} className="mt-3 inline-flex items-center gap-2 text-xs font-black text-amber-300"><Clipboard className="h-3.5 w-3.5" /> Copiar</button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input value={clientLabel} onChange={(e) => setClientLabel(e.target.value)} placeholder="Nombre del cliente, ej. ChatGPT" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/40" />
                <button type="button" disabled={Boolean(busy)} onClick={() => void generateAccess()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-black text-black disabled:opacity-50">
                  {busy === 'token' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Crear credencial
                </button>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {status.availableScopes.map((scope) => {
                  const selected = selectedScopes.includes(scope.id);
                  return (
                    <button key={scope.id} type="button" onClick={() => toggleScope(scope.id)} className={`rounded-2xl border p-3 text-left transition ${selected ? 'border-amber-300/40 bg-amber-300/10' : 'border-white/10 bg-black/20 hover:border-white/20'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${selected ? 'bg-amber-300' : 'bg-zinc-700'}`} />
                        <span className="text-xs font-black text-white">{scope.id}</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-zinc-500">{scope.label}</p>
                    </button>
                  );
                })}
              </div>

              {created && (
                <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
                  <div className="flex items-start gap-3">
                    <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-amber-100">{created.label} · guarda este token ahora</p>
                      <p className="mt-1 text-xs leading-5 text-amber-50/70">No volveremos a mostrar el secreto en texto plano. Permisos: {created.scopes.join(' · ')}</p>
                      <div className="mt-3 flex gap-2">
                        <code className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-black/40 px-3 py-2 text-xs text-amber-100">{created.token}</code>
                        <button type="button" onClick={() => void copy(created.token)} className="rounded-xl border border-amber-200/20 px-3 text-amber-100"><Clipboard className="h-4 w-4" /></button>
                      </div>
                      <button type="button" onClick={() => void copy(created.secretEndpoint)} className="mt-3 inline-flex items-center gap-2 text-xs font-black text-amber-200"><Link2 className="h-4 w-4" /> Copiar URL secreta</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 grid gap-3">
                {status.connections.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-zinc-500">Aún no hay clientes MCP autorizados.</div>
                ) : status.connections.map((connection) => (
                  <div key={`${connection.keyId}-${connection.tokenPrefix}`} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-white">{connection.label || 'Cliente MCP'}</p>
                        {connection.legacy && <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-yellow-200">legacy</span>}
                      </div>
                      <p className="mt-1 font-mono text-xs text-zinc-500">{connection.tokenPrefix}••••</p>
                      <p className="mt-1 text-[11px] text-zinc-600">{connection.scopes.join(' · ')} · {dateLabel(connection.updatedAt || connection.createdAt)}</p>
                    </div>
                    {!connection.legacy && (
                      <button type="button" disabled={Boolean(busy)} onClick={() => void revokeAccess(connection.keyId)} className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-200 disabled:opacity-40">
                        {busy === `revoke:${connection.keyId}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Revocar
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {status.connections.length > 1 && (
                <button type="button" disabled={Boolean(busy)} onClick={() => void revokeAccess()} className="mt-4 inline-flex items-center gap-2 text-xs font-black text-red-300 disabled:opacity-40">
                  <Trash2 className="h-3.5 w-3.5" /> Revocar todas las credenciales
                </button>
              )}
            </AdminCard>

            <AdminCard>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-sky-300"><Bot className="h-4 w-4" /> Clientes</div>
              <h2 className="mt-3 text-2xl font-black tracking-[-.04em] text-white">Streamable HTTP universal</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Usa Bearer cuando el cliente permita headers. Para interfaces que solo aceptan una URL, usa la URL secreta de la credencial recién creada.</p>
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-zinc-600">Configuración URL</p>
              <pre className="mt-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-[11px] leading-5 text-zinc-300">{connectionJson}</pre>
              <button type="button" onClick={() => void copy(connectionJson)} className="mt-3 inline-flex items-center gap-2 text-xs font-black text-sky-300"><Clipboard className="h-3.5 w-3.5" /> Copiar JSON</button>

              <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-zinc-600">Bearer / cliente avanzado</p>
              <pre className="mt-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-[11px] leading-5 text-zinc-300">{bearerExample}</pre>
              <button type="button" onClick={() => void copy(bearerExample)} className="mt-3 inline-flex items-center gap-2 text-xs font-black text-sky-300"><Clipboard className="h-3.5 w-3.5" /> Copiar configuración Bearer</button>

              <div className="mt-5 grid gap-2 text-xs text-zinc-400">
                <p><strong className="text-white">Lectura:</strong> catálogo, supervisión y búsqueda de referentes de mercado.</p>
                <p><strong className="text-white">Escritura segura:</strong> primero vista previa; después confirmación y <code className="text-zinc-300">commit=true</code>.</p>
                <p><strong className="text-white">Publicación:</strong> activar/desactivar requiere un permiso independiente.</p>
                <p><strong className="text-white">Stock:</strong> siempre por ledger atómico. Los borradores externos entran inactivos y con stock 0.</p>
              </div>
            </AdminCard>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <AdminCard>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-violet-300"><Cloud className="h-4 w-4" /> Ollama Cloud</div>
                  <h2 className="mt-3 text-xl font-black text-white">Modelos cloud de Ollama</h2>
                </div>
                <span className="text-xs font-bold text-zinc-500">{maskLabel(ollama.api_key)}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Guarda tu API key de ollama.com. Después los modelos disponibles aparecen en Modelos IA para probarlos antes de usarlos.</p>
              <label className="mt-4 grid gap-2 text-xs font-black uppercase tracking-wider text-zinc-500">
                API key
                <input type="password" value={ollamaKey} onChange={(e) => setOllamaKey(e.target.value)} placeholder="ollama_…" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-violet-400/40" />
              </label>
              <button type="button" disabled={!ollamaKey.trim() || Boolean(busy)} onClick={() => void saveProvider('ollama', { api_key: ollamaKey.trim() })} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-violet-300 px-4 py-3 text-sm font-black text-black disabled:opacity-40">
                {busy === 'ollama' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar Ollama
              </button>
            </AdminCard>

            <AdminCard>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-cyan-300"><WandSparkles className="h-4 w-4" /> Personalizado</div>
                  <h2 className="mt-3 text-xl font-black text-white">API OpenAI-compatible</h2>
                </div>
                <span className="text-xs font-bold text-zinc-500">{maskLabel(custom.base_url)}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Úsalo con gateways o proveedores que implementen <code className="text-cyan-200">/v1/chat/completions</code>. Fabrick bloquea localhost y redes privadas por defecto.</p>
              <div className="mt-4 grid gap-3">
                <input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://api.tu-ia.com/v1" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40" />
                <input type="password" value={customKey} onChange={(e) => setCustomKey(e.target.value)} placeholder="API key (opcional si el gateway no la usa)" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40" />
                <input value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="ID de modelo, ej. llama-3.3-70b" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40" />
              </div>
              <button type="button" disabled={!customUrl.trim() || !customModel.trim() || Boolean(busy)} onClick={() => void saveProvider('custom', { base_url: customUrl.trim(), api_key: customKey.trim(), modelo: customModel.trim() })} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-black disabled:opacity-40">
                {busy === 'custom' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar conector
              </button>
            </AdminCard>
          </div>

          <AdminCard>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-300" />
                <div>
                  <h2 className="font-black text-white">Selección y prueba de modelos</h2>
                  <p className="mt-1 text-sm text-zinc-400">Ollama y el conector personalizado se integran con el selector existente. Desde allí puedes probar latencia, conversación y catálogo de modelos antes de usarlos en agentes.</p>
                </div>
              </div>
              <Link href="/admin/modelos-ia" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white hover:bg-white/10"><Bot className="h-4 w-4" /> Abrir Modelos IA</Link>
            </div>
          </AdminCard>
        </div>
      </AdminMotion>
    </AdminPage>
  );
}

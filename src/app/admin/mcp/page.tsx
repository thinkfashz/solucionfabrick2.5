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
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';

type McpStatus = {
  configured: boolean;
  tokenPrefix: string;
  scopes: string[];
  label: string;
  updatedAt: string | null;
  endpoint: string;
  secretEndpointTemplate: string;
};

type FieldStatus = { set?: boolean; preview?: string };
type IntegrationsResponse = {
  encrypted?: boolean;
  providers?: Record<string, { credentials?: Record<string, FieldStatus>; updated_at?: string }>;
};

type CreatedAccess = {
  token: string;
  secretEndpoint: string;
  endpoint: string;
  scopes: string[];
};

const EMPTY_STATUS: McpStatus = {
  configured: false,
  tokenPrefix: '',
  scopes: [],
  label: '',
  updatedAt: null,
  endpoint: '',
  secretEndpointTemplate: '',
};

function maskLabel(field?: FieldStatus) {
  if (!field?.set) return 'No configurado';
  return field.preview || 'Configurado';
}

export default function McpAdminPage() {
  const [status, setStatus] = useState<McpStatus>(EMPTY_STATUS);
  const [integrations, setIntegrations] = useState<IntegrationsResponse>({});
  const [created, setCreated] = useState<CreatedAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  async function generateAccess() {
    setBusy('token');
    setError('');
    try {
      const res = await fetch('/api/admin/mcp/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'ChatGPT / agentes IA' }),
      });
      const data = await res.json() as CreatedAccess & { error?: string };
      if (!res.ok) throw new Error(data.error || 'No se pudo generar el acceso.');
      setCreated(data);
      flash('Acceso MCP generado. Guarda el token ahora.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el acceso.');
    } finally {
      setBusy('');
    }
  }

  async function revokeAccess() {
    setBusy('revoke');
    setError('');
    try {
      const res = await fetch('/api/admin/mcp/access', { method: 'DELETE' });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || 'No se pudo revocar.');
      setCreated(null);
      flash('Acceso MCP revocado.');
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

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Soluciones Fabrick · IA"
        title="MCP & conectores IA"
        description="Conecta ChatGPT, Ollama Cloud y clientes MCP con tu catálogo e Inventario V2 sin duplicar lógica de stock."
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
                  <h2 className="mt-3 text-2xl font-black tracking-[-.04em] text-white">Acceso para ChatGPT y agentes</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">El token identifica este negocio y define qué herramientas puede usar el agente. Se guarda solo su hash; al rotarlo, el anterior deja de funcionar.</p>
                </div>
                <div className={`rounded-full border px-3 py-1 text-xs font-black ${status.configured ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-white/5 text-zinc-400'}`}>
                  {loading ? 'Comprobando…' : status.configured ? 'Activo' : 'Sin acceso'}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Endpoint estándar</p>
                  <p className="mt-2 break-all font-mono text-xs text-zinc-300">{status.endpoint || '—'}</p>
                  <button type="button" onClick={() => void copy(status.endpoint)} className="mt-3 inline-flex items-center gap-2 text-xs font-black text-amber-300"><Clipboard className="h-3.5 w-3.5" /> Copiar</button>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Token actual</p>
                  <p className="mt-2 font-mono text-xs text-zinc-300">{status.configured ? `${status.tokenPrefix}••••••••` : 'No generado'}</p>
                  <p className="mt-2 text-[11px] text-zinc-600">Ámbitos: {status.scopes.length ? status.scopes.join(' · ') : '—'}</p>
                </div>
              </div>

              {created && (
                <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
                  <div className="flex items-start gap-3">
                    <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-amber-100">Guarda este token ahora</p>
                      <p className="mt-1 text-xs leading-5 text-amber-50/70">No volveremos a mostrarlo en texto plano.</p>
                      <div className="mt-3 flex gap-2">
                        <code className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-black/40 px-3 py-2 text-xs text-amber-100">{created.token}</code>
                        <button type="button" onClick={() => void copy(created.token)} className="rounded-xl border border-amber-200/20 px-3 text-amber-100"><Clipboard className="h-4 w-4" /></button>
                      </div>
                      <button type="button" onClick={() => void copy(created.secretEndpoint)} className="mt-3 inline-flex items-center gap-2 text-xs font-black text-amber-200"><Link2 className="h-4 w-4" /> Copiar URL secreta compatible</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" disabled={Boolean(busy)} onClick={() => void generateAccess()} className="inline-flex items-center gap-2 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-black text-black disabled:opacity-50">
                  {busy === 'token' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {status.configured ? 'Rotar token' : 'Generar acceso MCP'}
                </button>
                {status.configured && (
                  <button type="button" disabled={Boolean(busy)} onClick={() => void revokeAccess()} className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 disabled:opacity-50">
                    <Trash2 className="h-4 w-4" /> Revocar
                  </button>
                )}
              </div>
            </AdminCard>

            <AdminCard>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-sky-300"><Bot className="h-4 w-4" /> Clientes</div>
              <h2 className="mt-3 text-2xl font-black tracking-[-.04em] text-white">Conexión universal</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Para un cliente con headers usa el endpoint estándar y Bearer token. Si una interfaz solo acepta una URL, usa la URL secreta generada.</p>
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-[11px] leading-5 text-zinc-300">{connectionJson}</pre>
              <button type="button" onClick={() => void copy(connectionJson)} className="mt-3 inline-flex items-center gap-2 text-xs font-black text-sky-300"><Clipboard className="h-3.5 w-3.5" /> Copiar configuración</button>
              <div className="mt-5 grid gap-2 text-xs text-zinc-400">
                <p><strong className="text-white">Lectura:</strong> buscar, ver fichas y supervisar catálogo.</p>
                <p><strong className="text-white">Escritura:</strong> crear/editar productos y mover stock por ledger atómico.</p>
                <p><strong className="text-white">Stock:</strong> nunca se cambia directo en la ficha; siempre pasa por Inventario V2.</p>
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
              <p className="mt-2 text-sm leading-6 text-zinc-400">Guarda tu API key de ollama.com. Después los modelos disponibles aparecerán automáticamente en Modelos IA.</p>
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
                  <h2 className="mt-3 text-xl font-black text-white">Cualquier API OpenAI-compatible</h2>
                </div>
                <span className="text-xs font-bold text-zinc-500">{maskLabel(custom.base_url)}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Úsalo con gateways o proveedores que implementen <code className="text-cyan-200">/v1/chat/completions</code>. El endpoint debe ser accesible desde Internet por el servidor de Fabrick.</p>
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
                  <p className="mt-1 text-sm text-zinc-400">Ollama y el conector personalizado se integran con el selector existente. Desde allí puedes probar latencia, conversación y modelos antes de usarlos en agentes.</p>
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

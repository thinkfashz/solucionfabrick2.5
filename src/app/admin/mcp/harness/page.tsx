'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bot,
  Boxes,
  CheckCircle2,
  KeyRound,
  Loader2,
  MessageSquare,
  PackageCheck,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
  Zap,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

type ModelEntry = { id: string; name: string; description?: string };
type ProviderResult = { id: string; label: string; configured: boolean; error?: string; models: ModelEntry[] };
type TraceItem = { id: string; at: string; label: string; detail: string; tone: 'info' | 'ok' | 'error' };
type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; streaming?: boolean; error?: string; tokens?: { input: number; output: number } };
type AgentScope = 'products:read' | 'products:write' | 'products:publish' | 'inventory:write' | 'analytics:read';
type AgentProfile = { tenantId: string; provider: 'ollama'; enabled: boolean; scopes: AgentScope[]; maxSteps: number; allowScheduledWrites: boolean; updatedAt: string | null };
type AgentToolTrace = { tool: string; phase: 'read' | 'preview' | 'commit'; ok: boolean; detail: string };
type SseEvent =
  | { type: 'chunk'; text: string }
  | { type: 'usage'; tokens: { input: number; output: number; total: number } }
  | { type: 'error'; message: string; errorType: string }
  | { type: 'done' };

type AgentResponse = {
  ok?: boolean;
  error?: string;
  content?: string;
  toolTrace?: AgentToolTrace[];
  steps?: number;
  stoppedByLimit?: boolean;
  usage?: { input: number; output: number; total: number };
};

const PERMISSIONS: Array<{ scope: AgentScope; title: string; detail: string; icon: typeof PackageCheck }> = [
  { scope: 'products:read', title: 'Leer catálogo', detail: 'Buscar, revisar y auditar fichas de productos.', icon: PackageCheck },
  { scope: 'analytics:read', title: 'Analítica y visitas', detail: 'Embudo, tráfico, pedidos, ingresos y recomendaciones.', icon: BarChart3 },
  { scope: 'products:write', title: 'Editar productos', detail: 'Crear borradores y preparar/aplicar cambios.', icon: Wrench },
  { scope: 'products:publish', title: 'Publicar productos', detail: 'Activar o desactivar productos; puede requerir aprobación.', icon: ShieldCheck },
  { scope: 'inventory:write', title: 'Mover inventario', detail: 'Entradas, salidas y ajustes mediante Inventario V2.', icon: Boxes },
];

function nowLabel() {
  return new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function toolLabel(name: string) {
  const labels: Record<string, string> = {
    products_search: 'Buscar productos',
    product_get: 'Leer producto',
    catalog_supervise: 'Auditar catálogo',
    site_intelligence: 'Analizar visitas y negocio',
    market_search: 'Investigar mercado',
    market_product_stage: 'Preparar producto de mercado',
    product_create: 'Crear producto',
    product_update: 'Editar producto',
    inventory_move: 'Mover inventario',
  };
  return labels[name] || name;
}

export default function AiHarnessPage() {
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<ProviderResult | null>(null);
  const [model, setModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'chat' | 'agent'>('agent');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [trace, setTrace] = useState<TraceItem[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [allowCommit, setAllowCommit] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addTrace = useCallback((label: string, detail: string, tone: TraceItem['tone'] = 'info') => {
    setTrace((current) => [{ id: crypto.randomUUID(), at: nowLabel(), label, detail, tone }, ...current].slice(0, 40));
  }, []);

  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    setError('');
    try {
      const response = await fetch('/api/admin/modelos-ia/list', { cache: 'no-store' });
      const data = await response.json() as { providers?: ProviderResult[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los modelos.');
      const ollama = (data.providers || []).find((item) => item.id === 'ollama') || null;
      setProvider(ollama);
      if (ollama?.models?.length) {
        setModel((current) => current && ollama.models.some((item) => item.id === current) ? current : ollama.models[0].id);
        addTrace('Ollama detectado', `${ollama.models.length} modelo(s) disponibles.`, 'ok');
      } else if (ollama?.configured) {
        addTrace('Ollama configurado', ollama.error || 'La API está guardada, pero no devolvió modelos.', ollama.error ? 'error' : 'info');
      } else {
        addTrace('Ollama pendiente', 'Agrega una API key para habilitar chat y agente.', 'info');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar los modelos.';
      setError(message);
      addTrace('Error de modelos', message, 'error');
    } finally {
      setLoadingModels(false);
    }
  }, [addTrace]);

  const loadAgentProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const response = await fetch('/api/admin/mcp/agent-profile', { cache: 'no-store' });
      const data = await response.json() as { profile?: AgentProfile; error?: string };
      if (!response.ok || !data.profile) throw new Error(data.error || 'No se pudo cargar el perfil del agente.');
      setAgentProfile(data.profile);
    } catch (err) {
      addTrace('Permisos del agente', err instanceof Error ? err.message : 'No se pudieron cargar.', 'error');
    } finally {
      setLoadingProfile(false);
    }
  }, [addTrace]);

  useEffect(() => { void loadModels(); void loadAgentProfile(); }, [loadModels, loadAgentProfile]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function saveOllama() {
    if (!apiKey.trim()) {
      setError('Pega tu API key de Ollama Cloud.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/tenant-integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'ollama', credentials: { api_key: apiKey.trim() } }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar Ollama.');
      setApiKey('');
      setNotice('API de Ollama guardada de forma cifrada. Cargando modelos…');
      addTrace('Credencial guardada', 'La clave quedó asociada al tenant y no vuelve al navegador.', 'ok');
      await loadModels();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar Ollama.';
      setError(message);
      addTrace('Error de credencial', message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function toggleScope(scope: AgentScope) {
    setAgentProfile((current) => {
      if (!current) return current;
      const enabled = current.scopes.includes(scope);
      let scopes = enabled ? current.scopes.filter((item) => item !== scope) : [...current.scopes, scope];
      if (scope === 'products:write' && enabled) scopes = scopes.filter((item) => item !== 'products:publish');
      if (scope === 'products:publish' && !enabled && !scopes.includes('products:write')) scopes.push('products:write');
      return { ...current, scopes };
    });
  }

  async function saveAgentProfile() {
    if (!agentProfile) return;
    setSavingProfile(true);
    setError('');
    try {
      const response = await fetch('/api/admin/mcp/agent-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: agentProfile.enabled,
          scopes: agentProfile.scopes,
          maxSteps: agentProfile.maxSteps,
          allowScheduledWrites: agentProfile.allowScheduledWrites,
        }),
      });
      const data = await response.json() as { profile?: AgentProfile; error?: string };
      if (!response.ok || !data.profile) throw new Error(data.error || 'No se pudieron guardar los permisos.');
      setAgentProfile(data.profile);
      setNotice('Permisos del agente guardados.');
      addTrace('Permisos guardados', `${data.profile.scopes.length} capacidad(es) habilitadas.`, 'ok');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron guardar los permisos.';
      setError(message);
      addTrace('Error de permisos', message, 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function sendDirectChat(history: Array<{ role: 'user' | 'assistant'; content: string }>, assistantId: string, started: number) {
    const response = await fetch('/api/admin/modelos-ia/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'ollama', modelo: model, messages: history }),
    });
    if (!response.ok || !response.body) throw new Error(`El chat respondió HTTP ${response.status}.`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let firstToken = false;
    let usage = { input: 0, output: 0 };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6)) as SseEvent;
          if (event.type === 'chunk') {
            if (!firstToken) {
              firstToken = true;
              addTrace('Primer token', `${Math.round(performance.now() - started)} ms`, 'ok');
            }
            setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, content: item.content + event.text } : item));
          } else if (event.type === 'usage') {
            usage = { input: event.tokens.input, output: event.tokens.output };
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        } catch (err) {
          if (err instanceof Error && err.message) throw err;
        }
      }
    }
    setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, streaming: false, tokens: usage } : item));
    addTrace('Chat completado', `${Math.round(performance.now() - started)} ms · ${usage.input + usage.output} tokens.`, 'ok');
  }

  async function sendAgent(history: Array<{ role: 'user' | 'assistant'; content: string }>, assistantId: string, started: number) {
    const response = await fetch('/api/admin/modelos-ia/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelo: model, messages: history, allowCommit }),
    });
    const data = await response.json() as AgentResponse;
    if (!response.ok || !data.ok) throw new Error(data.error || `El agente respondió HTTP ${response.status}.`);

    const usage = data.usage || { input: 0, output: 0, total: 0 };
    setMessages((current) => current.map((item) => item.id === assistantId ? {
      ...item,
      content: data.content || 'Tarea completada.',
      streaming: false,
      tokens: { input: usage.input, output: usage.output },
    } : item));

    for (const item of data.toolTrace || []) {
      addTrace(
        `${item.phase === 'commit' ? 'Ejecutó' : item.phase === 'preview' ? 'Preparó' : 'Consultó'} · ${toolLabel(item.tool)}`,
        item.detail,
        item.ok ? (item.phase === 'commit' ? 'ok' : 'info') : 'error',
      );
    }
    addTrace(
      data.stoppedByLimit ? 'Límite de pasos alcanzado' : 'Agente completado',
      `${Math.round(performance.now() - started)} ms · ${data.steps || 0} paso(s) · ${usage.total} tokens.`,
      data.stoppedByLimit ? 'error' : 'ok',
    );
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || !model || busy) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    const assistantId = crypto.randomUUID();
    const history = [...messages, userMessage].filter((item) => !item.error).map((item) => ({ role: item.role, content: item.content }));
    setMessages((current) => [...current, userMessage, { id: assistantId, role: 'assistant', content: '', streaming: true }]);
    setInput('');
    setBusy(true);
    setError('');
    setNotice('');
    const started = performance.now();
    addTrace(mode === 'agent' ? 'Agente iniciado' : 'Solicitud enviada', `${model} · ${text.length} caracteres${mode === 'agent' && allowCommit ? ' · cambios permitidos' : ''}.`, 'info');

    try {
      if (mode === 'agent') await sendAgent(history, assistantId, started);
      else await sendDirectChat(history, assistantId, started);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo completar la solicitud.';
      setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, streaming: false, error: message } : item));
      setError(message);
      addTrace(mode === 'agent' ? 'Fallo del agente' : 'Fallo de chat', message, 'error');
    } finally {
      setBusy(false);
      if (mode === 'agent') setAllowCommit(false);
    }
  }

  const totalTokens = useMemo(() => messages.reduce((sum, item) => sum + (item.tokens?.input || 0) + (item.tokens?.output || 0), 0), [messages]);
  const configured = Boolean(provider?.configured);
  const ready = configured && Boolean(provider?.models?.length) && Boolean(model);
  const agentReady = ready && Boolean(agentProfile?.enabled);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="IA & análisis · agente interno"
        title="AI Harness"
        description="Usa Ollama Cloud como chat o como agente operativo de Soluciones Fabrick. El agente puede analizar catálogo, visitas y negocio, y ejecutar herramientas gobernadas sin depender de crear una app en ChatGPT."
        icon={Sparkles}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/mcp" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/75 px-4 text-xs font-black text-[#514b42]"><ArrowLeft className="h-4 w-4" /> ChatGPT & MCP</Link>
            <button type="button" onClick={() => { void loadModels(); void loadAgentProfile(); }} disabled={loadingModels || loadingProfile} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white disabled:opacity-50">{loadingModels || loadingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Recargar</button>
          </div>
        }
        meta={
          <>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] ${agentReady ? 'bg-emerald-500/10 text-emerald-800' : configured ? 'bg-amber-500/10 text-amber-800' : 'bg-black/5 text-[#716b60]'}`}>{agentReady ? 'Agente listo' : configured ? 'API guardada' : 'Sin API'}</span>
            <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] text-[#716b60]">{provider?.models?.length || 0} modelos</span>
          </>
        }
      />

      {(error || notice) ? <AdminMotion><div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${error ? 'border-rose-500/20 bg-rose-500/8 text-rose-800' : 'border-emerald-500/20 bg-emerald-500/8 text-emerald-800'}`}>{error || notice}</div></AdminMotion> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Proveedor" value="Ollama" icon={Bot} />
        <AdminStat label="Estado" value={agentReady ? 'Agente listo' : ready ? 'Chat listo' : configured ? 'Parcial' : 'Pendiente'} icon={Activity} accent={agentReady ? 'emerald' : 'yellow'} />
        <AdminStat label="Permisos agente" value={agentProfile?.scopes.length || 0} icon={ShieldCheck} accent="cyan" />
        <AdminStat label="Tokens sesión" value={totalTokens.toLocaleString('es-CL')} icon={MessageSquare} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <div className="grid gap-5">
          <AdminCard glow>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Conexión Ollama Cloud</p><h2 className="mt-1 text-xl font-black tracking-[-.03em] text-[#171612]">API + modelo</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#716b60]">La clave se guarda cifrada por tenant. El agente nunca recibe el secreto como herramienta ni puede leerlo desde el navegador.</p></div>
              <KeyRound className="h-5 w-5 text-[#a56600]" />
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={configured ? 'API configurada · pega una nueva para reemplazarla' : 'Pega OLLAMA_API_KEY'} autoComplete="new-password" className="min-h-12 rounded-xl border border-black/10 bg-white/80 px-4 text-sm font-semibold text-[#171612] outline-none focus:border-[#c77a00]/35 focus:ring-4 focus:ring-[#ffb000]/10" />
              <button type="button" onClick={() => void saveOllama()} disabled={saving || !apiKey.trim()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#171612] px-5 text-xs font-black text-white disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Guardar y conectar</button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <select value={model} onChange={(event) => setModel(event.target.value)} disabled={!provider?.models?.length} className="min-h-11 rounded-xl border border-black/10 bg-white/80 px-3.5 text-sm font-semibold text-[#171612] outline-none disabled:opacity-50">
                {!provider?.models?.length ? <option value="">Sin modelos disponibles</option> : provider.models.map((item) => <option key={item.id} value={item.id}>{item.name || item.id}</option>)}
              </select>
              <div className="flex min-h-11 items-center rounded-xl border border-black/8 bg-white/45 px-3 text-xs font-semibold text-[#716b60]">{model || 'Selecciona un modelo'}</div>
            </div>
          </AdminCard>

          <AdminCard glow>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Permisos del agente</p><h2 className="mt-1 text-xl font-black tracking-[-.03em] text-[#171612]">Capacidades MCP internas</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#716b60]">Estos permisos se validan en el servidor. Desmarcar una capacidad impide que Ollama la ejecute aunque el modelo intente llamarla.</p></div>
              <ShieldCheck className="h-5 w-5 text-[#a56600]" />
            </div>
            {loadingProfile ? <div className="mt-4 flex items-center gap-2 text-sm text-[#8f887c]"><Loader2 className="h-4 w-4 animate-spin" /> Cargando permisos…</div> : agentProfile ? (
              <>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {PERMISSIONS.map((permission) => {
                    const Icon = permission.icon;
                    const checked = agentProfile.scopes.includes(permission.scope);
                    return (
                      <label key={permission.scope} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${checked ? 'border-[#c77a00]/25 bg-[#fff7e7]' : 'border-black/8 bg-white/45'}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleScope(permission.scope)} className="mt-1" />
                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${checked ? 'text-[#a56600]' : 'text-[#aaa397]'}`} />
                        <span><b className="block text-xs text-[#171612]">{permission.title}</b><small className="mt-1 block text-[11px] leading-4 text-[#8f887c]">{permission.detail}</small></span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-end">
                  <label className="flex min-h-11 items-center gap-3 rounded-xl border border-black/8 bg-white/45 px-3 text-xs font-semibold text-[#514b42]"><input type="checkbox" checked={agentProfile.enabled} onChange={(event) => setAgentProfile({ ...agentProfile, enabled: event.target.checked })} /> Agente habilitado</label>
                  <label className="grid gap-1"><span className="text-[9px] font-black uppercase tracking-[.12em] text-[#8f887c]">Máx. pasos</span><select value={agentProfile.maxSteps} onChange={(event) => setAgentProfile({ ...agentProfile, maxSteps: Number(event.target.value) })} className="min-h-11 rounded-xl border border-black/10 bg-white/80 px-3 text-sm font-semibold">{[3,4,5,6,8,10,12].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                  <button type="button" onClick={() => void saveAgentProfile()} disabled={savingProfile} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white disabled:opacity-40">{savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar permisos</button>
                </div>
              </>
            ) : <p className="mt-4 text-sm text-rose-700">No se pudo cargar el perfil del agente.</p>}
          </AdminCard>

          <AdminCard className="p-0 sm:p-0" glow>
            <div className="flex flex-wrap items-center gap-3 border-b border-black/10 px-4 py-3 sm:px-5">
              <div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#9b6a12]">Consola IA</p><p className="mt-0.5 text-sm font-black text-[#171612]">{model || 'Ollama Cloud'}</p></div>
              <div className="ml-auto flex rounded-xl border border-black/10 bg-white/70 p-1">
                <button type="button" onClick={() => { setMode('chat'); setAllowCommit(false); }} className={`min-h-8 rounded-lg px-3 text-[10px] font-black ${mode === 'chat' ? 'bg-[#171612] text-white' : 'text-[#716b60]'}`}>Chat</button>
                <button type="button" onClick={() => setMode('agent')} className={`min-h-8 rounded-lg px-3 text-[10px] font-black ${mode === 'agent' ? 'bg-[#171612] text-white' : 'text-[#716b60]'}`}>Agente</button>
              </div>
              <button type="button" onClick={() => setMessages([])} disabled={!messages.length || busy} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3 text-[10px] font-black uppercase tracking-[.1em] text-[#716b60] disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /> Limpiar</button>
            </div>

            {mode === 'agent' ? <div className="border-b border-black/8 bg-[#fff7e7]/70 px-4 py-3 sm:px-5"><div className="flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-1.5 text-xs font-black text-[#80652a]"><ShieldCheck className="h-4 w-4" /> Modo agente</span><span className="text-xs text-[#8f887c]">Puede consultar herramientas según los permisos guardados.</span><label className={`ml-auto flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black ${allowCommit ? 'border-rose-400/30 bg-rose-50 text-rose-800' : 'border-black/10 bg-white/70 text-[#716b60]'}`}><input type="checkbox" checked={allowCommit} onChange={(event) => setAllowCommit(event.target.checked)} /> Permitir cambios en este mensaje</label></div>{allowCommit ? <p className="mt-2 text-[11px] leading-5 text-rose-700">Autoriza commits solo durante el próximo mensaje. Publicación e inventario siguen sujetos a aprobación humana cuando la política lo exige.</p> : null}</div> : null}

            <div className="min-h-[420px] max-h-[64vh] overflow-y-auto bg-white/20 px-4 py-5 sm:px-5">
              {messages.length === 0 ? (
                <div className="grid min-h-[360px] place-items-center text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#ffb000]/10 text-[#a56600]"><Bot className="h-6 w-6" /></span><h3 className="mt-4 text-lg font-black text-[#171612]">{mode === 'agent' ? 'Dale una tarea a tu agente' : 'Conversa con tu modelo'}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#8f887c]">{mode === 'agent' ? 'Ejemplos: “analiza las visitas de los últimos 7 días”, “revisa productos incompletos”, “busca este SKU y propón mejoras”, o “prepara el cambio de precio de este producto”.' : 'Modo conversación directa con Ollama Cloud, sin herramientas ni cambios en tu aplicación.'}</p></div></div>
              ) : (
                <div className="grid gap-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-[#171612] text-white' : 'border border-black/8 bg-white/80 text-[#3f3a33]'}`}>
                        <p className="whitespace-pre-wrap">{message.content || (message.streaming ? (mode === 'agent' ? 'Analizando y usando herramientas…' : 'Pensando…') : '')}</p>
                        {message.streaming ? <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold opacity-60"><Loader2 className="h-3 w-3 animate-spin" /> {mode === 'agent' ? 'ejecutando' : 'generando'}</span> : null}
                        {message.error ? <p className="mt-2 text-xs font-bold text-rose-700">{message.error}</p> : null}
                        {message.tokens && (message.tokens.input || message.tokens.output) ? <p className="mt-2 text-[10px] font-bold opacity-50">{message.tokens.input} entrada · {message.tokens.output} salida</p> : null}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-black/10 p-3 sm:p-4">
              <div className="flex items-end gap-2 rounded-2xl border border-black/10 bg-white/80 p-2 focus-within:border-[#c77a00]/30 focus-within:ring-4 focus-within:ring-[#ffb000]/8">
                <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void sendMessage(); } }} rows={2} placeholder={ready ? (mode === 'agent' ? 'Pide un análisis o una tarea…  Ctrl/⌘ + Enter' : 'Escribe una pregunta…  Ctrl/⌘ + Enter') : 'Configura Ollama y selecciona un modelo'} disabled={!ready || busy || (mode === 'agent' && !agentProfile?.enabled)} className="min-h-[48px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[#171612] outline-none placeholder:text-[#aaa397] disabled:opacity-50" />
                <button type="button" onClick={() => void sendMessage()} disabled={!ready || busy || !input.trim() || (mode === 'agent' && !agentProfile?.enabled)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#171612] text-white disabled:opacity-30">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
              </div>
            </div>
          </AdminCard>
        </div>

        <AdminCard className="self-start xl:sticky xl:top-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">Activity trace</p><h2 className="mt-1 text-lg font-black text-[#171612]">Qué está haciendo la IA</h2><p className="mt-1 text-xs leading-5 text-[#8f887c]">Muestra consultas, previews, commits y errores. Nunca contiene la API key.</p></div><Activity className="h-5 w-5 text-[#a56600]" /></div>
          <div className="mt-4 grid gap-2">
            {trace.length === 0 ? <p className="rounded-xl border border-dashed border-black/10 px-3 py-5 text-xs text-[#8f887c]">Sin actividad todavía.</p> : trace.map((item) => (
              <div key={item.id} className="rounded-xl border border-black/8 bg-white/45 px-3 py-3">
                <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${item.tone === 'ok' ? 'bg-emerald-500' : item.tone === 'error' ? 'bg-rose-500' : 'bg-[#F5871F]'}`} /><p className="text-xs font-black text-[#171612]">{item.label}</p><span className="ml-auto text-[9px] font-bold text-[#aaa397]">{item.at}</span></div>
                <p className="mt-1 text-[11px] leading-5 text-[#8f887c]">{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-[#c77a00]/12 bg-[#fff7e7] p-3 text-xs leading-5 text-[#80652a]">El modo Agente usa las mismas reglas de gobernanza del MCP. Si una acción necesita aprobación, revísala en <Link href="/admin/mcp/gobernanza" className="font-black underline decoration-[#c77a00]/30 underline-offset-2">Gobernanza MCP</Link>. No necesitas crear una app de ChatGPT para usar este agente interno.</div>
        </AdminCard>
      </div>
    </AdminPage>
  );
}

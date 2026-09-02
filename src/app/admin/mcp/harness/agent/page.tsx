'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Brain,
  Clock3,
  Download,
  KeyRound,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

type ModelEntry = { id: string; name: string; description?: string };
type ProviderResult = { id: string; label: string; configured: boolean; error?: string; models: ModelEntry[] };
type Connection = { keyId: string; tokenPrefix: string; scopes: string[]; label: string };
type Trace = { at: string; type: 'model' | 'tool_call' | 'tool_result' | 'approval' | 'memory' | 'error'; name?: string; detail: string };
type AgentResult = { ok: boolean; conversationId: string; provider: string; model: string; response: string; trace: Trace[]; toolCalls: number; approvals: Array<{ id: string; tool: string; status: string; expiresAt?: string | null }>; memoriesUsed: number };
type Conversation = { id: string; key_id: string; title: string; provider: string; model: string; status: string; summary?: string | null; last_message_at?: string | null; updated_at: string };
type ChatMessage = { id: string; role: 'system' | 'user' | 'assistant' | 'tool'; provider?: string | null; model?: string | null; content: string; tool_name?: string | null; created_at: string };
type Memory = { id: string; conversation_id?: string | null; scope: string; kind: string; memory_key?: string | null; content: string; tags?: string[]; importance: number; pinned: boolean; updated_at: string };
type Task = { id: string; label: string; prompt: string; provider: string; model: string; key_id: string; schedule_kind: 'manual' | 'daily' | 'weekly'; weekday: number | null; allow_writes: boolean; memory_enabled?: boolean; conversation_id?: string | null; enabled: boolean; status: string; last_run_at: string | null; last_result?: { response?: string } | null; last_error: string | null };

const REQUIRED_SCOPES = ['analytics:read', 'site:read', 'automation:run'];
const scopeOptions = [
  ['products:read', 'Leer catálogo'],
  ['products:write', 'Crear/editar productos'],
  ['products:publish', 'Publicar/despublicar'],
  ['inventory:write', 'Mover inventario'],
  ['analytics:read', 'Analizar visitas y conversión'],
  ['site:read', 'Auditar sitio público'],
  ['automation:run', 'Agente, memoria y automatizaciones'],
] as const;
const quickPrompts = [
  'Analiza las visitas y conversión de los últimos 30 días. Dime los problemas más importantes y qué harías primero.',
  'Audita la página principal y /tienda. Revisa SEO, CTA, imágenes y claridad de compra.',
  'Supervisa el catálogo. Identifica fichas incompletas, productos inactivos y stock crítico.',
  'Recuerda las decisiones importantes que hemos tomado sobre el catálogo y dime qué queda pendiente.',
];
const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function FabrickAgentPage() {
  const [providers, setProviders] = useState<ProviderResult[]>([]);
  const [providerId, setProviderId] = useState('ollama');
  const [model, setModel] = useState('');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [keyId, setKeyId] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [prompt, setPrompt] = useState('');
  const [allowWrites, setAllowWrites] = useState(false);
  const [trace, setTrace] = useState<Trace[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [newScopes, setNewScopes] = useState<string[]>(['products:read', ...REQUIRED_SCOPES]);
  const [taskLabel, setTaskLabel] = useState('');
  const [taskPrompt, setTaskPrompt] = useState('');
  const [taskSchedule, setTaskSchedule] = useState<'manual' | 'daily' | 'weekly'>('daily');
  const [taskWeekday, setTaskWeekday] = useState(1);
  const [taskWrites, setTaskWrites] = useState(false);
  const [taskMemory, setTaskMemory] = useState(true);
  const [savingTask, setSavingTask] = useState(false);

  const currentProvider = useMemo(() => providers.find((item) => item.id === providerId) || null, [providers, providerId]);
  const selectedConnection = useMemo(() => connections.find((item) => item.keyId === keyId) || null, [connections, keyId]);
  const canWrite = Boolean(selectedConnection?.scopes.includes('products:write'));
  const missingRequired = REQUIRED_SCOPES.filter((scope) => !selectedConnection?.scopes.includes(scope));
  const ready = Boolean(currentProvider?.configured && model && selectedConnection && missingRequired.length === 0);

  const loadBase = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [modelsResponse, accessResponse, tasksResponse, conversationsResponse, memoryResponse] = await Promise.all([
        fetch('/api/admin/modelos-ia/list', { cache: 'no-store' }),
        fetch('/api/admin/mcp/access', { cache: 'no-store' }),
        fetch('/api/admin/mcp/harness/tasks', { cache: 'no-store' }),
        fetch('/api/admin/mcp/harness/conversations', { cache: 'no-store' }),
        fetch('/api/admin/mcp/harness/memory', { cache: 'no-store' }),
      ]);
      const modelsData = await modelsResponse.json() as { providers?: ProviderResult[]; error?: string };
      const accessData = await accessResponse.json() as { connections?: Connection[]; error?: string };
      const tasksData = await tasksResponse.json() as { tasks?: Task[]; error?: string };
      const conversationsData = await conversationsResponse.json() as { conversations?: Conversation[]; error?: string };
      const memoryData = await memoryResponse.json() as { memories?: Memory[]; error?: string };
      if (!modelsResponse.ok) throw new Error(modelsData.error || 'No se pudieron cargar modelos.');
      if (!accessResponse.ok) throw new Error(accessData.error || 'No se pudieron cargar permisos.');
      setProviders(modelsData.providers || []);
      const configured = (modelsData.providers || []).filter((item) => item.configured && item.models.length);
      setProviderId((current) => configured.some((item) => item.id === current) ? current : configured[0]?.id || current);
      setConnections(accessData.connections || []);
      setTasks(tasksData.tasks || []);
      setConversations(conversationsData.conversations || []);
      setMemories(memoryData.memories || []);
      const nextConnections = accessData.connections || [];
      if (nextConnections.length) setKeyId((current) => current && nextConnections.some((item) => item.keyId === current) ? current : nextConnections.find((item) => /agent/i.test(item.label))?.keyId || nextConnections[0].keyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar Fabrick Agent.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadBase(); }, [loadBase]);
  useEffect(() => {
    const p = providers.find((item) => item.id === providerId);
    if (!p) return;
    setModel((current) => p.models.some((item) => item.id === current) ? current : p.models[0]?.id || '');
  }, [providerId, providers]);

  async function openConversation(id: string) {
    setError('');
    try {
      const response = await fetch(`/api/admin/mcp/harness/conversations?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await response.json() as { conversation?: Conversation; messages?: ChatMessage[]; error?: string };
      if (!response.ok || !data.conversation) throw new Error(data.error || 'No se pudo abrir la conversación.');
      setConversationId(id);
      setMessages((data.messages || []).filter((item) => item.role === 'user' || item.role === 'assistant'));
      setProviderId(data.conversation.provider || providerId);
      setModel(data.conversation.model || model);
      setKeyId(data.conversation.key_id || keyId);
      setTrace([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir la conversación.');
    }
  }

  function newConversation() {
    setConversationId('');
    setMessages([]);
    setTrace([]);
    setPrompt('');
    setNotice('Nueva conversación preparada. Se creará al enviar el primer mensaje.');
  }

  async function runAgent(text?: string) {
    const finalPrompt = (text || prompt).trim();
    if (!finalPrompt || !model || !keyId || running || !ready) return;
    const optimistic: ChatMessage = { id: `local-${Date.now()}`, role: 'user', provider: providerId, model, content: finalPrompt, created_at: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]);
    setPrompt('');
    setRunning(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/mcp/harness/agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId, model, keyId, prompt: finalPrompt, allowWrites, conversationId: conversationId || null }),
      });
      const data = await response.json() as AgentResult & { error?: string };
      if (!response.ok) throw new Error(data.error || 'El agente no pudo completar la tarea.');
      setConversationId(data.conversationId);
      setTrace(data.trace || []);
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', provider: data.provider, model: data.model, content: data.response, created_at: new Date().toISOString() }]);
      if (data.approvals?.length) setNotice(`${data.approvals.length} acción(es) quedaron pendientes de aprobación en Gobernanza.`);
      await loadBase();
    } catch (err) {
      setMessages((current) => current.filter((item) => item.id !== optimistic.id));
      setError(err instanceof Error ? err.message : 'El agente no pudo completar la tarea.');
    } finally {
      setRunning(false);
    }
  }

  async function createAgentProfile() {
    setError('');
    try {
      const scopes = [...new Set([...newScopes, ...REQUIRED_SCOPES])];
      const response = await fetch('/api/admin/mcp/access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: 'Fabrick Agent', scopes }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo crear el perfil.');
      setNotice('Perfil Fabrick Agent creado. Este perfil sirve para cualquier motor IA y no necesita compartir el token.');
      await loadBase();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo crear el perfil.'); }
  }

  async function deleteMemory(id: string) {
    const response = await fetch(`/api/admin/mcp/harness/memory?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (response.ok) setMemories((current) => current.filter((item) => item.id !== id));
  }

  async function createTask() {
    if (!taskLabel.trim() || !taskPrompt.trim() || !model || !keyId) return;
    setSavingTask(true);
    setError('');
    try {
      const response = await fetch('/api/admin/mcp/harness/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', label: taskLabel, prompt: taskPrompt, provider: providerId, model, keyId, scheduleKind: taskSchedule, weekday: taskSchedule === 'weekly' ? taskWeekday : null, allowWrites: taskWrites, memoryEnabled: taskMemory }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo crear la automatización.');
      setTaskLabel(''); setTaskPrompt(''); setNotice('Automatización guardada con el motor y perfil MCP seleccionados.'); await loadBase();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo crear la automatización.'); }
    finally { setSavingTask(false); }
  }

  async function taskAction(task: Task, action: 'run' | 'toggle') {
    setError('');
    const response = await fetch('/api/admin/mcp/harness/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'run' ? { action: 'run', taskId: task.id } : { action: 'update', taskId: task.id, enabled: !task.enabled }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) setError(data.error || 'No se pudo completar la acción.'); else { setNotice(action === 'run' ? 'Automatización ejecutada.' : 'Estado actualizado.'); await loadBase(); }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="IA & análisis · agente persistente"
        title="Fabrick Agent"
        description="Un mismo agente, memoria y permisos gobernados; cambia entre Ollama, Gemini, Grok, OpenRouter, Claude u otros motores sin perder el historial."
        icon={Bot}
        actions={<div className="flex flex-wrap gap-2"><Link href="/admin/modelos-ia" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/75 px-4 text-xs font-black text-[#514b42]"><Sparkles className="h-4 w-4" /> Configurar motores</Link><button type="button" onClick={() => void loadBase()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Actualizar</button></div>}
        meta={<><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] ${ready ? 'bg-emerald-500/10 text-emerald-800' : 'bg-amber-500/10 text-amber-800'}`}>{ready ? 'Agente listo' : 'Configuración pendiente'}</span><span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] text-[#716b60]">Memoria Fabrick</span></>}
      />

      {(error || notice) ? <AdminMotion><div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${error ? 'border-rose-500/20 bg-rose-500/8 text-rose-800' : 'border-emerald-500/20 bg-emerald-500/8 text-emerald-800'}`}>{error || notice}</div></AdminMotion> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Motor" value={currentProvider?.label || providerId} icon={Bot} />
        <AdminStat label="Conversaciones" value={conversations.length} icon={MessageSquare} accent="cyan" />
        <AdminStat label="Memorias" value={memories.length} icon={Brain} accent="emerald" />
        <AdminStat label="Automatizaciones" value={tasks.filter((item) => item.enabled && item.schedule_kind !== 'manual').length} icon={Clock3} />
      </section>

      <AdminCard glow>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Motor + gobernanza</p><h2 className="mt-1 text-xl font-black tracking-[-.03em] text-[#171612]">El proveedor razona; Fabrick controla</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#716b60]">Los permisos, memoria, herramientas, aprobaciones y auditoría no pertenecen a Ollama ni a GPT. Cambiar de motor no amplía permisos.</p></div><ShieldCheck className="h-5 w-5 text-[#a56600]" /></div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="grid gap-1.5"><span className="text-[10px] font-black uppercase tracking-[.12em] text-[#716b60]">Motor IA</span><select value={providerId} onChange={(e) => setProviderId(e.target.value)} className="min-h-11 rounded-xl border border-black/10 bg-white/80 px-3.5 text-sm font-semibold text-[#171612]">{providers.map((item) => <option key={item.id} value={item.id} disabled={!item.configured}>{item.label}{item.configured ? '' : ' · sin API'}</option>)}</select></label>
          <label className="grid gap-1.5"><span className="text-[10px] font-black uppercase tracking-[.12em] text-[#716b60]">Modelo</span><select value={model} onChange={(e) => setModel(e.target.value)} className="min-h-11 rounded-xl border border-black/10 bg-white/80 px-3.5 text-sm font-semibold text-[#171612]">{currentProvider?.models?.length ? currentProvider.models.map((item) => <option key={item.id} value={item.id}>{item.name || item.id}</option>) : <option value="">Sin modelos</option>}</select></label>
          <label className="grid gap-1.5"><span className="text-[10px] font-black uppercase tracking-[.12em] text-[#716b60]">Perfil MCP</span><select value={keyId} onChange={(e) => setKeyId(e.target.value)} className="min-h-11 rounded-xl border border-black/10 bg-white/80 px-3.5 text-sm font-semibold text-[#171612]">{connections.length ? connections.map((item) => <option key={item.keyId} value={item.keyId}>{item.label} · {item.scopes.length} scopes</option>) : <option value="">Sin perfil</option>}</select></label>
        </div>
        {selectedConnection ? <div className="mt-3 flex flex-wrap gap-1.5">{selectedConnection.scopes.map((scope) => <span key={scope} className="rounded-full border border-black/8 bg-white/70 px-2.5 py-1 text-[10px] font-black text-[#716b60]">{scope}</span>)}</div> : null}
        {missingRequired.length ? <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/8 p-3 text-xs font-semibold text-amber-900">Este perfil no puede actuar como agente todavía. Faltan: {missingRequired.join(', ')}.</div> : null}
        <label className="mt-4 flex items-start gap-3 rounded-xl border border-black/10 bg-white/55 p-3"><input type="checkbox" checked={allowWrites} onChange={(e) => setAllowWrites(e.target.checked)} disabled={!canWrite} className="mt-1" /><span><b className="block text-sm text-[#171612]">Permitir ejecución de cambios</b><small className="mt-1 block leading-5 text-[#716b60]">Sin marcar, analiza y prepara previews. Con ejecución habilitada, solo puede usar scopes otorgados; publicar e inventario siguen sujetos a Gobernanza.</small></span></label>
      </AdminCard>

      <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <AdminCard className="p-0 sm:p-0">
          <div className="flex items-center justify-between border-b border-black/10 p-4"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#9b6a12]">Historial</p><p className="mt-1 text-sm font-black text-[#171612]">Conversaciones</p></div><button onClick={newConversation} className="grid h-9 w-9 place-items-center rounded-xl bg-[#171612] text-white" title="Nueva conversación"><Plus className="h-4 w-4" /></button></div>
          <div className="max-h-[650px] space-y-2 overflow-y-auto p-3">{conversations.length ? conversations.map((item) => <button key={item.id} onClick={() => void openConversation(item.id)} className={`w-full rounded-xl border p-3 text-left transition ${conversationId === item.id ? 'border-[#d39531]/35 bg-[#fff6e7]' : 'border-black/8 bg-white/55 hover:bg-white'}`}><p className="line-clamp-2 text-xs font-black text-[#171612]">{item.title}</p><p className="mt-1 text-[10px] font-semibold text-[#8a8378]">{item.provider} · {item.model}</p></button>) : <p className="p-3 text-xs leading-5 text-[#8a8378]">Aún no hay conversaciones persistentes.</p>}</div>
        </AdminCard>

        <AdminCard className="p-0 sm:p-0" glow>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 px-4 py-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#9b6a12]">Chat operativo</p><p className="mt-0.5 text-sm font-black text-[#171612]">{currentProvider?.label || 'Fabrick Agent'} · {model || 'sin modelo'}</p></div>{conversationId ? <a href={`/api/admin/mcp/harness/conversations/markdown?id=${encodeURIComponent(conversationId)}`} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3 text-[10px] font-black uppercase tracking-[.1em] text-[#716b60]"><Download className="h-3.5 w-3.5" /> Markdown</a> : null}</div>
          <div className="min-h-[430px] max-h-[62vh] overflow-y-auto px-4 py-5 sm:px-5">{messages.length ? <div className="space-y-4">{messages.map((message) => <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-[#171612] text-white' : 'border border-black/8 bg-white/75 text-[#37332d]'}`}><p className="whitespace-pre-wrap">{message.content}</p>{message.provider || message.model ? <p className={`mt-2 text-[9px] font-bold uppercase tracking-[.1em] ${message.role === 'user' ? 'text-white/50' : 'text-[#9b9489]'}`}>{[message.provider, message.model].filter(Boolean).join(' · ')}</p> : null}</div></div>)}</div> : <div className="grid min-h-[390px] place-items-center text-center"><div><Bot className="mx-auto h-9 w-9 text-[#c77a00]" /><h3 className="mt-3 text-lg font-black text-[#171612]">Habla con Fabrick Agent</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#716b60]">El historial queda en tu base de datos. Puedes cambiar el motor después y continuar desde el mismo hilo.</p><div className="mt-4 flex flex-wrap justify-center gap-2">{quickPrompts.map((item) => <button key={item} onClick={() => void runAgent(item)} disabled={!ready || running} className="max-w-[260px] rounded-xl border border-black/8 bg-white/70 px-3 py-2 text-left text-[11px] font-semibold text-[#615b52] disabled:opacity-40">{item}</button>)}</div></div></div>}</div>
          <div className="border-t border-black/10 bg-white/45 p-4"><div className="flex gap-2"><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void runAgent(); } }} rows={2} placeholder="Analiza, recuerda, revisa o ejecuta una tarea…" className="min-h-14 flex-1 resize-none rounded-xl border border-black/10 bg-white/90 px-3.5 py-3 text-sm outline-none focus:border-[#c77a00]/35 focus:ring-4 focus:ring-[#ffb000]/10" /><button onClick={() => void runAgent()} disabled={!ready || !prompt.trim() || running} className="grid w-14 place-items-center rounded-xl bg-[#171612] text-white disabled:opacity-35">{running ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</button></div></div>
        </AdminCard>

        <div className="grid gap-5 content-start">
          <AdminCard><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#9b6a12]">Memoria propia</p><h3 className="mt-1 text-lg font-black text-[#171612]">Lo que Fabrick recuerda</h3></div><Brain className="h-5 w-5 text-[#a56600]" /></div><p className="mt-2 text-xs leading-5 text-[#716b60]">Decisiones, preferencias, instrucciones y hallazgos quedan fuera del proveedor IA. Nunca guarda tokens ni API keys.</p><div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto">{memories.length ? memories.slice(0, 30).map((memory) => <div key={memory.id} className="rounded-xl border border-black/8 bg-white/60 p-3"><div className="flex items-start justify-between gap-2"><div><span className="text-[9px] font-black uppercase tracking-[.1em] text-[#9b6a12]">{memory.kind} · {memory.scope}</span><p className="mt-1 text-xs font-semibold leading-5 text-[#514b42]">{memory.memory_key ? <b>{memory.memory_key}: </b> : null}{memory.content}</p></div><button onClick={() => void deleteMemory(memory.id)} className="text-[#aaa298] hover:text-rose-600" title="Eliminar memoria"><Trash2 className="h-3.5 w-3.5" /></button></div></div>) : <p className="rounded-xl border border-dashed border-black/10 p-3 text-xs text-[#8a8378]">El agente irá guardando únicamente memoria útil cuando corresponda.</p>}</div></AdminCard>
          <AdminCard><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#9b6a12]">Trazabilidad</p><h3 className="mt-1 text-lg font-black text-[#171612]">Última ejecución</h3></div><div className="mt-3 max-h-[300px] space-y-2 overflow-y-auto">{trace.length ? trace.slice().reverse().map((item, index) => <div key={`${item.at}-${index}`} className="rounded-xl border border-black/8 bg-white/55 p-2.5"><p className="text-[9px] font-black uppercase tracking-[.1em] text-[#8a8378]">{item.type}{item.name ? ` · ${item.name}` : ''}</p><p className="mt-1 line-clamp-4 text-[11px] leading-5 text-[#615b52]">{item.detail}</p></div>) : <p className="text-xs text-[#8a8378]">Aquí verás modelo, memoria, herramientas y aprobaciones.</p>}</div></AdminCard>
        </div>
      </div>

      {!connections.some((item) => /agent/i.test(item.label) && REQUIRED_SCOPES.every((scope) => item.scopes.includes(scope))) ? <AdminCard glow><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#9b6a12]">Primer uso</p><h2 className="mt-1 text-xl font-black text-[#171612]">Crear perfil Fabrick Agent</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#716b60]">El perfil es independiente del proveedor y define qué podrá hacer cualquier motor que conectes.</p></div><button onClick={() => void createAgentProfile()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white"><KeyRound className="h-4 w-4" /> Crear perfil</button></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{scopeOptions.map(([id, label]) => <label key={id} className="flex items-start gap-2 rounded-xl border border-black/8 bg-white/55 p-3"><input type="checkbox" checked={newScopes.includes(id) || REQUIRED_SCOPES.includes(id)} disabled={REQUIRED_SCOPES.includes(id)} onChange={(e) => setNewScopes((current) => e.target.checked ? [...new Set([...current, id])] : current.filter((item) => item !== id))} className="mt-0.5" /><span className="text-xs font-semibold text-[#615b52]">{label}</span></label>)}</div></AdminCard> : null}

      <AdminCard glow><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#9b6a12]">Automatizar</p><h2 className="mt-1 text-xl font-black text-[#171612]">Tareas persistentes</h2><p className="mt-2 text-sm leading-6 text-[#716b60]">Una tarea puede usar cualquier motor configurado y mantener su propia conversación entre ejecuciones.</p></div><Clock3 className="h-5 w-5 text-[#a56600]" /></div><div className="mt-4 grid gap-3 lg:grid-cols-2"><input value={taskLabel} onChange={(e) => setTaskLabel(e.target.value)} placeholder="Nombre de la tarea" className="min-h-11 rounded-xl border border-black/10 bg-white/80 px-3.5 text-sm" /><select value={taskSchedule} onChange={(e) => setTaskSchedule(e.target.value as typeof taskSchedule)} className="min-h-11 rounded-xl border border-black/10 bg-white/80 px-3.5 text-sm font-semibold"><option value="manual">Manual</option><option value="daily">Diaria</option><option value="weekly">Semanal</option></select>{taskSchedule === 'weekly' ? <select value={taskWeekday} onChange={(e) => setTaskWeekday(Number(e.target.value))} className="min-h-11 rounded-xl border border-black/10 bg-white/80 px-3.5 text-sm font-semibold">{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select> : null}<textarea value={taskPrompt} onChange={(e) => setTaskPrompt(e.target.value)} placeholder="Qué debe analizar o hacer" rows={3} className="rounded-xl border border-black/10 bg-white/80 px-3.5 py-3 text-sm lg:col-span-2" /></div><div className="mt-3 flex flex-wrap items-center gap-4"><label className="flex items-center gap-2 text-xs font-semibold text-[#615b52]"><input type="checkbox" checked={taskMemory} onChange={(e) => setTaskMemory(e.target.checked)} /> Mantener memoria entre ejecuciones</label><label className="flex items-center gap-2 text-xs font-semibold text-[#615b52]"><input type="checkbox" checked={taskWrites} disabled={!canWrite} onChange={(e) => setTaskWrites(e.target.checked)} /> Permitir cambios</label><button onClick={() => void createTask()} disabled={savingTask || !taskLabel.trim() || !taskPrompt.trim() || !ready} className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white disabled:opacity-40">{savingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Guardar tarea</button></div>{tasks.length ? <div className="mt-4 grid gap-2 md:grid-cols-2">{tasks.map((task) => <div key={task.id} className="rounded-xl border border-black/8 bg-white/55 p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-black text-[#171612]">{task.label}</p><p className="mt-1 text-[10px] font-semibold text-[#8a8378]">{task.provider} · {task.model} · {task.schedule_kind}{task.memory_enabled ? ' · memoria' : ''}</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${task.enabled ? 'bg-emerald-500/10 text-emerald-800' : 'bg-black/5 text-[#817a70]'}`}>{task.status}</span></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-[#615b52]">{task.prompt}</p><div className="mt-3 flex gap-2"><button onClick={() => void taskAction(task, 'run')} className="rounded-lg bg-[#171612] px-3 py-2 text-[10px] font-black text-white">Ejecutar</button><button onClick={() => void taskAction(task, 'toggle')} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[10px] font-black text-[#615b52]">{task.enabled ? 'Pausar' : 'Activar'}</button></div></div>)}</div> : null}</AdminCard>

      <AdminCard><div className="flex items-start gap-3"><Wrench className="mt-0.5 h-5 w-5 text-[#a56600]" /><div><h3 className="text-sm font-black text-[#171612]">Claude Code y otros runners</h3><p className="mt-1 text-xs leading-5 text-[#716b60]">Claude mediante API Anthropic funciona directamente aquí con las mismas herramientas. Claude Code como CLI necesita un runner externo persistente; puede conectarse después mediante el proveedor Custom/OpenAI-compatible o un bridge dedicado, sin mover la memoria fuera de Fabrick.</p></div></div></AdminCard>
    </AdminPage>
  );
}

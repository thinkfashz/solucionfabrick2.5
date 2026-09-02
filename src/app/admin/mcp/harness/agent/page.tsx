'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock3,
  KeyRound,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

type ModelEntry = { id: string; name: string; description?: string };
type ProviderResult = { id: string; label: string; configured: boolean; error?: string; models: ModelEntry[] };
type Connection = { keyId: string; tokenPrefix: string; scopes: string[]; label: string };
type Trace = { at: string; type: 'model' | 'tool_call' | 'tool_result' | 'approval' | 'error'; name?: string; detail: string };
type AgentResult = { ok: boolean; response: string; trace: Trace[]; toolCalls: number; approvals: Array<{ id: string; tool: string; status: string; expiresAt?: string | null }> };
type Task = {
  id: string;
  label: string;
  prompt: string;
  model: string;
  key_id: string;
  schedule_kind: 'manual' | 'daily' | 'weekly';
  weekday: number | null;
  allow_writes: boolean;
  enabled: boolean;
  status: string;
  last_run_at: string | null;
  last_result: { response?: string; toolCalls?: number; approvals?: unknown[] } | null;
  last_error: string | null;
};

const scopeOptions = [
  ['products:read', 'Leer catálogo y analítica'],
  ['products:write', 'Crear/editar productos'],
  ['products:publish', 'Publicar/despublicar'],
  ['inventory:write', 'Mover inventario'],
] as const;

const quickPrompts = [
  'Analiza las visitas y conversión de los últimos 30 días. Dime los 5 problemas más importantes y qué harías primero.',
  'Audita la página principal y /tienda. Revisa SEO, estructura, CTA, imágenes y claridad de compra. Dame mejoras priorizadas.',
  'Supervisa todo el catálogo. Identifica fichas incompletas, productos inactivos, sin imagen, sin SKU y stock crítico.',
  'Busca los productos con peor ficha comercial y prepara mejoras de título, descripción y precio sin publicar cambios todavía.',
];

const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function OllamaOperationalAgentPage() {
  const [provider, setProvider] = useState<ProviderResult | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [model, setModel] = useState('');
  const [keyId, setKeyId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [allowWrites, setAllowWrites] = useState(false);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [newScopes, setNewScopes] = useState<string[]>(['products:read', 'products:write']);
  const [taskLabel, setTaskLabel] = useState('');
  const [taskPrompt, setTaskPrompt] = useState('');
  const [taskSchedule, setTaskSchedule] = useState<'manual' | 'daily' | 'weekly'>('daily');
  const [taskWeekday, setTaskWeekday] = useState(1);
  const [taskWrites, setTaskWrites] = useState(false);
  const [savingTask, setSavingTask] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [modelsResponse, accessResponse, tasksResponse] = await Promise.all([
        fetch('/api/admin/modelos-ia/list', { cache: 'no-store' }),
        fetch('/api/admin/mcp/access', { cache: 'no-store' }),
        fetch('/api/admin/mcp/harness/tasks', { cache: 'no-store' }),
      ]);
      const modelsData = await modelsResponse.json() as { providers?: ProviderResult[]; error?: string };
      const accessData = await accessResponse.json() as { connections?: Connection[]; error?: string };
      const tasksData = await tasksResponse.json() as { tasks?: Task[]; error?: string };
      if (!modelsResponse.ok) throw new Error(modelsData.error || 'No se pudieron cargar modelos.');
      if (!accessResponse.ok) throw new Error(accessData.error || 'No se pudieron cargar permisos MCP.');
      if (!tasksResponse.ok) throw new Error(tasksData.error || 'No se pudieron cargar tareas.');
      const ollama = (modelsData.providers || []).find((item) => item.id === 'ollama') || null;
      const nextConnections = accessData.connections || [];
      setProvider(ollama);
      setConnections(nextConnections);
      setTasks(tasksData.tasks || []);
      if (ollama?.models?.length) setModel((current) => current && ollama.models.some((item) => item.id === current) ? current : ollama.models[0].id);
      if (nextConnections.length) setKeyId((current) => current && nextConnections.some((item) => item.keyId === current) ? current : nextConnections.find((item) => /ollama/i.test(item.label))?.keyId || nextConnections[0].keyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el agente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selectedConnection = useMemo(() => connections.find((item) => item.keyId === keyId) || null, [connections, keyId]);
  const canWrite = Boolean(selectedConnection?.scopes.includes('products:write'));
  const ready = Boolean(provider?.configured && model && selectedConnection);

  async function createAgentProfile() {
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/mcp/access', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Ollama Agent', scopes: newScopes }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo crear el perfil.');
      setNotice('Perfil Ollama Agent creado. El agente usará ese perfil internamente; no necesitas copiar su token.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el perfil.');
    }
  }

  async function runAgent(text?: string) {
    const finalPrompt = (text || prompt).trim();
    if (!finalPrompt || !model || !keyId || running) return;
    setRunning(true);
    setError('');
    setNotice('');
    setResult(null);
    try {
      const response = await fetch('/api/admin/mcp/harness/agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, keyId, prompt: finalPrompt, allowWrites }),
      });
      const data = await response.json() as AgentResult & { error?: string };
      if (!response.ok) throw new Error(data.error || 'El agente no pudo completar la tarea.');
      setResult(data);
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'El agente no pudo completar la tarea.');
    } finally {
      setRunning(false);
    }
  }

  async function createTask() {
    if (!taskLabel.trim() || !taskPrompt.trim() || !model || !keyId) return;
    setSavingTask(true);
    setError('');
    try {
      const response = await fetch('/api/admin/mcp/harness/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', label: taskLabel, prompt: taskPrompt, model, keyId, scheduleKind: taskSchedule, weekday: taskSchedule === 'weekly' ? taskWeekday : null, allowWrites: taskWrites }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo crear la tarea.');
      setTaskLabel('');
      setTaskPrompt('');
      setNotice('Tarea guardada. Las tareas diarias/semanales se ejecutan dentro del orquestador Fabrick Daily.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la tarea.');
    } finally {
      setSavingTask(false);
    }
  }

  async function taskAction(task: Task, action: 'run' | 'toggle') {
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/mcp/harness/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'run' ? { action: 'run', taskId: task.id } : { action: 'update', taskId: task.id, enabled: !task.enabled }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'No se pudo ejecutar la acción.');
      setNotice(action === 'run' ? 'Tarea ejecutada.' : task.enabled ? 'Tarea pausada.' : 'Tarea reactivada.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ejecutar la acción.');
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="IA & análisis · agente operativo"
        title="Ollama Agent"
        description="Analiza la aplicación y ejecuta herramientas gobernadas con los mismos scopes, aprobaciones, auditoría y límites del MCP. No depende de ChatGPT Apps."
        icon={Bot}
        actions={<div className="flex flex-wrap gap-2"><Link href="/admin/mcp/harness" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/75 px-4 text-xs font-black text-[#514b42]"><Sparkles className="h-4 w-4" /> Chat simple</Link><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Actualizar</button></div>}
        meta={<><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] ${ready ? 'bg-emerald-500/10 text-emerald-800' : 'bg-amber-500/10 text-amber-800'}`}>{ready ? 'Agente listo' : 'Configuración pendiente'}</span><span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] text-[#716b60]">MCP gobernado</span></>}
      />

      {(error || notice) ? <AdminMotion><div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${error ? 'border-rose-500/20 bg-rose-500/8 text-rose-800' : 'border-emerald-500/20 bg-emerald-500/8 text-emerald-800'}`}>{error || notice}</div></AdminMotion> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Proveedor" value="Ollama" icon={Bot} />
        <AdminStat label="Perfil" value={selectedConnection?.label || 'Sin perfil'} icon={KeyRound} accent={selectedConnection ? 'emerald' : 'yellow'} />
        <AdminStat label="Herramientas" value="10" icon={Wrench} accent="cyan" />
        <AdminStat label="Automatizaciones" value={tasks.filter((item) => item.enabled && item.schedule_kind !== 'manual').length} icon={Clock3} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
        <div className="grid gap-5">
          <AdminCard glow>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Control del agente</p><h2 className="mt-1 text-xl font-black tracking-[-.03em] text-[#171612]">Modelo + permisos MCP</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#716b60]">El modelo decide qué herramienta necesita, pero el backend valida scopes y aprobación antes de ejecutar cualquier acción.</p></div><ShieldCheck className="h-5 w-5 text-[#a56600]" /></div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5"><span className="text-[10px] font-black uppercase tracking-[.12em] text-[#716b60]">Modelo Ollama</span><select value={model} onChange={(event) => setModel(event.target.value)} className="min-h-11 rounded-xl border border-black/10 bg-white/80 px-3.5 text-sm font-semibold text-[#171612]">{provider?.models?.length ? provider.models.map((item) => <option key={item.id} value={item.id}>{item.name || item.id}</option>) : <option value="">Sin modelos</option>}</select></label>
              <label className="grid gap-1.5"><span className="text-[10px] font-black uppercase tracking-[.12em] text-[#716b60]">Perfil de permisos</span><select value={keyId} onChange={(event) => setKeyId(event.target.value)} className="min-h-11 rounded-xl border border-black/10 bg-white/80 px-3.5 text-sm font-semibold text-[#171612]">{connections.length ? connections.map((item) => <option key={item.keyId} value={item.keyId}>{item.label} · {item.scopes.length} scopes</option>) : <option value="">Sin perfil MCP</option>}</select></label>
            </div>
            {selectedConnection ? <div className="mt-3 flex flex-wrap gap-1.5">{selectedConnection.scopes.map((scope) => <span key={scope} className="rounded-full border border-black/8 bg-white/70 px-2.5 py-1 text-[10px] font-black text-[#716b60]">{scope}</span>)}</div> : null}
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-black/10 bg-white/55 p-3"><input type="checkbox" checked={allowWrites} onChange={(event) => setAllowWrites(event.target.checked)} disabled={!canWrite} className="mt-1" /><span><b className="block text-sm text-[#171612]">Permitir ejecución de cambios</b><small className="mt-1 block leading-5 text-[#716b60]">Desactivado: el agente analiza y genera previews. Activado: puede aplicar cambios cubiertos por el perfil. Publicación e inventario siguen sujetos a Gobernanza.</small></span></label>
          </AdminCard>

          <AdminCard glow className="p-0 sm:p-0">
            <div className="border-b border-black/10 px-5 py-4"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#9b6a12]">Consola</p><h2 className="mt-1 text-lg font-black text-[#171612]">Pídele una tarea completa</h2></div>
            <div className="grid gap-3 p-5">
              <div className="flex flex-wrap gap-2">{quickPrompts.map((item, index) => <button key={index} type="button" onClick={() => void runAgent(item)} disabled={!ready || running} className="rounded-full border border-black/10 bg-white/75 px-3 py-2 text-left text-[10px] font-black text-[#514b42] disabled:opacity-40">{['Analizar tráfico', 'Auditar sitio', 'Supervisar catálogo', 'Preparar mejoras'][index]}</button>)}</div>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={5} placeholder="Ej.: revisa mis visitas, detecta qué productos tienen problemas y prepara las mejoras necesarias. No publiques nada sin mostrarme primero el preview." className="min-h-32 resize-y rounded-xl border border-black/10 bg-white/80 p-4 text-sm leading-6 text-[#171612] outline-none focus:border-[#c77a00]/35 focus:ring-4 focus:ring-[#ffb000]/10" />
              <button type="button" onClick={() => void runAgent()} disabled={!ready || !prompt.trim() || running} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#171612] px-5 text-xs font-black text-white disabled:opacity-40">{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {running ? 'Ejecutando agente…' : allowWrites ? 'Analizar y ejecutar' : 'Analizar con herramientas'}</button>
            </div>
          </AdminCard>

          {result ? <AdminCard glow><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-emerald-700">Resultado</p><h2 className="mt-1 text-lg font-black text-[#171612]">Respuesta del agente</h2></div><CheckCircle2 className="h-5 w-5 text-emerald-700" /></div><div className="mt-4 whitespace-pre-wrap rounded-xl border border-black/8 bg-white/70 p-4 text-sm leading-6 text-[#37332d]">{result.response}</div>{result.approvals.length ? <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/8 p-4"><p className="text-xs font-black text-amber-900">{result.approvals.length} acción(es) esperando aprobación humana.</p><Link href="/admin/mcp/gobernanza" className="mt-2 inline-flex text-xs font-black text-amber-900 underline">Abrir Gobernanza</Link></div> : null}</AdminCard> : null}
        </div>

        <div className="grid content-start gap-5">
          {!connections.length ? <AdminCard><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#9b6a12]">Primer acceso</p><h2 className="mt-1 text-lg font-black text-[#171612]">Crear perfil Ollama Agent</h2><p className="mt-2 text-sm leading-6 text-[#716b60]">Este perfil define exactamente qué puede hacer el agente. Puedes ampliarlo o revocarlo desde ChatGPT & MCP.</p><div className="mt-4 grid gap-2">{scopeOptions.map(([scope, label]) => <label key={scope} className="flex items-center gap-2 rounded-lg border border-black/8 bg-white/60 px-3 py-2 text-xs font-semibold text-[#514b42]"><input type="checkbox" checked={newScopes.includes(scope)} onChange={(event) => setNewScopes((current) => event.target.checked ? [...new Set([...current, scope])] : current.filter((item) => item !== scope))} /> {label}</label>)}<button type="button" onClick={() => void createAgentProfile()} className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white"><Plus className="h-4 w-4" /> Crear perfil</button></div></AdminCard> : null}

          <AdminCard><div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#9b6a12]">Activity Trace</p><h2 className="mt-1 text-lg font-black text-[#171612]">Qué hizo realmente</h2></div><Activity className="h-5 w-5 text-[#a56600]" /></div><div className="mt-4 grid max-h-[520px] gap-2 overflow-y-auto">{result?.trace?.length ? [...result.trace].reverse().map((item, index) => <div key={`${item.at}-${index}`} className={`rounded-xl border p-3 ${item.type === 'error' ? 'border-rose-500/15 bg-rose-500/5' : item.type === 'approval' ? 'border-amber-500/15 bg-amber-500/5' : 'border-black/8 bg-white/55'}`}><div className="flex items-center justify-between gap-2"><b className="text-[10px] uppercase tracking-[.1em] text-[#514b42]">{item.name || item.type}</b><span className="text-[9px] text-[#8f897f]">{new Date(item.at).toLocaleTimeString('es-CL')}</span></div><p className="mt-1.5 whitespace-pre-wrap text-[11px] leading-5 text-[#716b60]">{item.detail}</p></div>) : <p className="rounded-xl border border-dashed border-black/10 p-5 text-center text-xs text-[#8f897f]">Ejecuta una consulta para ver llamadas de herramientas, resultados y aprobaciones.</p>}</div></AdminCard>
        </div>
      </div>

      <AdminCard glow>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Automatizaciones</p><h2 className="mt-1 text-xl font-black tracking-[-.03em] text-[#171612]">Tareas del agente</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#716b60]">Guarda instrucciones manuales, diarias o semanales. Las programadas se revisan una vez al día desde Fabrick Daily para mantener compatibilidad con Vercel sin añadir crons frecuentes.</p></div><Clock3 className="h-5 w-5 text-[#a56600]" /></div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_170px_150px_auto]">
          <input value={taskLabel} onChange={(event) => setTaskLabel(event.target.value)} placeholder="Nombre de la tarea" className="min-h-11 rounded-xl border border-black/10 bg-white/80 px-3 text-sm font-semibold" />
          <input value={taskPrompt} onChange={(event) => setTaskPrompt(event.target.value)} placeholder="Ej.: cada día analiza tráfico y catálogo y dame las 3 prioridades" className="min-h-11 rounded-xl border border-black/10 bg-white/80 px-3 text-sm font-semibold" />
          <select value={taskSchedule} onChange={(event) => setTaskSchedule(event.target.value as 'manual' | 'daily' | 'weekly')} className="min-h-11 rounded-xl border border-black/10 bg-white/80 px-3 text-sm font-semibold"><option value="manual">Manual</option><option value="daily">Diaria</option><option value="weekly">Semanal</option></select>
          {taskSchedule === 'weekly' ? <select value={taskWeekday} onChange={(event) => setTaskWeekday(Number(event.target.value))} className="min-h-11 rounded-xl border border-black/10 bg-white/80 px-3 text-sm font-semibold">{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select> : <label className="flex min-h-11 items-center gap-2 rounded-xl border border-black/10 bg-white/60 px-3 text-xs font-semibold"><input type="checkbox" checked={taskWrites} onChange={(event) => setTaskWrites(event.target.checked)} /> Ejecutar cambios</label>}
          <button type="button" onClick={() => void createTask()} disabled={!ready || savingTask || !taskLabel.trim() || !taskPrompt.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white disabled:opacity-40">{savingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Guardar</button>
        </div>
        {taskSchedule === 'weekly' ? <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#716b60]"><input type="checkbox" checked={taskWrites} onChange={(event) => setTaskWrites(event.target.checked)} /> Esta tarea puede ejecutar cambios cubiertos por su perfil MCP.</label> : null}
        <div className="mt-5 grid gap-2">{tasks.length ? tasks.map((task) => <div key={task.id} className="grid gap-3 rounded-xl border border-black/8 bg-white/60 p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><b className="text-sm text-[#171612]">{task.label}</b><span className="rounded-full bg-black/5 px-2 py-0.5 text-[9px] font-black uppercase text-[#716b60]">{task.schedule_kind === 'weekly' ? `Semanal · ${weekdays[task.weekday || 0]}` : task.schedule_kind}</span>{task.allow_writes ? <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-amber-800">ejecución</span> : <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-800">análisis</span>}</div><p className="mt-1 truncate text-xs text-[#716b60]">{task.prompt}</p>{task.last_error ? <p className="mt-1 text-[10px] font-semibold text-rose-700">{task.last_error}</p> : task.last_result?.response ? <p className="mt-1 truncate text-[10px] text-[#8f897f]">Último: {task.last_result.response}</p> : null}</div><div className="flex gap-2"><button type="button" onClick={() => void taskAction(task, 'run')} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 text-[10px] font-black text-[#514b42]"><Play className="h-3.5 w-3.5" /> Ejecutar</button><button type="button" onClick={() => void taskAction(task, 'toggle')} className={`min-h-9 rounded-xl px-3 text-[10px] font-black ${task.enabled ? 'bg-[#171612] text-white' : 'border border-black/10 bg-white text-[#716b60]'}`}>{task.enabled ? 'Pausar' : 'Activar'}</button></div></div>) : <p className="rounded-xl border border-dashed border-black/10 p-6 text-center text-sm text-[#8f897f]">Aún no hay tareas guardadas.</p>}</div>
      </AdminCard>
    </AdminPage>
  );
}

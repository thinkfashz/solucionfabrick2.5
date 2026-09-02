'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Loader2, Play, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { AdminCard } from '@/components/admin/ui';

type TaskCadence = 'manual' | 'hourly' | 'daily';
type AgentTask = {
  id: string;
  model: string;
  title: string;
  prompt: string;
  cadence: TaskCadence;
  enabled: boolean;
  allowWrites: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastResult: Record<string, unknown>;
};
type AgentProfile = { allowScheduledWrites: boolean };

function dateLabel(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

function cadenceLabel(value: TaskCadence) {
  return value === 'hourly' ? 'Cada hora' : value === 'daily' ? 'Cada día' : 'Manual';
}

function resultSummary(result: Record<string, unknown>) {
  if (typeof result.error === 'string') return result.error;
  if (typeof result.content === 'string') return result.content.slice(0, 240);
  return Object.keys(result).length ? 'Resultado guardado.' : 'Sin ejecución todavía.';
}

export default function AgentTasksPanel({ model, ready }: { model: string; ready: boolean }) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [taskCadence, setTaskCadence] = useState<TaskCadence>('daily');
  const [allowWrites, setAllowWrites] = useState(false);
  const [manualAllowCommit, setManualAllowCommit] = useState(false);
  const [allowScheduledWrites, setAllowScheduledWrites] = useState(false);
  const [savingScheduledPolicy, setSavingScheduledPolicy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [taskResponse, profileResponse] = await Promise.all([
        fetch('/api/admin/mcp/agent-tasks', { cache: 'no-store' }),
        fetch('/api/admin/mcp/agent-profile', { cache: 'no-store' }),
      ]);
      const taskBody = await taskResponse.json() as { tasks?: AgentTask[]; error?: string };
      const profileBody = await profileResponse.json() as { profile?: AgentProfile; error?: string };
      if (!taskResponse.ok) throw new Error(taskBody.error || 'No se pudieron cargar las automatizaciones.');
      setTasks(taskBody.tasks || []);
      if (profileResponse.ok && profileBody.profile) setAllowScheduledWrites(profileBody.profile.allowScheduledWrites === true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las automatizaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createTask() {
    if (!title.trim() || !prompt.trim() || !model) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/mcp/agent-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: title.trim(),
          prompt: prompt.trim(),
          model,
          cadence: taskCadence,
          enabled: taskCadence !== 'manual',
          allowWrites,
        }),
      });
      const body = await response.json() as { task?: AgentTask; error?: string };
      if (!response.ok || !body.task) throw new Error(body.error || 'No se pudo crear la tarea.');
      setTasks((current) => [body.task!, ...current]);
      setTitle('');
      setPrompt('');
      setAllowWrites(false);
      setNotice('Automatización creada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la tarea.');
    } finally {
      setSaving(false);
    }
  }

  async function updateTask(task: AgentTask, patch: Partial<Pick<AgentTask, 'enabled' | 'allowWrites'>>) {
    setError('');
    try {
      const response = await fetch('/api/admin/mcp/agent-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', taskId: task.id, ...patch }),
      });
      const body = await response.json() as { task?: AgentTask; error?: string };
      if (!response.ok || !body.task) throw new Error(body.error || 'No se pudo actualizar la tarea.');
      setTasks((current) => current.map((item) => item.id === task.id ? body.task! : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la tarea.');
    }
  }

  async function deleteTask(taskId: string) {
    setError('');
    try {
      const response = await fetch('/api/admin/mcp/agent-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', taskId }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || 'No se pudo eliminar la tarea.');
      setTasks((current) => current.filter((item) => item.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la tarea.');
    }
  }

  async function runTask(task: AgentTask) {
    setRunningId(task.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/mcp/agent-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', taskId: task.id, allowCommit: manualAllowCommit }),
      });
      const body = await response.json() as { result?: { content?: string }; error?: string };
      if (!response.ok || !body.result) throw new Error(body.error || 'No se pudo ejecutar la tarea.');
      setNotice(body.result.content?.slice(0, 400) || 'Tarea ejecutada.');
      setManualAllowCommit(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ejecutar la tarea.');
    } finally {
      setRunningId('');
    }
  }

  async function saveScheduledWritePolicy(next: boolean) {
    setSavingScheduledPolicy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/mcp/agent-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowScheduledWrites: next }),
      });
      const body = await response.json() as { profile?: AgentProfile; error?: string };
      if (!response.ok || !body.profile) throw new Error(body.error || 'No se pudo guardar la política.');
      setAllowScheduledWrites(body.profile.allowScheduledWrites === true);
      setNotice(next ? 'Escrituras programadas habilitadas globalmente.' : 'Escrituras programadas deshabilitadas.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la política.');
    } finally {
      setSavingScheduledPolicy(false);
    }
  }

  return (
    <AdminCard glow>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Automatización</p><h2 className="mt-1 text-xl font-black tracking-[-.03em] text-[#171612]">Tareas del agente</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#716b60]">Programa análisis o acciones manuales, horarias o diarias. El ejecutor revisa las tareas pendientes cada hora.</p></div>
        <CalendarClock className="h-5 w-5 text-[#a56600]" />
      </div>

      {(error || notice) ? <div className={`mt-4 rounded-xl border px-3 py-2 text-xs font-semibold ${error ? 'border-rose-500/20 bg-rose-50 text-rose-800' : 'border-emerald-500/20 bg-emerald-50 text-emerald-800'}`}>{error || notice}</div> : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nombre de la tarea" className="min-h-11 rounded-xl border border-black/10 bg-white/80 px-3.5 text-sm font-semibold outline-none" />
        <div className="grid grid-cols-2 gap-2">
          <select value={taskCadence} onChange={(event) => setTaskCadence(event.target.value as TaskCadence)} className="min-h-11 rounded-xl border border-black/10 bg-white/80 px-3 text-sm font-semibold">
            <option value="manual">Manual</option><option value="hourly">Cada hora</option><option value="daily">Cada día</option>
          </select>
          <div className="flex min-h-11 items-center truncate rounded-xl border border-black/8 bg-white/45 px-3 text-xs font-semibold text-[#716b60]">{model || 'Sin modelo'}</div>
        </div>
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} placeholder="Ej.: Analiza las visitas, conversión y catálogo de los últimos 7 días y dime las tres acciones prioritarias." className="rounded-xl border border-black/10 bg-white/80 p-3.5 text-sm leading-6 outline-none lg:col-span-2" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black ${allowWrites ? 'border-rose-400/25 bg-rose-50 text-rose-800' : 'border-black/10 bg-white/60 text-[#716b60]'}`}><input type="checkbox" checked={allowWrites} onChange={(event) => setAllowWrites(event.target.checked)} /> Esta tarea puede solicitar cambios</label>
        <button type="button" onClick={() => void createTask()} disabled={saving || !ready || !title.trim() || !prompt.trim()} className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white disabled:opacity-35">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear tarea</button>
      </div>

      <div className="mt-5 rounded-xl border border-[#c77a00]/15 bg-[#fff7e7] p-3">
        <div className="flex flex-wrap items-center gap-3"><ShieldCheck className="h-4 w-4 text-[#a56600]" /><div className="min-w-0 flex-1"><p className="text-xs font-black text-[#80652a]">Escrituras automáticas globales</p><p className="mt-0.5 text-[11px] leading-5 text-[#8f887c]">Para que una tarea programada pueda hacer commits deben estar activados este permiso global y “Esta tarea puede solicitar cambios”. Publicación e inventario mantienen sus aprobaciones.</p></div><label className="flex items-center gap-2 text-xs font-black text-[#80652a]"><input type="checkbox" checked={allowScheduledWrites} disabled={savingScheduledPolicy} onChange={(event) => void saveScheduledWritePolicy(event.target.checked)} /> {allowScheduledWrites ? 'Habilitadas' : 'Bloqueadas'}</label></div>
      </div>

      <div className="mt-5 flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Tareas guardadas · {tasks.length}</p><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#80652a]"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Recargar</button></div>
      <label className="mt-3 flex items-center gap-2 rounded-xl border border-black/8 bg-white/45 px-3 py-2 text-[11px] font-bold text-[#716b60]"><input type="checkbox" checked={manualAllowCommit} onChange={(event) => setManualAllowCommit(event.target.checked)} /> Permitir cambios cuando pulse “Ejecutar ahora” en una tarea que tenga permiso de escritura.</label>

      <div className="mt-3 grid gap-2">
        {loading ? <div className="flex items-center gap-2 py-5 text-sm text-[#8f887c]"><Loader2 className="h-4 w-4 animate-spin" /> Cargando tareas…</div> : !tasks.length ? <div className="rounded-xl border border-dashed border-black/10 px-4 py-6 text-sm text-[#8f887c]">Aún no hay automatizaciones.</div> : tasks.map((task) => (
          <div key={task.id} className="rounded-xl border border-black/8 bg-white/55 p-3">
            <div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-black text-[#171612]">{task.title}</p><span className="rounded-full bg-black/5 px-2 py-0.5 text-[9px] font-black uppercase text-[#716b60]">{cadenceLabel(task.cadence)}</span>{task.allowWrites ? <span className="rounded-full bg-rose-500/8 px-2 py-0.5 text-[9px] font-black uppercase text-rose-700">Puede escribir</span> : <span className="rounded-full bg-emerald-500/8 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700">Solo lectura</span>}</div><p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[#8f887c]">{task.prompt}</p></div><button type="button" onClick={() => void deleteTask(task.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-rose-500/15 text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button></div>
            <div className="mt-3 grid gap-2 text-[10px] text-[#8f887c] sm:grid-cols-3"><span>Próxima: <b className="text-[#514b42]">{dateLabel(task.nextRunAt)}</b></span><span>Última: <b className="text-[#514b42]">{dateLabel(task.lastRunAt)}</b></span><span>Estado: <b className={task.lastStatus === 'error' ? 'text-rose-700' : 'text-[#514b42]'}>{task.lastStatus || 'sin ejecutar'}</b></span></div>
            <p className="mt-2 rounded-lg bg-black/[.025] px-2.5 py-2 text-[10px] leading-4 text-[#716b60]">{resultSummary(task.lastResult)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">{task.cadence !== 'manual' ? <label className="flex items-center gap-2 text-[10px] font-black text-[#716b60]"><input type="checkbox" checked={task.enabled} onChange={(event) => void updateTask(task, { enabled: event.target.checked })} /> {task.enabled ? 'Programada' : 'Pausada'}</label> : null}<label className="flex items-center gap-2 text-[10px] font-black text-[#716b60]"><input type="checkbox" checked={task.allowWrites} onChange={(event) => void updateTask(task, { allowWrites: event.target.checked })} /> Escritura</label><button type="button" onClick={() => void runTask(task)} disabled={runningId === task.id || !ready} className="ml-auto inline-flex min-h-9 items-center gap-2 rounded-xl border border-black/10 bg-white/80 px-3 text-[10px] font-black text-[#514b42] disabled:opacity-40">{runningId === task.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Ejecutar ahora</button></div>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}

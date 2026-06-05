'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  Code2,
  Copy,
  Download,
  FileCode2,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  Menu,
  MessageSquarePlus,
  Paperclip,
  RefreshCcw,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  UploadCloud,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { ModelPerformanceChart } from '@/components/admin/ModelPerformanceChart';
import { ModelStatusBadge } from '@/components/admin/ModelStatusBadge';
import type { ModelHealth, ModelStats } from '@/lib/aiChatStats';

interface Thread {
  id: string;
  title: string;
  model: string | null;
  system_prompt: string | null;
  preset_key: string | null;
  updated_at: string;
}

interface ImageAttachment {
  type: 'image';
  dataUrl: string;
  mimeType: string;
  cloudinary_url?: string;
  uploading?: boolean;
}

interface FileAttachment {
  type?: undefined;
  path: string;
  bytes: number;
  truncated: boolean;
}

type MessageAttachment = ImageAttachment | FileAttachment;

function mimeToExt(mime: string): string {
  const sub = mime.split('/')[1] || 'png';
  return sub.split('+')[0];
}

interface Message {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  attachments: MessageAttachment[] | null;
  created_at: string;
}

interface TriedModel {
  model: string;
  status: string;
  latency_ms: number;
  http_status: number | null;
  error?: string;
}

interface ModelInfo {
  id: string;
  name: string;
  description: string | null;
  context_length: number | null;
  pricing: { prompt: number; completion: number };
  isFree: boolean;
}

interface ModelsResponse {
  total: number;
  free: ModelInfo[];
  paid: ModelInfo[];
  recommended_free: string[];
}

interface Preset {
  key: string;
  label: string;
  description: string;
  systemPrompt: string;
  icon: typeof Sparkles;
  defaultSuggestions: string[];
}

const PRESETS: Preset[] = [
  {
    key: 'soporte',
    label: 'Soporte',
    description: 'Responde dudas de clientes con tono cordial. Habla siempre en español de Chile.',
    systemPrompt:
      'Eres el asistente de Soluciones Fabrick, una empresa chilena de construcción y remodelaciones. Respondes a clientes de forma cordial y clara, en español de Chile. Si la pregunta es sobre un material, da medidas y compatibilidades. Si es sobre un pedido, pide número de orden. Nunca inventes precios — si no los tienes, indica "consulta /presupuestos".',
    icon: HelpCircle,
    defaultSuggestions: [
      '¿Cómo redacto una respuesta para un cliente que pide reembolso?',
      'Dame un guion para un cliente que pregunta por tiempos de entrega.',
    ],
  },
  {
    key: 'construccion',
    label: 'Construcción',
    description: 'Genera contenido educativo de construcción y guías DIY para el boletín.',
    systemPrompt:
      'Eres un experto en construcción liviana, remodelaciones y carpintería. Ayudas al equipo de marketing de Soluciones Fabrick a crear guías DIY y boletines. Devuelves contenido en formato Markdown listo para enviar por email. Usa subtítulos `##`, listas y advertencias `> ⚠️` cuando algo sea peligroso.',
    icon: Wand2,
    defaultSuggestions: [
      'Escribe una guía de 3 párrafos sobre cómo aislar un techo con poliuretano.',
      'Dame 5 errores típicos al instalar OSB en pisos.',
    ],
  },
  {
    key: 'codigo',
    label: 'Código',
    description: 'Lee archivos del repo `solucionfabrick2.5` y propone mejoras o explica el código.',
    systemPrompt:
      'Eres un revisor senior fullstack (Next.js 15, TypeScript, InsForge/PostgREST). Analizas el código adjuntado del repo `solucionfabrick2.5`. Cuando propongas cambios, devuélvelos como diff conceptual o snippet listo para pegar. Sé conciso. Si te falta contexto, pide explícitamente más archivos.',
    icon: Code2,
    defaultSuggestions: [
      'Explícame qué hace este archivo y posibles mejoras.',
      'Detecta posibles bugs o vulnerabilidades en este código.',
    ],
  },
];

const FALLBACK_FREE_MODEL = 'meta-llama/llama-3.2-3b-instruct:free';

function renderContent(text: string): React.ReactNode {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <p key={i} className="mb-1 mt-3 font-bold text-white">{line.slice(3)}</p>;
    if (line.startsWith('### ')) return <p key={i} className="mt-2 font-semibold text-neutral-200">{line.slice(4)}</p>;
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return <p key={i} className="flex gap-1.5"><span className="mt-1 shrink-0 text-xs text-amber-400">·</span><span>{line.slice(2)}</span></p>;
    }
    if (line.startsWith('> ')) {
      return <p key={i} className="my-1 border-l-2 border-amber-400/40 pl-2.5 text-[11px] text-neutral-400">{line.slice(2)}</p>;
    }
    if (line === '') return <span key={i} className="block h-2" />;
    return <span key={i} className="block">{line}</span>;
  });
}

export default function AsistenteIaPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<ModelsResponse | null>(null);
  const [modelId, setModelId] = useState<string>('');
  const [presetKey, setPresetKey] = useState<string>('soporte');
  const [systemPrompt, setSystemPrompt] = useState<string>(PRESETS[0].systemPrompt);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [attachmentDraft, setAttachmentDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelFilter, setModelFilter] = useState<'free' | 'free+cheap' | 'all'>('free');
  const [modelSearch, setModelSearch] = useState('');
  const [showModels, setShowModels] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [autoSaveCloudinary, setAutoSaveCloudinary] = useState(false);
  const [allowPaid, setAllowPaid] = useState(false);
  const [modelStats, setModelStats] = useState<ModelStats[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [fallbackInfo, setFallbackInfo] = useState<{ from: string; to: string; reason: string } | null>(null);

  // Layout state
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const f = localStorage.getItem('asistente-ia:modelFilter') as 'free' | 'free+cheap' | 'all' | null;
      if (f === 'free' || f === 'free+cheap' || f === 'all') setModelFilter(f);
      const ap = localStorage.getItem('asistente-ia:allowPaid');
      if (ap === '1') setAllowPaid(true);
      const auto = localStorage.getItem('asistente-ia:autoSaveCloudinary');
      if (auto === '1') setAutoSaveCloudinary(true);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem('asistente-ia:modelFilter', modelFilter); } catch { /**/ } }, [modelFilter]);
  useEffect(() => { try { localStorage.setItem('asistente-ia:allowPaid', allowPaid ? '1' : '0'); } catch { /**/ } }, [allowPaid]);
  useEffect(() => { try { localStorage.setItem('asistente-ia:autoSaveCloudinary', autoSaveCloudinary ? '1' : '0'); } catch { /**/ } }, [autoSaveCloudinary]);

  const activeThread = useMemo(() => threads.find((t) => t.id === activeThreadId) ?? null, [threads, activeThreadId]);

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai-chat/threads');
      const json = await res.json();
      if (Array.isArray(json?.threads)) setThreads(json.threads as Thread[]);
    } catch (err) { setError((err as Error).message); }
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ai-chat/threads/${id}`);
      const json = await res.json();
      if (Array.isArray(json?.messages)) setMessages(json.messages as Message[]);
      const t = json?.thread as Thread | undefined;
      if (t) {
        if (t.model) setModelId(t.model);
        if (t.system_prompt) setSystemPrompt(t.system_prompt);
        if (t.preset_key) setPresetKey(t.preset_key);
      }
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, []);

  const loadModels = useCallback(async (refresh = false) => {
    setModelsLoading(true);
    setError(null);
    try {
      const url = refresh ? '/api/admin/ai-chat/models?refresh=1' : '/api/admin/ai-chat/models';
      const res = await fetch(url);
      const json = (await res.json()) as ModelsResponse | { error: string };
      if (!res.ok) throw new Error((json as { error: string }).error ?? 'Error');
      setModels(json as ModelsResponse);
      setModelId((current) => {
        if (current) return current;
        const recs = (json as ModelsResponse).recommended_free ?? [];
        const free = (json as ModelsResponse).free ?? [];
        const pick = recs.find((id) => free.some((m) => m.id === id)) ?? free[0]?.id ?? FALLBACK_FREE_MODEL;
        return pick;
      });
    } catch (err) { setError((err as Error).message); }
    finally { setModelsLoading(false); }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai-chat/stats?hours=24');
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json?.stats)) setModelStats(json.stats as ModelStats[]);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    void loadThreads();
    void loadModels(false);
    void loadStats();
  }, [loadThreads, loadModels, loadStats]);

  useEffect(() => {
    if (activeThreadId) void loadMessages(activeThreadId);
    else setMessages([]);
  }, [activeThreadId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  function applyPreset(key: string) {
    const p = PRESETS.find((x) => x.key === key);
    if (!p) return;
    setPresetKey(key);
    setSystemPrompt(p.systemPrompt);
  }

  async function handleNewThread() {
    setError(null);
    try {
      const preset = PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0];
      const res = await fetch('/api/admin/ai-chat/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${preset.label} · ${new Date().toLocaleString('es-CL')}`,
          model: modelId || FALLBACK_FREE_MODEL,
          system_prompt: systemPrompt,
          preset_key: presetKey,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Error');
      await loadThreads();
      setActiveThreadId(json.thread.id);
      setMessages([]);
    } catch (err) { setError((err as Error).message); }
  }

  async function handleDeleteThread(id: string) {
    if (!confirm('¿Borrar esta conversación?')) return;
    try {
      await fetch(`/api/admin/ai-chat/threads/${id}`, { method: 'DELETE' });
      if (activeThreadId === id) setActiveThreadId(null);
      await loadThreads();
    } catch (err) { setError((err as Error).message); }
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || sending) return;
    setError(null);

    let threadId = activeThreadId;
    if (!threadId) {
      const preset = PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0];
      const res = await fetch('/api/admin/ai-chat/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: input.trim().slice(0, 60), model: modelId, system_prompt: systemPrompt, preset_key: preset.key }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? 'Error creando hilo'); return; }
      threadId = json.thread.id;
      setActiveThreadId(threadId);
      await loadThreads();
    }

    const userText = input.trim();
    setInput('');
    setSending(true);
    const tempUser: Message = {
      id: `tmp-${Date.now()}`,
      thread_id: threadId!,
      role: 'user',
      content: userText,
      model: modelId,
      tokens_in: null,
      tokens_out: null,
      attachments: attachments.length ? attachments.map((p) => ({ path: p, bytes: 0, truncated: false })) : null,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, tempUser]);

    try {
      const res = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId, model: modelId || FALLBACK_FREE_MODEL, user_message: userText, system_prompt: systemPrompt, attachments, allow_paid: allowPaid }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Error');
      const tried = (json?.tried ?? []) as TriedModel[];
      if (tried.length > 1) {
        const failed = tried[0];
        const succeeded = tried[tried.length - 1];
        if (succeeded.status === 'ok') {
          setFallbackInfo({
            from: failed.model,
            to: succeeded.model,
            reason: failed.status === 'timeout' ? `timeout (${Math.round(failed.latency_ms / 1000)}s)` : failed.status === 'rate_limit' ? 'rate limit (429)' : failed.status === 'empty' ? 'respuesta vacía' : (failed.error?.slice(0, 60) ?? failed.status),
          });
        }
      }
      setAttachments([]);
      if (threadId) await loadMessages(threadId);
    } catch (err) { setError((err as Error).message); }
    finally { setSending(false); }
  }

  async function uploadToCloudinary(att: ImageAttachment, messageId: string, idx: number) {
    setMessages((prev) => prev.map((m) => {
      if (m.id !== messageId || !m.attachments) return m;
      const arr = m.attachments.slice() as MessageAttachment[];
      const cur = arr[idx];
      if (cur && cur.type === 'image') arr[idx] = { ...cur, uploading: true };
      return { ...m, attachments: arr };
    }));
    try {
      const resBlob = await fetch(att.dataUrl);
      const blob = await resBlob.blob();
      const ext = mimeToExt(att.mimeType);
      const file = new File([blob], `ai-chat-${Date.now()}.${ext}`, { type: att.mimeType });
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'ai-chat');
      const up = await fetch('/api/admin/cloudinary', { method: 'POST', body: fd });
      const json = await up.json();
      if (!up.ok) throw new Error(json?.error ?? 'Cloudinary error');
      const url: string = json.url || json.asset?.url;
      setMessages((prev) => prev.map((m) => {
        if (m.id !== messageId || !m.attachments) return m;
        const arr = m.attachments.slice() as MessageAttachment[];
        const cur = arr[idx];
        if (cur && cur.type === 'image') arr[idx] = { ...cur, uploading: false, cloudinary_url: url };
        return { ...m, attachments: arr };
      }));
    } catch (err) {
      setError(`Cloudinary: ${(err as Error).message}`);
      setMessages((prev) => prev.map((m) => {
        if (m.id !== messageId || !m.attachments) return m;
        const arr = m.attachments.slice() as MessageAttachment[];
        const cur = arr[idx];
        if (cur && cur.type === 'image') arr[idx] = { ...cur, uploading: false };
        return { ...m, attachments: arr };
      }));
    }
  }

  async function handleGenerateImage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || sending) return;
    setError(null);

    let threadId = activeThreadId;
    if (!threadId) {
      const preset = PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0];
      const res = await fetch('/api/admin/ai-chat/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `🖼️ ${input.trim().slice(0, 50)}`, model: modelId, system_prompt: systemPrompt, preset_key: preset.key }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? 'Error'); return; }
      threadId = json.thread.id;
      setActiveThreadId(threadId);
      await loadThreads();
    }

    const prompt = input.trim();
    setInput('');
    setSending(true);
    try {
      const res = await fetch('/api/admin/ai-chat/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId, prompt, allow_paid: allowPaid }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Error');
      const tried = (json?.tried ?? []) as TriedModel[];
      if (tried.length > 1 && tried[tried.length - 1].status === 'ok') {
        setFallbackInfo({ from: tried[0].model, to: tried[tried.length - 1].model, reason: tried[0].status === 'empty' ? 'sin imagen' : tried[0].status });
      }
      if (threadId) await loadMessages(threadId);
      if (autoSaveCloudinary && threadId) {
        setTimeout(() => {
          setMessages((prev) => {
            const last = [...prev].reverse().find((m) => m.role === 'assistant' && Array.isArray(m.attachments) && m.attachments.some((a) => (a as ImageAttachment).type === 'image'));
            if (last?.attachments) {
              last.attachments.forEach((att, i) => {
                if ((att as ImageAttachment).type === 'image' && !(att as ImageAttachment).cloudinary_url) {
                  void uploadToCloudinary(att as ImageAttachment, last.id, i);
                }
              });
            }
            return prev;
          });
        }, 200);
      }
    } catch (err) { setError((err as Error).message); }
    finally { setSending(false); }
  }

  function copyMessage(content: string) { void navigator.clipboard.writeText(content); }

  function addAttachment() {
    const trimmed = attachmentDraft.trim();
    if (!trimmed) return;
    if (attachments.includes(trimmed)) return;
    if (attachments.length >= 8) { setError('Máximo 8 archivos por mensaje.'); return; }
    setAttachments((a) => [...a, trimmed]);
    setAttachmentDraft('');
  }

  const statsByModel = useMemo(() => {
    const m = new Map<string, ModelStats>();
    for (const s of modelStats) m.set(s.model, s);
    return m;
  }, [modelStats]);

  const scoreFor = useCallback((id: string): number => {
    const s = statsByModel.get(id);
    if (!s) return 0;
    const speed = Math.max(0, 1 - Math.min(s.avg_latency_ms, 10000) / 10000);
    const base = s.success_rate * 0.7 + speed * 0.3;
    if (s.health === 'down') return base - 1;
    return base;
  }, [statsByModel]);

  const filteredFree = useMemo(() => {
    if (!models) return [];
    const q = modelSearch.trim().toLowerCase();
    return [...models.free]
      .filter((m) => !q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q))
      .sort((a, b) => scoreFor(b.id) - scoreFor(a.id))
      .slice(0, 60);
  }, [models, modelSearch, scoreFor]);

  const filteredPaid = useMemo(() => {
    if (!models) return [];
    const q = modelSearch.trim().toLowerCase();
    let list = models.paid.filter((m) => !q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
    if (modelFilter === 'free+cheap') list = list.filter((m) => Math.max(m.pricing.prompt, m.pricing.completion) <= 0.5e-6);
    return list.sort((a, b) => scoreFor(b.id) - scoreFor(a.id)).slice(0, 60);
  }, [models, modelSearch, modelFilter, scoreFor]);

  const currentModelInfo = useMemo(() => {
    if (!models || !modelId) return null;
    return models.free.find((m) => m.id === modelId) ?? models.paid.find((m) => m.id === modelId) ?? null;
  }, [models, modelId]);

  const modelShortName = currentModelInfo?.name
    ? currentModelInfo.name.length > 18 ? currentModelInfo.name.slice(0, 18) + '…' : currentModelInfo.name
    : modelId.split('/')[1]?.replace(':free', '') ?? modelId;

  const activeStat = modelId ? statsByModel.get(modelId) : null;

  // ── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col sm:flex-row h-[calc(100vh-80px)] lg:h-[calc(100vh-64px)] w-full overflow-hidden bg-[#0a0a0a] text-white">

      {/* ── SIDEBAR: Threads ── */}
      {showSidebar && (
        <aside className="absolute inset-y-0 left-0 z-30 flex w-full max-w-[240px] sm:relative sm:w-52 shrink-0 flex-col border-r border-white/8 bg-[#0a0a0a]">
          {/* Sidebar header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[11px] font-bold text-zinc-400">Conversaciones</span>
              {threads.length > 0 && (
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-1.5 py-px text-[9px] font-bold text-zinc-600">
                  {threads.length}
                </span>
              )}
            </div>
          </div>

          {/* New thread */}
          <div className="shrink-0 p-2">
            <button
              type="button"
              onClick={() => void handleNewThread()}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-[11px] font-bold text-black transition hover:bg-amber-400"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" /> Nueva
            </button>
          </div>

          {/* Thread list */}
          <div className="min-h-0 flex-1 overflow-y-auto space-y-px px-1.5 pb-2">
            {threads.length === 0 && (
              <div className="flex flex-col items-center gap-1.5 py-8 text-center">
                <Bot className="h-5 w-5 text-zinc-700" />
                <p className="text-[10px] text-zinc-700">Sin conversaciones aún</p>
              </div>
            )}
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveThreadId(t.id)}
                className={`group flex w-full items-start gap-1.5 rounded-lg px-2 py-1.5 text-left transition ${
                  activeThreadId === t.id
                    ? 'bg-amber-500/10 border border-amber-500/25'
                    : 'border border-transparent hover:bg-white/[0.04]'
                }`}
              >
                <span className="flex-1 min-w-0">
                  <span className={`block truncate text-[11px] font-medium ${activeThreadId === t.id ? 'text-neutral-100' : 'text-neutral-400'}`}>
                    {t.title}
                  </span>
                  <span className="block text-[9px] text-neutral-700 mt-0.5">
                    {new Date(t.updated_at).toLocaleDateString('es-CL')}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); void handleDeleteThread(t.id); }}
                  className="mt-0.5 shrink-0 text-transparent transition group-hover:text-neutral-700 hover:!text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* ── MAIN ── */}
      <main className="flex min-w-0 flex-1 flex-col">

        {/* TOP BAR */}
        <div className="flex shrink-0 items-center gap-2 border-b border-white/8 bg-black/30 px-3 py-2">
          {/* Sidebar toggle */}
          <button
            type="button"
            onClick={() => setShowSidebar((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-white/[0.06] hover:text-zinc-400"
            title={showSidebar ? 'Ocultar conversaciones' : 'Ver conversaciones'}
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-white/8" />

          {/* Preset pills */}
          {PRESETS.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${
                  presetKey === p.key
                    ? 'border border-amber-500/40 bg-amber-500/15 text-amber-300'
                    : 'border border-white/8 text-zinc-600 hover:text-zinc-300'
                }`}
              >
                <Icon className="h-2.5 w-2.5" />
                <span className="hidden sm:inline">{p.label}</span>
              </button>
            );
          })}

          <div className="flex-1" />

          {/* Model status */}
          <ModelStatusBadge className="hidden sm:inline-flex" showDetail />

          <div className="h-4 w-px bg-white/8" />

          {/* Settings toggle */}
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
              showSettings ? 'bg-amber-500/15 text-amber-400' : 'text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-400'
            }`}
            title="Configuración"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-3 mt-2 flex items-center gap-2 shrink-0 rounded-xl border border-red-500/30 bg-red-500/8 px-3 py-2 text-[11px] text-red-300">
            <X className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-300"><X className="h-3 w-3" /></button>
          </div>
        )}

        {/* Fallback banner */}
        {fallbackInfo && (
          <button
            type="button"
            onClick={() => setFallbackInfo(null)}
            className="mx-3 mt-2 shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-left text-[11px] text-amber-200 transition hover:bg-amber-500/12"
          >
            <span className="font-semibold">↻ Cambio automático:</span>{' '}
            <code className="text-amber-300">{fallbackInfo.from.split('/')[1]?.replace(':free', '')}</code>{' '}
            falló ({fallbackInfo.reason}) → respondió{' '}
            <code className="text-emerald-300">{fallbackInfo.to.split('/')[1]?.replace(':free', '')}</code>
          </button>
        )}

        {/* MESSAGES */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {!activeThread && messages.length === 0 && !loading && (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="relative mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/15 to-orange-500/8">
                  <Sparkles className="h-6 w-6 text-amber-400" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0a0a0a] bg-emerald-500 shadow-lg shadow-emerald-500/40" />
              </div>
              <p className="text-sm font-bold text-neutral-200">¿En qué te puedo ayudar?</p>
              <p className="mt-1 text-[11px] text-neutral-600">
                {PRESETS.find((p) => p.key === presetKey)?.description}
              </p>
              <div className="mt-5 w-full max-w-sm space-y-1.5">
                {(PRESETS.find((p) => p.key === presetKey)?.defaultSuggestions ?? []).map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setInput(sug)}
                    className="w-full rounded-xl border border-white/8 px-3 py-2.5 text-left text-[11px] text-neutral-400 transition hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-neutral-200"
                  >
                    <span className="mr-1.5 text-amber-400/60">›</span>{sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8 text-zinc-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="ml-2 text-sm">Cargando…</span>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 shadow-md shadow-amber-500/20">
                    <Bot className="h-3.5 w-3.5 text-neutral-950" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                    m.role === 'user'
                      ? 'rounded-br-sm border border-amber-500/20 bg-amber-500/10 text-neutral-100'
                      : 'rounded-bl-sm border border-white/8 bg-white/[0.04] text-neutral-200'
                  }`}
                >
                  {/* Image attachments */}
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {m.attachments.map((a, idx) => {
                        if ((a as ImageAttachment).type !== 'image') {
                          const fa = a as FileAttachment;
                          return (
                            <span key={`f-${idx}`} className="inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[10px] text-neutral-300">
                              <FileCode2 className="h-3 w-3" /> {fa.path}
                            </span>
                          );
                        }
                        const ia = a as ImageAttachment;
                        const src = ia.cloudinary_url || ia.dataUrl;
                        return (
                          <div key={`img-${idx}`} className="w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="generada" className="max-h-[360px] w-full bg-black/40 object-contain" />
                            <div className="flex flex-wrap items-center gap-2 px-2 py-1.5 text-[11px]">
                              <a href={ia.dataUrl} download={`ai-${m.id}-${idx}.${mimeToExt(ia.mimeType)}`} className="inline-flex items-center gap-1 text-neutral-400 hover:text-amber-400">
                                <Download className="h-3 w-3" /> descargar
                              </a>
                              {ia.cloudinary_url ? (
                                <>
                                  <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-3 w-3" /> en Cloudinary</span>
                                  <button type="button" onClick={() => { void navigator.clipboard.writeText(ia.cloudinary_url!); }} className="inline-flex items-center gap-1 text-neutral-400 hover:text-amber-400">
                                    <Copy className="h-3 w-3" /> copiar URL
                                  </button>
                                </>
                              ) : (
                                <button type="button" disabled={ia.uploading} onClick={() => void uploadToCloudinary(ia, m.id, idx)} className="inline-flex items-center gap-1 text-neutral-400 hover:text-amber-400 disabled:opacity-50">
                                  {ia.uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UploadCloud className="h-3 w-3" />}
                                  {ia.uploading ? 'subiendo…' : 'guardar en Cloudinary'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Message content */}
                  <div className="break-words">{renderContent(m.content)}</div>

                  {/* Metadata */}
                  <div className="mt-2 flex items-center gap-2.5 text-[10px] text-neutral-600">
                    <span>{new Date(m.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                    {m.tokens_in != null && <span>· {m.tokens_in}↑/{m.tokens_out ?? 0}↓ tok</span>}
                    {m.role === 'assistant' && (
                      <button type="button" onClick={() => copyMessage(m.content)} className="ml-auto inline-flex items-center gap-1 hover:text-amber-400">
                        <Copy className="h-3 w-3" /> copiar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {sending && (
              <div className="flex items-end gap-2 justify-start">
                <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 shadow-md shadow-amber-500/20">
                  <Bot className="h-3.5 w-3.5 text-neutral-950" />
                </div>
                <div className="rounded-2xl rounded-bl-sm border border-white/8 bg-white/[0.04] px-5 py-4">
                  <span className="flex items-center gap-1">
                    {[0, 160, 320].map((d) => (
                      <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── COMPOSER ── */}
        <form
          onSubmit={(e) => { e.preventDefault(); if (imageMode) void handleGenerateImage(); else void handleSend(); }}
          className="shrink-0 border-t border-white/8 p-3"
        >
          {/* Attached file chips */}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {attachments.map((a) => (
                <span key={a} className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/8 px-2 py-0.5 text-[10px] text-amber-200">
                  <FileCode2 className="h-3 w-3" /> {a}
                  <button type="button" onClick={() => setAttachments((arr) => arr.filter((x) => x !== a))} className="hover:text-red-300"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}

          {/* Attachment input (text only) */}
          {!imageMode && (
            <div className="mb-2 flex items-center gap-1.5">
              <input
                value={attachmentDraft}
                onChange={(e) => setAttachmentDraft(e.target.value)}
                placeholder="src/lib/openrouter.ts"
                className="flex-1 rounded-lg border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-300 outline-none transition focus:border-white/15 placeholder:text-zinc-700"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAttachment(); } }}
              />
              <button type="button" onClick={addAttachment} className="flex items-center gap-1 rounded-lg border border-white/8 px-2.5 py-1 text-[11px] text-zinc-500 transition hover:border-white/15 hover:text-zinc-300">
                <Paperclip className="h-3 w-3" /> Adjuntar
              </button>
            </div>
          )}

          {/* Main input card */}
          <div className={`rounded-2xl border bg-white/[0.04] transition ${imageMode ? 'border-fuchsia-500/30' : 'border-white/10'}`}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={imageMode ? '🖼️ Describe la imagen… (Enter = enviar)' : 'Escribe tu mensaje… (Enter = enviar, Shift+Enter = nueva línea)'}
              rows={2}
              className="w-full resize-none bg-transparent px-4 pt-3 text-[13px] text-white outline-none placeholder:text-zinc-700"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (imageMode) void handleGenerateImage();
                  else void handleSend();
                }
              }}
              disabled={sending}
            />
            {/* Action row */}
            <div className="flex items-center gap-2 px-3 pb-2.5">
              {/* Image mode toggle */}
              <button
                type="button"
                onClick={() => setImageMode((v) => !v)}
                className={`flex items-center justify-center rounded-lg p-1.5 text-xs transition ${imageMode ? 'bg-fuchsia-500/15 text-fuchsia-300' : 'text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-400'}`}
                title="Modo imagen"
              >
                <ImageIcon className="h-3.5 w-3.5" />
              </button>

              {/* Model status pill */}
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="inline-flex items-center gap-1 rounded-full border border-white/8 px-2 py-0.5 text-[10px] text-zinc-600 transition hover:border-white/15 hover:text-zinc-400"
                title="Cambiar modelo"
              >
                {currentModelInfo?.isFree && <Zap className="h-2.5 w-2.5 text-emerald-400" />}
                {modelShortName}
                {activeStat && (
                  <span className={
                    activeStat.health === 'working' ? 'text-emerald-500' :
                    activeStat.health === 'flaky' ? 'text-amber-500' :
                    activeStat.health === 'down' ? 'text-red-500' : 'text-zinc-700'
                  }>·</span>
                )}
              </button>

              <div className="flex-1" />

              {/* Send */}
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className={`flex items-center justify-center rounded-full p-2 transition disabled:opacity-40 ${
                  imageMode ? 'bg-fuchsia-500 hover:bg-fuchsia-400 text-white' : 'bg-amber-500 hover:bg-amber-400 text-black'
                }`}
                title={imageMode ? 'Generar imagen' : 'Enviar (Enter)'}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* ── SETTINGS PANEL ── */}
      {showSettings && (
        <aside className="absolute inset-y-0 right-0 z-30 flex w-full max-w-[280px] lg:relative lg:w-72 shrink-0 flex-col overflow-y-auto border-l border-white/8 bg-[#0a0a0a]">
          <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-2.5">
            <span className="text-[11px] font-bold text-zinc-400">Configuración</span>
            <button type="button" onClick={() => setShowSettings(false)} className="text-zinc-600 hover:text-zinc-300">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5 p-4">
            {/* Model selector */}
            <div>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Modelo activo</h3>
              <button
                type="button"
                onClick={() => setShowModels((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-left transition hover:bg-white/[0.07]"
              >
                <span className="flex items-center gap-1.5 text-[11px] text-neutral-200 truncate">
                  {currentModelInfo?.isFree && <Zap className="h-3 w-3 text-emerald-400 shrink-0" />}
                  {modelShortName}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-zinc-600 transition-transform ${showModels ? 'rotate-180' : ''}`} />
              </button>

              {showModels && (
                <div className="mt-2 max-h-[40vh] space-y-2 overflow-y-auto rounded-xl border border-white/8 bg-neutral-950 p-2">
                  <input
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Buscar modelo…"
                    className="w-full rounded-lg border border-white/8 bg-white/[0.04] px-2.5 py-1.5 text-[11px] outline-none focus:border-amber-500/30"
                  />
                  <div className="flex items-center gap-1 rounded-full border border-white/8 overflow-hidden">
                    {(['free', 'free+cheap', 'all'] as const).map((opt) => (
                      <button key={opt} type="button" onClick={() => setModelFilter(opt)}
                        className={`flex-1 py-1 text-[10px] transition ${modelFilter === opt ? 'bg-amber-500/15 text-amber-300' : 'text-neutral-500 hover:text-neutral-300'}`}>
                        {opt === 'free' ? 'Gratis' : opt === 'free+cheap' ? '+Barato' : 'Todos'}
                      </button>
                    ))}
                    <button type="button" onClick={() => void loadModels(true)} disabled={modelsLoading} className="px-2 py-1 text-amber-400/60 hover:text-amber-400">
                      <RefreshCcw className={`h-3 w-3 ${modelsLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {modelsLoading && <p className="py-2 text-center text-[11px] text-zinc-600">Cargando…</p>}
                  {!modelsLoading && !models && (
                    <p className="py-2 text-center text-[11px] text-zinc-600">
                      Configura OpenRouter en{' '}
                      <a href="/admin/integraciones" className="text-amber-400 hover:underline">integraciones</a>.
                    </p>
                  )}
                  {filteredFree.length > 0 && (
                    <ModelGroup label="Gratuitos" items={filteredFree} active={modelId} statsByModel={statsByModel} onPick={(id) => { setModelId(id); setShowModels(false); }} />
                  )}
                  {modelFilter !== 'free' && filteredPaid.length > 0 && (
                    <ModelGroup label="De pago" items={filteredPaid} active={modelId} statsByModel={statsByModel} onPick={(id) => {
                      const m = filteredPaid.find((x) => x.id === id);
                      if (m) {
                        const ok = confirm(`Modelo de pago: ${m.name}\n$${(Math.max(m.pricing.prompt, m.pricing.completion) * 1_000_000).toFixed(3)}/1M tokens\n\n¿Confirmar?`);
                        if (!ok) return;
                      }
                      setModelId(id); setShowModels(false);
                    }} />
                  )}
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Opciones</h3>
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-neutral-300">
                <input type="checkbox" checked={allowPaid} onChange={(e) => setAllowPaid(e.target.checked)} className="rounded" />
                <span>Fallback a modelos de pago</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-neutral-300">
                <input type="checkbox" checked={autoSaveCloudinary} onChange={(e) => setAutoSaveCloudinary(e.target.checked)} className="rounded" />
                <span>Auto-guardar imágenes en Cloudinary</span>
              </label>
            </div>

            {/* System prompt */}
            <div>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">System prompt</h3>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={5}
                className="w-full resize-none rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-[11px] font-mono text-zinc-300 outline-none focus:border-amber-500/30"
              />
            </div>

            {/* Stats */}
            <div>
              <button
                type="button"
                onClick={() => setShowStats((v) => !v)}
                className="flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-400"
              >
                <span className="flex items-center gap-1.5"><Zap className="h-3 w-3 text-amber-400/60" /> Rendimiento 24h</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${showStats ? 'rotate-180' : ''}`} />
              </button>
              {showStats && (
                <div className="mt-2 rounded-xl border border-white/8 bg-neutral-950 p-2">
                  <ModelPerformanceChart onStatsChange={setModelStats} />
                </div>
              )}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

function ModelGroup({
  label, items, active, statsByModel, onPick,
}: {
  label: string;
  items: ModelInfo[];
  active: string;
  statsByModel: Map<string, ModelStats>;
  onPick: (id: string) => void;
}) {
  const healthEmoji: Record<ModelHealth, string> = { working: '✅', flaky: '⚠️', down: '🛑', unknown: '·' };
  return (
    <div>
      <p className="px-1 pt-1 text-[10px] uppercase tracking-wide text-neutral-600">{label}</p>
      <div className="space-y-px">
        {items.map((m) => {
          const s = statsByModel.get(m.id);
          const health: ModelHealth = s?.health ?? 'unknown';
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onPick(m.id)}
              className={`w-full rounded-md border px-2 py-1.5 text-left text-[11px] transition ${active === m.id ? 'border-amber-500/40 bg-amber-500/5' : 'border-transparent hover:bg-neutral-900'}`}
            >
              <p className="flex items-center gap-1 truncate text-neutral-200">
                <span aria-hidden>{healthEmoji[health]}</span>
                {m.isFree && <Zap className="h-2.5 w-2.5 text-emerald-400" />}
                {m.name}
                {s && s.calls > 0 && <span className="ml-auto text-[9px] text-neutral-600">{s.avg_latency_ms}ms</span>}
              </p>
              <p className="truncate text-[10px] text-neutral-600">{m.id}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

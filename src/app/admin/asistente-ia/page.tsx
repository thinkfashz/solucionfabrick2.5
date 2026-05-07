'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  FileCode2,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
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
import { AdminCard, AdminPage, AdminPageHeader } from '@/components/admin/ui';
import { ModelPerformanceChart } from '@/components/admin/ModelPerformanceChart';
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

/** Convierte un MIME de imagen a extensión de archivo (ej. `image/svg+xml` → `svg`). */
function mimeToExt(mime: string): string {
  const sub = mime.split('/')[1] || 'png';
  // Normaliza subtipos compuestos como `svg+xml`, `png+...` quedándonos con la primera parte.
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
    label: 'Soporte cliente',
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
    label: 'Construcción / DIY',
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
    label: 'Análisis de código (repo Fabrick)',
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
  // Modo imagen (genera imágenes via OpenRouter image-out)
  const [imageMode, setImageMode] = useState(false);
  const [autoSaveCloudinary, setAutoSaveCloudinary] = useState(false);
  const [allowPaid, setAllowPaid] = useState(false);
  // Stats por modelo (para ordenar selector + banner de salud)
  const [modelStats, setModelStats] = useState<ModelStats[]>([]);
  const [showStats, setShowStats] = useState(false);
  // Banner: aviso de fallback del último envío
  const [fallbackInfo, setFallbackInfo] = useState<{ from: string; to: string; reason: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Persistencia de preferencias del selector
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
  useEffect(() => {
    try { localStorage.setItem('asistente-ia:modelFilter', modelFilter); } catch { /* */ }
  }, [modelFilter]);
  useEffect(() => {
    try { localStorage.setItem('asistente-ia:allowPaid', allowPaid ? '1' : '0'); } catch { /* */ }
  }, [allowPaid]);
  useEffect(() => {
    try { localStorage.setItem('asistente-ia:autoSaveCloudinary', autoSaveCloudinary ? '1' : '0'); } catch { /* */ }
  }, [autoSaveCloudinary]);

  const activeThread = useMemo(() => threads.find((t) => t.id === activeThreadId) ?? null, [threads, activeThreadId]);

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai-chat/threads');
      const json = await res.json();
      if (Array.isArray(json?.threads)) setThreads(json.threads as Thread[]);
    } catch (err) {
      setError((err as Error).message);
    }
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
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
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
      // Si todavía no hay modelo elegido, sugerir uno gratis recomendado.
      setModelId((current) => {
        if (current) return current;
        const recs = (json as ModelsResponse).recommended_free ?? [];
        const free = (json as ModelsResponse).free ?? [];
        const pick = recs.find((id) => free.some((m) => m.id === id)) ?? free[0]?.id ?? FALLBACK_FREE_MODEL;
        return pick;
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setModelsLoading(false);
    }
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
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDeleteThread(id: string) {
    if (!confirm('¿Borrar esta conversación?')) return;
    try {
      await fetch(`/api/admin/ai-chat/threads/${id}`, { method: 'DELETE' });
      if (activeThreadId === id) setActiveThreadId(null);
      await loadThreads();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || sending) return;
    setError(null);

    let threadId = activeThreadId;
    if (!threadId) {
      // Auto-crear hilo en el primer mensaje
      const preset = PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0];
      const res = await fetch('/api/admin/ai-chat/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: input.trim().slice(0, 60),
          model: modelId,
          system_prompt: systemPrompt,
          preset_key: preset.key,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? 'Error creando hilo');
        return;
      }
      threadId = json.thread.id;
      setActiveThreadId(threadId);
      await loadThreads();
    }

    const userText = input.trim();
    setInput('');
    setSending(true);
    // Optimistic UI
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
        body: JSON.stringify({
          thread_id: threadId,
          model: modelId || FALLBACK_FREE_MODEL,
          user_message: userText,
          system_prompt: systemPrompt,
          attachments,
          allow_paid: allowPaid,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Error');
      // Si hubo fallback, mostrar banner informativo
      const tried = (json?.tried ?? []) as TriedModel[];
      if (tried.length > 1) {
        const failed = tried[0];
        const succeeded = tried[tried.length - 1];
        if (succeeded.status === 'ok') {
          setFallbackInfo({
            from: failed.model,
            to: succeeded.model,
            reason: failed.status === 'timeout'
              ? `timeout (${Math.round(failed.latency_ms / 1000)}s)`
              : failed.status === 'rate_limit'
                ? 'rate limit (429)'
                : failed.status === 'empty'
                  ? 'respuesta vacía'
                  : (failed.error?.slice(0, 60) ?? failed.status),
          });
        }
      }
      // Limpiar adjuntos tras envío exitoso
      setAttachments([]);
      // Recargar mensajes desde servidor (versión persistida)
      if (threadId) await loadMessages(threadId);
    } catch (err) {
      setError((err as Error).message);
      // dejar el mensaje del user, no agregar respuesta
    } finally {
      setSending(false);
    }
  }

  /** Sube una imagen base64 a Cloudinary vía /api/admin/cloudinary. */
  async function uploadToCloudinary(att: ImageAttachment, messageId: string, idx: number) {
    setMessages((prev) => prev.map((m) => {
      if (m.id !== messageId || !m.attachments) return m;
      const arr = m.attachments.slice() as MessageAttachment[];
      const cur = arr[idx];
      if (cur && cur.type === 'image') arr[idx] = { ...cur, uploading: true };
      return { ...m, attachments: arr };
    }));
    try {
      // Convert dataUrl → Blob → File
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

  /** Genera una imagen vía /api/admin/ai-chat/image */
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
        body: JSON.stringify({
          title: `🖼️ ${input.trim().slice(0, 50)}`,
          model: modelId,
          system_prompt: systemPrompt,
          preset_key: preset.key,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? 'Error creando hilo');
        return;
      }
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
        setFallbackInfo({
          from: tried[0].model,
          to: tried[tried.length - 1].model,
          reason: tried[0].status === 'empty' ? 'sin imagen' : tried[0].status,
        });
      }
      if (threadId) await loadMessages(threadId);
      // Auto-guardar en Cloudinary después de cargar el mensaje
      if (autoSaveCloudinary && threadId) {
        // El último mensaje (assistant) tendrá las imágenes
        setTimeout(() => {
          setMessages((prev) => {
            const isAssistantImageMsg = (m: Message): boolean => {
              if (m.role !== 'assistant' || !Array.isArray(m.attachments)) return false;
              return m.attachments.some((a) => (a as ImageAttachment).type === 'image');
            };
            const last = [...prev].reverse().find(isAssistantImageMsg);
            if (last && last.attachments) {
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
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  function copyMessage(content: string) {
    void navigator.clipboard.writeText(content);
  }

  function addAttachment() {
    const trimmed = attachmentDraft.trim();
    if (!trimmed) return;
    if (attachments.includes(trimmed)) return;
    if (attachments.length >= 8) {
      setError('Máximo 8 archivos por mensaje.');
      return;
    }
    setAttachments((a) => [...a, trimmed]);
    setAttachmentDraft('');
  }

  const statsByModel = useMemo(() => {
    const m = new Map<string, ModelStats>();
    for (const s of modelStats) m.set(s.model, s);
    return m;
  }, [modelStats]);

  // Score numérico para ordenar (más alto = mejor)
  const scoreFor = useCallback(
    (id: string): number => {
      const s = statsByModel.get(id);
      if (!s) return 0; // sin datos => al final pero antes de "down"
      const speed = Math.max(0, 1 - Math.min(s.avg_latency_ms, 10000) / 10000);
      const base = s.success_rate * 0.7 + speed * 0.3;
      // Penalización fuerte a los caídos
      if (s.health === 'down') return base - 1;
      return base;
    },
    [statsByModel],
  );

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
    if (modelFilter === 'free+cheap') {
      // Solo modelos con precio máximo ≤ $0.5/1M tokens
      list = list.filter((m) => Math.max(m.pricing.prompt, m.pricing.completion) <= 0.5e-6);
    }
    return list.sort((a, b) => scoreFor(b.id) - scoreFor(a.id)).slice(0, 60);
  }, [models, modelSearch, modelFilter, scoreFor]);

  const currentModelInfo = useMemo(() => {
    if (!models || !modelId) return null;
    return models.free.find((m) => m.id === modelId) ?? models.paid.find((m) => m.id === modelId) ?? null;
  }, [models, modelId]);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="IA"
        title="Asistente IA · OpenRouter"
        description="Consulta cualquier modelo (gratis o de pago), pide ayuda con código del repo o redacción de boletines."
      />

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        {/* SIDEBAR HILOS */}
        <AdminCard className="space-y-3 lg:sticky lg:top-4 self-start">
          <button
            type="button"
            onClick={() => void handleNewThread()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-950 px-4 py-2.5 text-sm font-semibold"
          >
            <MessageSquarePlus className="h-4 w-4" /> Nueva conversación
          </button>
          <div className="space-y-1 max-h-[55vh] overflow-y-auto pr-1">
            {threads.length === 0 && <p className="text-xs text-neutral-500 px-1 py-3">Aún no hay conversaciones.</p>}
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveThreadId(t.id)}
                className={`group w-full text-left rounded-lg px-2.5 py-2 border transition-colors flex items-start gap-2 ${
                  activeThreadId === t.id
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-transparent hover:border-neutral-800 hover:bg-neutral-950/60'
                }`}
              >
                <Bot className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-medium text-neutral-200 truncate">{t.title}</span>
                  <span className="block text-[10px] text-neutral-500 truncate">
                    {t.model ?? '—'} · {new Date(t.updated_at).toLocaleDateString('es-CL')}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDeleteThread(t.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400"
                  title="Borrar conversación"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
          </div>
        </AdminCard>

        {/* CHAT */}
        <AdminCard className="flex flex-col min-h-[70vh]">
          {error && (
            <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
          )}
          {fallbackInfo && (
            <button
              type="button"
              onClick={() => setFallbackInfo(null)}
              className="mb-3 w-full text-left rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/15"
              title="Click para cerrar"
            >
              <span className="font-semibold">↻ Cambio automático:</span>{' '}
              <code className="text-amber-300">{fallbackInfo.from}</code> falló ({fallbackInfo.reason}). Respondió{' '}
              <code className="text-emerald-300">{fallbackInfo.to}</code>.
            </button>
          )}

          <div className="flex-1 overflow-y-auto space-y-4 pr-1" style={{ maxHeight: '60vh' }}>
            {!activeThread && messages.length === 0 && (
              <div className="text-center text-neutral-500 py-12">
                <Sparkles className="h-8 w-8 mx-auto text-amber-400/60" />
                <p className="mt-3 text-sm">Escribe abajo para iniciar una conversación.</p>
                <div className="mt-6 grid gap-2 max-w-md mx-auto text-left">
                  {(PRESETS.find((p) => p.key === presetKey)?.defaultSuggestions ?? []).map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setInput(sug)}
                      className="rounded-xl border border-neutral-800 hover:border-amber-500/40 px-3 py-2 text-xs text-neutral-300"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {loading && (
              <div className="text-center text-neutral-500 py-6 text-sm">
                <Loader2 className="h-4 w-4 inline animate-spin" /> Cargando…
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words border ${
                    m.role === 'user'
                      ? 'bg-amber-500/10 border-amber-500/30 text-neutral-100'
                      : 'bg-neutral-950/70 border-neutral-800 text-neutral-200'
                  }`}
                >
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {m.attachments.map((a, idx) => {
                        // Adjunto de archivo del repo
                        if ((a as ImageAttachment).type !== 'image') {
                          const fa = a as FileAttachment;
                          return (
                            <span
                              key={`f-${fa.path}-${idx}`}
                              className="inline-flex items-center gap-1 rounded-full bg-neutral-900 border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-300"
                            >
                              <FileCode2 className="h-3 w-3" /> {fa.path}
                            </span>
                          );
                        }
                        // Adjunto de imagen
                        const ia = a as ImageAttachment;
                        const src = ia.cloudinary_url || ia.dataUrl;
                        return (
                          <div
                            key={`img-${idx}`}
                            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="generada" className="w-full max-h-[420px] object-contain bg-black/40" />
                            <div className="flex flex-wrap items-center gap-2 px-2 py-1.5 text-[11px]">
                              <a
                                href={ia.dataUrl}
                                download={`ai-image-${m.id}-${idx}.${mimeToExt(ia.mimeType)}`}
                                className="inline-flex items-center gap-1 text-neutral-300 hover:text-amber-400"
                              >
                                <Download className="h-3 w-3" /> descargar
                              </a>
                              {ia.cloudinary_url ? (
                                <>
                                  <span className="inline-flex items-center gap-1 text-emerald-400">
                                    <CheckCircle2 className="h-3 w-3" /> en Cloudinary
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => { void navigator.clipboard.writeText(ia.cloudinary_url!); }}
                                    className="inline-flex items-center gap-1 text-neutral-300 hover:text-amber-400"
                                  >
                                    <Copy className="h-3 w-3" /> copiar URL
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  disabled={ia.uploading}
                                  onClick={() => void uploadToCloudinary(ia, m.id, idx)}
                                  className="inline-flex items-center gap-1 text-neutral-300 hover:text-amber-400 disabled:opacity-50"
                                >
                                  {ia.uploading ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <UploadCloud className="h-3 w-3" />
                                  )}
                                  {ia.uploading ? 'subiendo…' : 'guardar en Cloudinary'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {m.content}
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-neutral-500">
                    <span>{new Date(m.created_at).toLocaleTimeString('es-CL')}</span>
                    {m.tokens_in != null && <span>· {m.tokens_in}↑/{m.tokens_out ?? 0}↓ tokens</span>}
                    {m.role === 'assistant' && (
                      <button
                        type="button"
                        onClick={() => copyMessage(m.content)}
                        className="inline-flex items-center gap-1 hover:text-amber-400"
                      >
                        <Copy className="h-3 w-3" /> copiar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-3">
                <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-neutral-950/70 border border-neutral-800 text-sm text-neutral-400">
                  <Loader2 className="h-3.5 w-3.5 inline animate-spin" /> Pensando…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* COMPOSER */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (imageMode) void handleGenerateImage();
              else void handleSend();
            }}
            className="mt-3 border-t border-neutral-800 pt-3 space-y-2"
          >
            {/* Mini barra de salud del modelo activo */}
            {(() => {
              const s = modelId ? statsByModel.get(modelId) : null;
              if (!s) return null;
              const tone = s.health === 'working' ? 'text-emerald-400' : s.health === 'flaky' ? 'text-amber-400' : s.health === 'down' ? 'text-red-400' : 'text-neutral-500';
              const dot = s.health === 'working' ? '🟢' : s.health === 'flaky' ? '🟡' : s.health === 'down' ? '🔴' : '⚪';
              return (
                <div className="flex items-center justify-between text-[10px] text-neutral-500 px-1">
                  <span>
                    Modelo activo: <code className="text-neutral-400">{modelId}</code>{' '}
                    <span className={tone}>· {dot} {(s.avg_latency_ms / 1000).toFixed(1)} s media · {Math.round(s.success_rate * 100)}% OK</span>
                    <span className="text-neutral-600"> · {s.calls} calls</span>
                  </span>
                </div>
              );
            })()}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {attachments.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] text-amber-200"
                  >
                    <FileCode2 className="h-3 w-3" /> {a}
                    <button
                      type="button"
                      onClick={() => setAttachments((arr) => arr.filter((x) => x !== a))}
                      className="hover:text-red-300"
                      aria-label="Quitar"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {!imageMode && (
              <div className="flex items-center gap-2">
                <input
                  value={attachmentDraft}
                  onChange={(e) => setAttachmentDraft(e.target.value)}
                  placeholder="Ruta del repo (ej. src/lib/openrouter.ts)"
                  className="flex-1 rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addAttachment();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addAttachment}
                  className="inline-flex items-center gap-1 rounded-full border border-neutral-700 hover:border-amber-500/50 px-3 py-1.5 text-xs text-neutral-300"
                  title="Adjuntar archivo del repo (whitelist: src/, scripts/, docs/, public/)"
                >
                  <Paperclip className="h-3 w-3" /> Adjuntar
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => setImageMode((v) => !v)}
                className={`inline-flex items-center justify-center rounded-full border px-3 py-2.5 text-xs ${
                  imageMode
                    ? 'border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-300'
                    : 'border-neutral-700 hover:border-fuchsia-500/40 text-neutral-300'
                }`}
                title="Alternar modo imagen (genera imágenes en vez de texto)"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  imageMode
                    ? '🖼️ Describe la imagen que quieres generar… (Shift+Enter = nueva línea)'
                    : 'Escribe tu mensaje… (Shift+Enter = nueva línea)'
                }
                rows={2}
                className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (imageMode) void handleGenerateImage();
                    else void handleSend();
                  }
                }}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 disabled:opacity-50 ${
                  imageMode
                    ? 'bg-fuchsia-500 hover:bg-fuchsia-400 text-neutral-950'
                    : 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
                }`}
                title={imageMode ? 'Generar imagen (Enter)' : 'Enviar (Enter)'}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </AdminCard>

        {/* PANEL DERECHO: PRESETS + MODELO */}
        <AdminCard className="space-y-4 lg:sticky lg:top-4 self-start">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Modo
            </h3>
            <div className="grid gap-1.5">
              {PRESETS.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p.key)}
                    className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${
                      presetKey === p.key
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    <p className="text-sm font-medium text-neutral-200 inline-flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" /> {p.label}
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">{p.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 mb-2">
              <Settings2 className="h-3.5 w-3.5 text-amber-400" /> Modelo
            </h3>
            <button
              type="button"
              onClick={() => setShowModels((v) => !v)}
              className="w-full rounded-lg border border-neutral-800 hover:border-neutral-600 px-3 py-2 text-left"
            >
              <p className="text-xs font-medium text-neutral-200 truncate flex items-center gap-1.5">
                {currentModelInfo?.isFree && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-px text-[9px] font-bold">
                    <Zap className="h-2.5 w-2.5" /> GRATIS
                  </span>
                )}
                {currentModelInfo?.name ?? modelId ?? 'Elegir modelo'}
              </p>
              {currentModelInfo && (
                <p className="text-[10px] text-neutral-500 mt-0.5 line-clamp-2">{currentModelInfo.description ?? '—'}</p>
              )}
            </button>

            {showModels && (
              <div className="mt-2 rounded-xl border border-neutral-800 bg-neutral-950 p-2 space-y-2 max-h-[50vh] overflow-y-auto">
                <input
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="Buscar modelo…"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-xs"
                />
                <div className="flex items-center justify-between text-xs gap-2">
                  <div className="inline-flex rounded-full border border-neutral-800 overflow-hidden">
                    {(['free', 'free+cheap', 'all'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setModelFilter(opt)}
                        className={`px-2 py-1 text-[10px] ${
                          modelFilter === opt ? 'bg-amber-500/15 text-amber-300' : 'text-neutral-400 hover:bg-neutral-900'
                        }`}
                        title={
                          opt === 'free'
                            ? 'Solo modelos gratuitos'
                            : opt === 'free+cheap'
                              ? 'Gratis + de pago barato (≤ $0.5/1M tokens)'
                              : 'Todos los modelos'
                        }
                      >
                        {opt === 'free' ? 'Gratis' : opt === 'free+cheap' ? '+Pago barato' : 'Todos'}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadModels(true)}
                    className="text-amber-400 hover:underline inline-flex items-center gap-1"
                    disabled={modelsLoading}
                  >
                    <RefreshCcw className={`h-3 w-3 ${modelsLoading ? 'animate-spin' : ''}`} /> refrescar
                  </button>
                </div>

                {modelsLoading && <p className="text-xs text-neutral-500 py-2 text-center">Cargando…</p>}
                {!modelsLoading && !models && (
                  <p className="text-xs text-neutral-500 py-2 text-center">
                    No se pudo cargar la lista. Verifica que OpenRouter esté configurado en{' '}
                    <a href="/admin/integraciones" className="text-amber-400 hover:underline">/admin/integraciones</a>.
                  </p>
                )}

                {filteredFree.length > 0 && (
                  <ModelGroup
                    label="Gratuitos"
                    items={filteredFree}
                    active={modelId}
                    statsByModel={statsByModel}
                    onPick={(id) => { setModelId(id); setShowModels(false); }}
                  />
                )}
                {modelFilter !== 'free' && filteredPaid.length > 0 && (
                  <ModelGroup
                    label="De pago"
                    items={filteredPaid}
                    active={modelId}
                    statsByModel={statsByModel}
                    onPick={(id) => {
                      const m = filteredPaid.find((x) => x.id === id);
                      if (m) {
                        const max = Math.max(m.pricing.prompt, m.pricing.completion);
                        const pricePerMillion = (max * 1_000_000).toFixed(3);
                        const ok = confirm(
                          `Vas a usar un modelo de pago.\n\n` +
                            `${m.name}\n` +
                            `Costo aprox.: $${pricePerMillion} USD por 1M tokens\n\n` +
                            `¿Confirmas que quieres seleccionarlo?`,
                        );
                        if (!ok) return;
                      }
                      setModelId(id);
                      setShowModels(false);
                    }}
                  />
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={allowPaid}
                onChange={(e) => setAllowPaid(e.target.checked)}
              />
              <span>Permitir <strong>fallback de pago</strong></span>
            </label>
            <p className="text-[10px] text-neutral-500 -mt-1.5 pl-5 leading-snug">
              Si todos los modelos gratis fallan, se intenta con modelos de pago baratos (≤ $0.5/1M tokens).
            </p>
            <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSaveCloudinary}
                onChange={(e) => setAutoSaveCloudinary(e.target.checked)}
              />
              <span>Subir imágenes a <strong>Cloudinary</strong> automáticamente</span>
            </label>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowStats((v) => !v)}
              className="w-full text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-amber-300 inline-flex items-center justify-between"
            >
              <span className="inline-flex items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5 text-amber-400" /> Rendimiento de modelos
              </span>
              <span className="text-[10px] text-neutral-500">{showStats ? 'ocultar' : 'mostrar'}</span>
            </button>
            {showStats && (
              <div className="mt-2 rounded-xl border border-neutral-800 bg-neutral-950 p-2">
                <ModelPerformanceChart onStatsChange={setModelStats} />
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">System prompt</h3>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-2 text-[11px] font-mono"
            />
            <p className="text-[10px] text-neutral-500 mt-1">Se envía como contexto al inicio de cada nueva conversación.</p>
          </div>
        </AdminCard>
      </div>
    </AdminPage>
  );
}

function ModelGroup({
  label,
  items,
  active,
  statsByModel,
  onPick,
}: {
  label: string;
  items: ModelInfo[];
  active: string;
  statsByModel: Map<string, ModelStats>;
  onPick: (id: string) => void;
}) {
  const healthEmoji: Record<ModelHealth, string> = {
    working: '✅',
    flaky: '⚠️',
    down: '🛑',
    unknown: '·',
  };
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-neutral-500 px-1 pt-1">{label}</p>
      <div className="space-y-0.5">
        {items.map((m) => {
          const s = statsByModel.get(m.id);
          const health: ModelHealth = s?.health ?? 'unknown';
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onPick(m.id)}
              className={`w-full text-left rounded-md px-2 py-1.5 text-[11px] border ${
                active === m.id ? 'border-amber-500/40 bg-amber-500/5' : 'border-transparent hover:bg-neutral-900'
              }`}
              title={
                s
                  ? `${Math.round(s.success_rate * 100)}% éxito · ${s.avg_latency_ms} ms · ${s.calls} calls`
                  : 'Sin datos de uso aún'
              }
            >
              <p className="text-neutral-200 truncate flex items-center gap-1">
                <span aria-hidden>{healthEmoji[health]}</span>
                {m.isFree && <Zap className="h-2.5 w-2.5 text-emerald-400" />}
                {m.name}
                {s && s.calls > 0 && (
                  <span className="ml-auto text-[9px] text-neutral-500">{s.avg_latency_ms} ms</span>
                )}
              </p>
              <p className="text-[10px] text-neutral-500 truncate">{m.id}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

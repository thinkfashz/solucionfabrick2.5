'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Code2,
  Copy,
  FileCode2,
  HelpCircle,
  Loader2,
  MessageSquarePlus,
  Paperclip,
  RefreshCcw,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader } from '@/components/admin/ui';

interface Thread {
  id: string;
  title: string;
  model: string | null;
  system_prompt: string | null;
  preset_key: string | null;
  updated_at: string;
}

interface Message {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  attachments: Array<{ path: string; bytes: number; truncated: boolean }> | null;
  created_at: string;
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
  const [showOnlyFree, setShowOnlyFree] = useState(true);
  const [modelSearch, setModelSearch] = useState('');
  const [showModels, setShowModels] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    void loadThreads();
    void loadModels(false);
  }, [loadThreads, loadModels]);

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
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Error');
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

  const filteredFree = useMemo(() => {
    if (!models) return [];
    const q = modelSearch.trim().toLowerCase();
    return models.free.filter((m) => !q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)).slice(0, 60);
  }, [models, modelSearch]);
  const filteredPaid = useMemo(() => {
    if (!models) return [];
    const q = modelSearch.trim().toLowerCase();
    return models.paid.filter((m) => !q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)).slice(0, 60);
  }, [models, modelSearch]);

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
                    <div className="mb-2 flex flex-wrap gap-1">
                      {m.attachments.map((a) => (
                        <span
                          key={a.path}
                          className="inline-flex items-center gap-1 rounded-full bg-neutral-900 border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-300"
                        >
                          <FileCode2 className="h-3 w-3" /> {a.path}
                        </span>
                      ))}
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
          <form onSubmit={handleSend} className="mt-3 border-t border-neutral-800 pt-3 space-y-2">
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
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu mensaje… (Shift+Enter = nueva línea)"
                rows={2}
                className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="inline-flex items-center justify-center rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-950 px-4 py-2.5 disabled:opacity-50"
                title="Enviar (Enter)"
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
                <div className="flex items-center justify-between text-xs">
                  <label className="inline-flex items-center gap-1.5">
                    <input type="checkbox" checked={showOnlyFree} onChange={(e) => setShowOnlyFree(e.target.checked)} />
                    Solo gratis
                  </label>
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
                  <ModelGroup label="Gratuitos" items={filteredFree} active={modelId} onPick={(id) => { setModelId(id); setShowModels(false); }} />
                )}
                {!showOnlyFree && filteredPaid.length > 0 && (
                  <ModelGroup label="De pago" items={filteredPaid} active={modelId} onPick={(id) => { setModelId(id); setShowModels(false); }} />
                )}
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
  onPick,
}: {
  label: string;
  items: ModelInfo[];
  active: string;
  onPick: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-neutral-500 px-1 pt-1">{label}</p>
      <div className="space-y-0.5">
        {items.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onPick(m.id)}
            className={`w-full text-left rounded-md px-2 py-1.5 text-[11px] border ${
              active === m.id ? 'border-amber-500/40 bg-amber-500/5' : 'border-transparent hover:bg-neutral-900'
            }`}
          >
            <p className="text-neutral-200 truncate flex items-center gap-1">
              {m.isFree && <Zap className="h-2.5 w-2.5 text-emerald-400" />}
              {m.name}
            </p>
            <p className="text-[10px] text-neutral-500 truncate">{m.id}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Activity,
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronRight,
  CornerDownLeft,
  ExternalLink,
  Loader2,
  Paperclip,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react';
import { AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface ModelEntry {
  id: string;
  name: string;
  free: boolean;
  contextLength?: number;
  description?: string;
}

interface ProviderResult {
  id: string;
  label: string;
  configured: boolean;
  error?: string;
  models: ModelEntry[];
}

type TestStatus = 'idle' | 'testing' | 'ok' | 'error';

interface ModelTest {
  status: TestStatus;
  latency?: number;
  response?: string;
  error?: string;
  errorType?: string;
}

interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

interface ApiMessage {
  role: 'user' | 'assistant';
  content: string | ContentPart[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  tokens?: { input: number; output: number };
  streaming?: boolean;
  error?: string;
  errorType?: string;
}

type SseEvent =
  | { type: 'chunk'; text: string }
  | { type: 'usage'; tokens: { input: number; output: number; total: number } }
  | { type: 'error'; message: string; errorType: string }
  | { type: 'done' };

/* ─── Constants ─────────────────────────────────────────────────────────── */

const ERROR_LABELS: Record<string, { label: string; color: string }> = {
  auth:       { label: 'Clave inválida',  color: 'text-red-400    border-red-500/30    bg-red-900/20' },
  credits:    { label: 'Sin créditos',    color: 'text-orange-400 border-orange-500/30 bg-orange-900/20' },
  ratelimit:  { label: 'Rate limit',      color: 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20' },
  not_found:  { label: 'No disponible',   color: 'text-zinc-400   border-zinc-600/30   bg-zinc-800/20' },
  overloaded: { label: 'Sobrecargado',    color: 'text-amber-400  border-amber-500/30  bg-amber-900/20' },
  server:     { label: 'Error servidor',  color: 'text-red-400    border-red-500/30    bg-red-900/20' },
  timeout:    { label: 'Timeout',         color: 'text-amber-400  border-amber-500/30  bg-amber-900/20' },
  no_key:     { label: 'Sin API key',     color: 'text-zinc-500   border-zinc-600/30   bg-zinc-800/20' },
  other:      { label: 'Error',           color: 'text-red-400    border-red-500/30    bg-red-900/20' },
};

const PROVIDER_COLORS: Record<string, string> = {
  openrouter: 'text-violet-300 border-violet-500/30 bg-violet-900/20',
  groq:       'text-emerald-300 border-emerald-500/30 bg-emerald-900/20',
  anthropic:  'text-orange-300 border-orange-500/30 bg-orange-900/20',
  openai:     'text-blue-300 border-blue-500/30 bg-blue-900/20',
  gemini:     'text-cyan-300 border-cyan-500/30 bg-cyan-900/20',
  grok:       'text-purple-300 border-purple-500/30 bg-purple-900/20',
};

const PROVIDER_LABELS: Record<string, string> = {
  openrouter: 'OpenRouter',
  groq:       'Groq',
  anthropic:  'Anthropic',
  openai:     'OpenAI',
  gemini:     'Gemini',
  grok:       'Grok (xAI)',
};

const PROVIDER_DOT_COLORS: Record<string, string> = {
  openrouter: 'bg-violet-400',
  groq:       'bg-emerald-400',
  anthropic:  'bg-orange-400',
  openai:     'bg-blue-400',
  gemini:     'bg-cyan-400',
  grok:       'bg-purple-400',
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function providerDotStatus(p: ProviderResult): 'green' | 'red' | 'amber' {
  if (!p.configured) return 'red';
  if (p.error) return 'amber';
  if (p.models.length > 0) return 'green';
  return 'amber';
}

function formatCtx(n?: number): string {
  if (!n) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ctx`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K ctx`;
  return `${n} ctx`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('es-ES');
}

function parseModelValue(value: string): { provider: string; modelo: string } {
  const idx = value.indexOf(':');
  if (idx === -1) return { provider: value, modelo: value };
  return { provider: value.slice(0, idx), modelo: value.slice(idx + 1) };
}

function buildApiMessages(msgs: ChatMessage[]): ApiMessage[] {
  return msgs.map((m) => {
    if (m.role === 'user' && m.imageUrl) {
      return {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: m.content || 'Analiza esta imagen.' },
          { type: 'image_url' as const, image_url: { url: m.imageUrl } },
        ],
      };
    }
    return { role: m.role, content: m.content };
  });
}

/* ─── Semaphore for concurrency control ─────────────────────────────────── */

function createSemaphore(limit: number) {
  let active = 0;
  const queue: (() => void)[] = [];

  function next() {
    if (queue.length > 0 && active < limit) {
      active++;
      const resolve = queue.shift()!;
      resolve();
    }
  }

  return async function acquire(): Promise<() => void> {
    if (active < limit) {
      active++;
      return () => { active--; next(); };
    }
    return new Promise((resolve) => {
      queue.push(() => {
        resolve(() => { active--; next(); });
      });
    });
  };
}

/* ─── Chat Tab Component ─────────────────────────────────────────────────── */

interface ChatTabProps {
  providers: ProviderResult[];
  onLoadModels: () => Promise<void>;
  loading: boolean;
}

function ChatTab({ providers, onLoadModels, loading }: ChatTabProps) {
  const [chatModel, setChatModel] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [attached, setAttached] = useState<{ dataUrl: string; mimeType: string } | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [totalTokens, setTotalTokens] = useState({ input: 0, output: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Build flat model options
  const modelOptions = providers
    .filter((p) => p.configured && p.models.length > 0)
    .flatMap((p) =>
      p.models.map((m) => ({
        value: `${p.id}:${m.id}`,
        label: m.id,
        provider: p.id,
        providerLabel: PROVIDER_LABELS[p.id] ?? p.label,
        contextLength: m.contextLength,
      })),
    );

  // Set default model on first load
  useEffect(() => {
    if (!chatModel && modelOptions.length > 0) {
      setChatModel(modelOptions[0].value);
    }
  }, [modelOptions, chatModel]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages]);

  const selectedOption = modelOptions.find((o) => o.value === chatModel);

  async function sendMessage() {
    if (!input.trim() && !attached) return;
    if (streaming) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      imageUrl: attached?.dataUrl,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setAttached(null);
    setStreaming(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', streaming: true },
    ]);

    const apiMessages = buildApiMessages([...messages, userMsg]);
    const { provider, modelo } = parseModelValue(chatModel);

    try {
      const res = await fetch('/api/admin/modelos-ia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, modelo, messages: apiMessages }),
      });

      if (!res.body) throw new Error('No stream body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let usage = { input: 0, output: 0 };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6);
          try {
            const event = JSON.parse(json) as SseEvent;
            if (event.type === 'chunk' && event.text) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + event.text } : m,
                ),
              );
            } else if (event.type === 'usage' && event.tokens) {
              usage = { input: event.tokens.input, output: event.tokens.output };
            } else if (event.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, error: event.message, errorType: event.errorType, streaming: false }
                    : m,
                ),
              );
            } else if (event.type === 'done') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, streaming: false, tokens: usage }
                    : m,
                ),
              );
              if (usage.input > 0 || usage.output > 0) {
                setTotalTokens((prev) => ({
                  input: prev.input + usage.input,
                  output: prev.output + usage.output,
                }));
              }
            }
          } catch { /* ignore parse error */ }
        }
      }
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, streaming: false, error: (e as Error).message, errorType: 'other' }
            : m,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void sendMessage();
    }
  }

  function clearChat() {
    setMessages([]);
    setTotalTokens({ input: 0, output: 0 });
    setAttached(null);
    setInput('');
  }

  const hasModels = modelOptions.length > 0;
  const totalAll = totalTokens.input + totalTokens.output;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Model selector bar ── */}
      <AdminMotion>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 px-4 py-3">
          <Bot className="h-4 w-4 shrink-0 text-amber-400" />
          {!hasModels ? (
            <div className="flex flex-1 items-center gap-3">
              <span className="text-xs text-zinc-400">Carga los modelos primero</span>
              <button
                onClick={() => void onLoadModels()}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Cargar modelos
              </button>
            </div>
          ) : (
            <>
              <select
                value={chatModel}
                onChange={(e) => setChatModel(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
              >
                {providers
                  .filter((p) => p.configured && p.models.length > 0)
                  .map((p) => (
                    <optgroup key={p.id} label={PROVIDER_LABELS[p.id] ?? p.label}>
                      {p.models.map((m) => (
                        <option key={`${p.id}:${m.id}`} value={`${p.id}:${m.id}`}>
                          {m.id}
                          {m.contextLength ? ` · ${formatCtx(m.contextLength)}` : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
              </select>

              {selectedOption && (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold shrink-0 ${PROVIDER_COLORS[selectedOption.provider] ?? 'text-zinc-300 border-zinc-600/30 bg-zinc-800/20'}`}
                >
                  {selectedOption.providerLabel}
                </span>
              )}

              <button
                onClick={clearChat}
                disabled={messages.length === 0}
                title="Limpiar chat"
                className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-bold text-zinc-400 transition hover:border-zinc-500 hover:text-white disabled:opacity-30"
              >
                <Trash2 className="h-3 w-3" />
                Limpiar
              </button>
            </>
          )}
        </div>
      </AdminMotion>

      {/* ── Token counter ── */}
      {(totalTokens.input > 0 || totalTokens.output > 0) && (
        <AdminMotion>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.06] bg-zinc-900/40 px-4 py-2 text-[11px] text-zinc-500">
            <span>Sesión:</span>
            <span>
              <span className="font-mono text-amber-400">{formatNumber(totalTokens.input)}</span>
              {' '}tokens entrada
            </span>
            <span className="text-zinc-700">·</span>
            <span>
              <span className="font-mono text-amber-400">{formatNumber(totalTokens.output)}</span>
              {' '}salida
            </span>
            <span className="text-zinc-700">·</span>
            <span>
              <span className="font-mono text-amber-300 font-bold">{formatNumber(totalAll)}</span>
              {' '}total
            </span>
            {selectedOption?.contextLength && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="text-zinc-600">
                  Límite ctx: <span className="font-mono">{formatCtx(selectedOption.contextLength)}</span>
                </span>
              </>
            )}
          </div>
        </AdminMotion>
      )}

      {/* ── Messages area ── */}
      <AdminMotion>
        <div className="flex flex-col gap-2 min-h-[320px] max-h-[520px] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-zinc-600">
              <Sparkles className="h-8 w-8 opacity-30" />
              <p className="text-sm font-bold">Chat con el modelo IA</p>
              <p className="text-xs">
                {hasModels
                  ? 'Escribe un mensaje para comenzar (Ctrl+Enter para enviar)'
                  : 'Carga los modelos primero para chatear'}
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full mt-1 ${msg.role === 'user' ? 'bg-amber-500/20' : 'bg-zinc-700/60'}`}>
                  {msg.role === 'user' ? (
                    <User className="h-3.5 w-3.5 text-amber-400" />
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-zinc-400" />
                  )}
                </div>

                {/* Bubble */}
                <div className={`flex flex-col gap-1 max-w-[78%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Image preview */}
                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="adjunto"
                      className="max-h-40 max-w-xs rounded-xl border border-white/10 object-cover"
                    />
                  )}

                  {/* Content bubble */}
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-zinc-800 text-white rounded-tr-sm'
                        : 'bg-zinc-900/80 text-zinc-100 rounded-tl-sm'
                    }`}
                  >
                    {msg.content || (msg.streaming ? '' : '…')}
                    {msg.streaming && (
                      <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-amber-400 align-middle" />
                    )}
                    {!msg.content && !msg.streaming && msg.error && null}
                  </div>

                  {/* Error badge */}
                  {msg.error && (
                    <div className="flex items-center gap-1.5">
                      {msg.errorType && ERROR_LABELS[msg.errorType] && (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${ERROR_LABELS[msg.errorType].color}`}>
                          {ERROR_LABELS[msg.errorType].label}
                        </span>
                      )}
                      <span className="text-[10px] text-red-400 max-w-[240px] truncate" title={msg.error}>
                        {msg.error}
                      </span>
                    </div>
                  )}

                  {/* Token info */}
                  {msg.tokens && (msg.tokens.input > 0 || msg.tokens.output > 0) && (
                    <p className="text-[10px] text-zinc-700">
                      {formatNumber(msg.tokens.input)} entrada · {formatNumber(msg.tokens.output)} salida
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </AdminMotion>

      {/* ── Input area ── */}
      <AdminMotion>
        <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-zinc-900/60 p-3">
          {/* Image preview */}
          {attached && (
            <div className="relative w-fit">
              <img
                src={attached.dataUrl}
                alt="adjunto"
                className="h-20 rounded-xl border border-white/10 object-cover"
              />
              <button
                onClick={() => setAttached(null)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 border border-zinc-600 text-zinc-300 hover:text-white transition"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* File attach */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  setAttached({ dataUrl: ev.target?.result as string, mimeType: file.type });
                };
                reader.readAsDataURL(file);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming}
              title="Adjuntar imagen"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/60 text-zinc-400 transition hover:border-zinc-500 hover:text-white disabled:opacity-30"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming || !hasModels}
              placeholder={hasModels ? 'Escribe un mensaje… (Ctrl+Enter para enviar)' : 'Carga los modelos primero'}
              rows={2}
              className="flex-1 resize-none rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-400/50 focus:outline-none disabled:opacity-40"
            />

            {/* Send button */}
            <button
              onClick={() => void sendMessage()}
              disabled={streaming || !hasModels || (!input.trim() && !attached)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-black transition hover:bg-amber-400 disabled:opacity-30"
              title="Enviar (Ctrl+Enter)"
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CornerDownLeft className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </AdminMotion>
    </div>
  );
}

/* ─── Component ──────────────────────────────────────────────────────────── */

type MainTab = 'modelos' | 'chat';

export default function ModelosIaPage() {
  const [mainTab, setMainTab] = useState<MainTab>('modelos');
  const [providers, setProviders] = useState<ProviderResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [tests, setTests] = useState<Record<string, ModelTest>>({});
  const [activeProvider, setActiveProvider] = useState<string>('all');
  const [filter, setFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [search, setSearch] = useState('');
  const [testingAll, setTestingAll] = useState(false);

  /* fetch models list */
  const fetchModels = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch('/api/admin/modelos-ia/list', { cache: 'no-store' });
      const json = (await res.json()) as { ok: boolean; providers?: ProviderResult[]; error?: string };
      if (!res.ok || !json.ok) {
        setFetchError(json.error ?? 'Error al obtener modelos.');
        return;
      }
      setProviders(json.providers ?? []);
    } catch {
      setFetchError('Error de red al obtener modelos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchModels(); }, [fetchModels]);

  /* test one model */
  const testModel = useCallback(async (provider: string, modelo: string) => {
    const key = `${provider}:${modelo}`;
    setTests((prev) => ({ ...prev, [key]: { status: 'testing' } }));
    try {
      const res = await fetch('/api/admin/modelos-ia/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, modelo }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        latency_ms?: number;
        response?: string;
        error?: string;
        errorType?: string;
      };
      if (json.ok) {
        setTests((prev) => ({
          ...prev,
          [key]: { status: 'ok', latency: json.latency_ms, response: json.response },
        }));
      } else {
        setTests((prev) => ({
          ...prev,
          [key]: { status: 'error', latency: json.latency_ms, error: json.error, errorType: json.errorType },
        }));
      }
    } catch {
      setTests((prev) => ({ ...prev, [key]: { status: 'error', error: 'Error de red' } }));
    }
  }, []);

  /* test all visible */
  const testAllVisible = useCallback(async () => {
    const visibleModels: { provider: string; modelo: string }[] = [];
    for (const p of providers) {
      if (activeProvider !== 'all' && p.id !== activeProvider) continue;
      for (const m of p.models) {
        if (filter === 'free' && !m.free) continue;
        if (filter === 'paid' && m.free) continue;
        if (search && !m.id.toLowerCase().includes(search.toLowerCase()) && !m.name.toLowerCase().includes(search.toLowerCase())) continue;
        visibleModels.push({ provider: p.id, modelo: m.id });
      }
    }
    if (visibleModels.length === 0) return;
    setTestingAll(true);
    const sem = createSemaphore(5);
    await Promise.allSettled(
      visibleModels.map(async ({ provider, modelo }) => {
        const release = await sem();
        try {
          await testModel(provider, modelo);
        } finally {
          release();
        }
      }),
    );
    setTestingAll(false);
  }, [providers, activeProvider, filter, search, testModel]);

  /* derived: visible models */
  const visibleProviders = providers.filter(
    (p) => activeProvider === 'all' || p.id === activeProvider,
  );

  const visibleModels: { provider: ProviderResult; model: ModelEntry }[] = [];
  for (const p of visibleProviders) {
    for (const m of p.models) {
      if (filter === 'free' && !m.free) continue;
      if (filter === 'paid' && m.free) continue;
      if (
        search &&
        !m.id.toLowerCase().includes(search.toLowerCase()) &&
        !m.name.toLowerCase().includes(search.toLowerCase())
      ) continue;
      visibleModels.push({ provider: p, model: m });
    }
  }

  const totalModels = providers.reduce((s, p) => s + p.models.length, 0);

  // Suppress unused variable warning — kept for potential dot legend usage
  void PROVIDER_DOT_COLORS;

  return (
    <AdminPage>
      {/* ── Header ── */}
      <AdminPageHeader
        eyebrow="IA"
        title="Modelos IA"
        description="Diagnóstico de modelos disponibles — comprueba qué modelos están activos y pruébalos en tiempo real."
        icon={Sparkles}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void fetchModels()}
              disabled={loading}
              className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-xs font-bold text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            {mainTab === 'modelos' && (
              <button
                onClick={() => void testAllVisible()}
                disabled={testingAll || loading || visibleModels.length === 0}
                className="flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-black transition hover:bg-amber-300 disabled:opacity-50"
              >
                {testingAll ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                Testear todos visibles
              </button>
            )}
          </div>
        }
      />

      {/* ── Main tabs ── */}
      <AdminMotion>
        <div className="flex gap-1 rounded-xl bg-white/[0.06] p-1 w-fit">
          {(['modelos', 'chat'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition ${
                mainTab === tab
                  ? 'bg-amber-500 text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab === 'modelos' ? (
                <><Sparkles className="h-3.5 w-3.5" /> Modelos</>
              ) : (
                <><Bot className="h-3.5 w-3.5" /> Chat</>
              )}
            </button>
          ))}
        </div>
      </AdminMotion>

      {/* ── Chat tab ── */}
      {mainTab === 'chat' && (
        <ChatTab
          providers={providers}
          onLoadModels={fetchModels}
          loading={loading}
        />
      )}

      {/* ── Fetch error ── */}
      {fetchError && mainTab === 'modelos' && (
        <AdminMotion>
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {fetchError}
          </div>
        </AdminMotion>
      )}

      {/* ── Loading skeleton ── */}
      {loading && mainTab === 'modelos' && (
        <AdminMotion>
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/50 py-16 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando modelos de todos los proveedores…
          </div>
        </AdminMotion>
      )}

      {!loading && providers.length > 0 && mainTab === 'modelos' && (
        <>
          {/* ── Provider tabs ── */}
          <AdminMotion>
            <div className="flex flex-wrap gap-2">
              {/* All tab */}
              <button
                onClick={() => setActiveProvider('all')}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  activeProvider === 'all'
                    ? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
                    : 'border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                }`}
              >
                <Activity className="h-3 w-3" />
                Todos
                <span className="rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] font-mono text-zinc-300">
                  {totalModels}
                </span>
              </button>

              {providers.map((p) => {
                const dotStatus = providerDotStatus(p);
                const dotColor =
                  dotStatus === 'green'
                    ? 'bg-emerald-400'
                    : dotStatus === 'red'
                    ? 'bg-red-500'
                    : 'bg-amber-400';
                const isActive = activeProvider === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActiveProvider(p.id)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      isActive
                        ? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
                        : 'border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                    {p.label}
                    <span className="rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] font-mono text-zinc-300">
                      {p.models.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </AdminMotion>

          {/* ── Filters + search ── */}
          <AdminMotion>
            <div className="flex flex-wrap items-center gap-3">
              {/* Filter pills */}
              <div className="flex gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/60 p-1">
                {(['all', 'free', 'paid'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                      filter === f
                        ? 'bg-zinc-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {f === 'all' ? 'Todos' : f === 'free' ? 'Gratuitos' : 'De pago'}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar modelo…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-full border border-zinc-700 bg-zinc-800/60 py-2 pl-9 pr-9 text-xs text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <p className="text-xs text-zinc-500">
                {visibleModels.length} modelo{visibleModels.length !== 1 ? 's' : ''}
              </p>
            </div>
          </AdminMotion>

          {/* ── Provider error banners (for non-configured / error providers in selected tab) ── */}
          {visibleProviders
            .filter((p) => !p.configured || p.error)
            .map((p) => (
              <AdminMotion key={`banner-${p.id}`}>
                <div
                  className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
                    !p.configured
                      ? 'border-zinc-700/50 bg-zinc-800/30 text-zinc-400'
                      : 'border-amber-500/30 bg-amber-900/20 text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      <strong>{p.label}</strong>:{' '}
                      {!p.configured
                        ? 'Sin clave API configurada'
                        : `Error al cargar modelos: ${p.error}`}
                    </span>
                  </div>
                  {!p.configured && (
                    <a
                      href="/admin/integraciones"
                      className="flex items-center gap-1 rounded-full border border-zinc-600 bg-zinc-700/60 px-3 py-1 text-xs font-bold text-zinc-300 transition hover:border-zinc-400 hover:text-white"
                    >
                      Configurar <ChevronRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </AdminMotion>
            ))}

          {/* ── Model cards grid ── */}
          {visibleModels.length > 0 ? (
            <AdminMotion>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleModels.map(({ provider: p, model: m }) => {
                  const key = `${p.id}:${m.id}`;
                  const test = tests[key];
                  const providerColor = PROVIDER_COLORS[p.id] ?? 'text-zinc-300 border-zinc-600/30 bg-zinc-800/20';

                  return (
                    <div
                      key={key}
                      className="relative flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-4 transition hover:border-zinc-700"
                    >
                      {/* Not configured overlay */}
                      {!p.configured && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-zinc-950/80 backdrop-blur-sm">
                          <p className="text-xs font-bold text-zinc-400">Sin configurar</p>
                          <a
                            href="/admin/integraciones"
                            className="flex items-center gap-1 rounded-full border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-300 transition hover:border-zinc-400 hover:text-white"
                          >
                            Ir a Integraciones <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}

                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-xs font-bold text-white" title={m.id}>
                            {m.id}
                          </p>
                          {m.name !== m.id && (
                            <p className="mt-0.5 truncate text-[11px] text-zinc-500">{m.name}</p>
                          )}
                        </div>
                      </div>

                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Provider badge */}
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${providerColor}`}>
                          {PROVIDER_LABELS[p.id] ?? p.label}
                        </span>
                        {/* Free / Paid badge */}
                        {m.free ? (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-900/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            GRATIS
                          </span>
                        ) : (
                          <span className="rounded-full border border-zinc-600/30 bg-zinc-800/20 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                            De pago
                          </span>
                        )}
                        {/* Context length */}
                        {m.contextLength ? (
                          <span className="rounded-full border border-zinc-700/30 bg-zinc-800/10 px-2 py-0.5 text-[10px] font-mono text-zinc-500">
                            {formatCtx(m.contextLength)}
                          </span>
                        ) : null}
                      </div>

                      {/* Description */}
                      {m.description && (
                        <p className="line-clamp-1 text-[11px] text-zinc-500">{m.description}</p>
                      )}

                      {/* Test button + result */}
                      <div className="mt-auto flex items-center gap-2">
                        <button
                          onClick={() => void testModel(p.id, m.id)}
                          disabled={!p.configured || test?.status === 'testing'}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold transition disabled:opacity-40 ${
                            test?.status === 'ok'
                              ? 'border-emerald-500/40 bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50'
                              : test?.status === 'error'
                              ? 'border-red-500/40 bg-red-900/30 text-red-300 hover:bg-red-900/50'
                              : 'border-zinc-600 bg-zinc-800/60 text-zinc-300 hover:border-zinc-400 hover:text-white'
                          }`}
                        >
                          {test?.status === 'testing' ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Testeando…
                            </>
                          ) : test?.status === 'ok' ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              ✓ {test.latency}ms
                            </>
                          ) : test?.status === 'error' ? (
                            <>
                              <X className="h-3 w-3" />
                              Reintentar
                            </>
                          ) : (
                            <>
                              <Activity className="h-3 w-3" />
                              Testear
                            </>
                          )}
                        </button>

                        {/* Error type badge */}
                        {test?.status === 'error' && test.errorType && ERROR_LABELS[test.errorType] && (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${ERROR_LABELS[test.errorType].color}`}
                          >
                            {ERROR_LABELS[test.errorType].label}
                          </span>
                        )}

                        {/* Success response preview */}
                        {test?.status === 'ok' && test.response && (
                          <span className="truncate text-[10px] font-mono text-zinc-500" title={test.response}>
                            {test.response}
                          </span>
                        )}
                      </div>

                      {/* Error message */}
                      {test?.status === 'error' && test.error && !ERROR_LABELS[test.errorType ?? ''] && (
                        <p className="text-[10px] text-red-400 line-clamp-1">{test.error}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </AdminMotion>
          ) : (
            !loading && (
              <AdminMotion>
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/30 py-16 text-center">
                  <Search className="h-8 w-8 text-zinc-600" />
                  <p className="text-sm font-bold text-zinc-400">No se encontraron modelos</p>
                  <p className="text-xs text-zinc-600">
                    {search ? 'Intenta con otro término de búsqueda' : 'Ningún proveedor tiene modelos para mostrar con el filtro seleccionado'}
                  </p>
                </div>
              </AdminMotion>
            )
          )}

          {/* ── Provider dot legend ── */}
          <AdminMotion>
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900/30 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Estado</p>
              <div className="flex flex-wrap gap-3 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" />Configurado y funcional</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />Sin API key</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Error al cargar</span>
              </div>
              <a
                href="/admin/integraciones"
                className="ml-auto flex items-center gap-1 text-[11px] text-zinc-500 transition hover:text-zinc-300"
              >
                Gestionar integraciones <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </AdminMotion>
        </>
      )}
    </AdminPage>
  );
}

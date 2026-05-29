'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Bot,
  ChevronLeft,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  TrendingUp,
  Video,
  Wand2,
  X,
} from 'lucide-react';
import { ModelStatusBadge } from '@/components/admin/ModelStatusBadge';

const FALLBACK_FREE = 'meta-llama/llama-3.1-8b-instruct:free';

const COACH_SYSTEM =
  'Eres el Coach de Campañas de Soluciones Fabrick. Analiza campañas de Meta Ads, Google Ads y TikTok Ads. Responde en español de Chile, de forma concisa y accionable. Usa métricas reales (CTR, CPM, CPC, ROAS) cuando las tengas. Si no tienes datos, propón estrategias basadas en mejores prácticas.';

const ACTIONS = [
  { id: 'analyze' as const, label: 'Analizar', description: 'Audita CTR, CPM, CPC y ROAS.', icon: BarChart3, color: 'text-sky-400', bg: 'bg-sky-400/8 border-sky-400/20' },
  { id: 'suggest' as const, label: 'Sugerir creativos', description: 'Copy A/B, CTAs y hashtags.', icon: Wand2, color: 'text-fuchsia-400', bg: 'bg-fuchsia-400/8 border-fuchsia-400/20' },
  { id: 'create' as const, label: 'Generar campaña', description: 'Objetivo, audiencia, presupuesto y copy.', icon: Plus, color: 'text-emerald-400', bg: 'bg-emerald-400/8 border-emerald-400/20' },
  { id: 'optimize' as const, label: 'Optimizar', description: 'Pujas, públicos y horarios.', icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-400/8 border-amber-400/20' },
] as const;

type ActionId = typeof ACTIONS[number]['id'];

interface AgentRun {
  runId: string | null;
  response: Record<string, unknown>;
  applyState?: 'idle' | 'pending' | 'ok' | 'error';
  applyMessage?: string;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
}

function formatAgentResponse(res: Record<string, unknown>): React.ReactNode {
  const kind = res.kind as string | undefined;

  if (kind === 'analysis') {
    const ins = res.insights as Record<string, unknown> | undefined;
    const diag = (res.diagnosis as string[]) ?? [];
    const rec = (res.recommendations as string[]) ?? [];
    return (
      <div className="space-y-3 text-[12px]">
        {ins && (
          <div className="grid grid-cols-3 gap-2">
            {(['ctr', 'cpc', 'roas'] as const).map((key) =>
              ins[key] != null ? (
                <div key={key} className="rounded-xl border border-white/8 bg-white/[0.03] p-2.5 text-center">
                  <p className="text-lg font-black text-white">{String(ins[key])}</p>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-600">{key}</p>
                </div>
              ) : null,
            )}
          </div>
        )}
        {diag.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Diagnóstico</p>
            <div className="space-y-1">
              {diag.map((d, i) => <p key={i} className="flex gap-1.5 text-zinc-300"><span className="mt-px shrink-0 text-amber-400">·</span>{d}</p>)}
            </div>
          </div>
        )}
        {rec.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Recomendaciones</p>
            <div className="space-y-1">
              {rec.map((r, i) => <p key={i} className="flex gap-1.5 text-zinc-300"><span className="mt-px shrink-0 text-emerald-400">✓</span>{r}</p>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (kind === 'suggestions') {
    const copyA = res.copyA as string | undefined;
    const copyB = res.copyB as string | undefined;
    const ctas = (res.ctas as string[]) ?? [];
    const tags = (res.hashtags as string[]) ?? [];
    return (
      <div className="space-y-3 text-[12px]">
        {copyA && (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-sky-400">Copy A</p>
            <p className="text-zinc-200">{copyA}</p>
          </div>
        )}
        {copyB && (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-fuchsia-400">Copy B</p>
            <p className="text-zinc-200">{copyB}</p>
          </div>
        )}
        {ctas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {ctas.map((c, i) => (
              <span key={i} className="rounded-full border border-amber-400/20 bg-amber-400/8 px-2.5 py-1 text-[10px] font-bold text-amber-300">{c}</span>
            ))}
          </div>
        )}
        {tags.length > 0 && (
          <p className="text-zinc-600 text-[10px]">{tags.map((t) => `#${t}`).join(' ')}</p>
        )}
      </div>
    );
  }

  if (kind === 'campaign_draft') {
    const obj = res.objective as string | undefined;
    const aud = res.audience as Record<string, unknown> | undefined;
    const bud = res.budget as Record<string, unknown> | undefined;
    return (
      <div className="space-y-3 text-[12px]">
        {obj && (
          <div>
            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600">Objetivo</p>
            <p className="text-zinc-200">{obj}</p>
          </div>
        )}
        {aud && (
          <div>
            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600">Audiencia</p>
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-2.5 space-y-1">
              {Object.entries(aud).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="w-20 shrink-0 text-zinc-600">{k}</span>
                  <span className="text-zinc-300">{JSON.stringify(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {bud && (
          <div className="flex gap-3">
            {Object.entries(bud).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-center">
                <p className="font-black text-white">{String(v)}</p>
                <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-600">{k}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (kind === 'optimizations') {
    const opts = (res.optimizations as string[]) ?? [];
    return (
      <div className="space-y-1 text-[12px]">
        {opts.map((o, i) => (
          <p key={i} className="flex gap-1.5 text-zinc-300"><span className="mt-px shrink-0 text-emerald-400">→</span>{o}</p>
        ))}
      </div>
    );
  }

  return (
    <pre className="overflow-x-auto text-[10px] text-zinc-500 whitespace-pre-wrap">
      {JSON.stringify(res, null, 2)}
    </pre>
  );
}

export default function AdsCoachClient() {
  const [selectedAction, setSelectedAction] = useState<ActionId | null>(null);
  const [agentRunning, setAgentRunning] = useState(false);
  const [run, setRun] = useState<AgentRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatThreadId, setChatThreadId] = useState<string | null>(null);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatSending]);

  const actionMeta = selectedAction ? ACTIONS.find((a) => a.id === selectedAction) : null;

  async function runAction() {
    if (!selectedAction || agentRunning) return;
    setAgentRunning(true);
    setRun(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/ads/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: selectedAction }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((json?.error as string | undefined) || 'Error inesperado.');
        return;
      }
      setRun({
        runId: typeof json.runId === 'string' ? json.runId : null,
        response: (json.response ?? {}) as Record<string, unknown>,
        applyState: 'idle',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setAgentRunning(false);
    }
  }

  async function applyRun() {
    if (!run?.runId) return;
    setRun((prev) => (prev ? { ...prev, applyState: 'pending' } : prev));
    try {
      const res = await fetch(`/api/admin/ads/agent/${encodeURIComponent(run.runId)}/apply`, { method: 'POST' });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; result?: Record<string, unknown> };
      if (!res.ok || !json.ok) {
        setRun((prev) => prev ? { ...prev, applyState: 'error', applyMessage: json.error || `Error ${res.status}` } : prev);
        return;
      }
      const note = typeof json.result?.note === 'string' ? json.result.note : '';
      setRun((prev) => prev ? { ...prev, applyState: 'ok', applyMessage: note || 'Aplicado.' } : prev);
    } catch (err) {
      setRun((prev) => prev ? { ...prev, applyState: 'error', applyMessage: err instanceof Error ? err.message : 'Error.' } : prev);
    }
  }

  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatSending) return;
    setChatInput('');
    setChatSending(true);
    setChatError(null);
    setChatMessages((prev) => [...prev, { role: 'user', content: text }]);

    try {
      let threadId = chatThreadId;
      if (!threadId) {
        const tr = await fetch('/api/admin/ai-chat/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: text.slice(0, 60),
            model: FALLBACK_FREE,
            system_prompt: COACH_SYSTEM,
            preset_key: 'ads_coach',
          }),
        });
        const tj = await tr.json();
        if (!tr.ok) throw new Error(tj?.error ?? 'Error creando hilo');
        threadId = tj.thread.id as string;
        setChatThreadId(threadId);
      }

      const cr = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          model: FALLBACK_FREE,
          user_message: text,
          system_prompt: COACH_SYSTEM,
          allow_paid: false,
        }),
      });
      const cj = await cr.json();
      if (!cr.ok) throw new Error(cj?.error ?? 'Error');
      setChatMessages((prev) => [...prev, { role: 'assistant', content: cj.answer as string, model: cj.model as string }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Error enviando mensaje.');
      setChatMessages((prev) => prev.slice(0, -1));
    } finally {
      setChatSending(false);
    }
  }, [chatInput, chatSending, chatThreadId]);

  const responseKind = run?.response?.kind as string | undefined;
  const canApply = Boolean(run?.runId) && responseKind !== 'analysis';

  return (
    <div className="space-y-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 border-b border-white/8 bg-black/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400/20 to-amber-600/10 text-yellow-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[13px] font-black tracking-tight text-white">Coach de campañas</p>
            <ModelStatusBadge showDetail />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/integraciones"
            className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-zinc-400 transition hover:bg-white/10 sm:flex"
          >
            Credenciales IA
          </Link>
          <Link
            href="/admin/video-engine"
            className="hidden items-center gap-1.5 rounded-full border border-yellow-400/25 bg-yellow-400/8 px-3 py-1.5 text-[10px] font-bold text-yellow-300 transition hover:bg-yellow-400/15 sm:flex"
          >
            <Video className="h-3 w-3" /> Video Studio
          </Link>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_360px] lg:divide-x lg:divide-white/8">
        {/* ── LEFT: Actions ── */}
        <div className="p-4 space-y-4">
          {/* Action grid or detail */}
          {!selectedAction ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => { setSelectedAction(a.id); setRun(null); setError(null); }}
                    className={`group flex items-start gap-3 rounded-2xl border p-4 text-left transition hover:border-white/15 ${a.bg}`}
                  >
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30 ${a.color}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-[13px] font-bold text-white">{a.label}</span>
                      <span className="block text-[11px] text-zinc-500 mt-0.5">{a.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Back + title */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setSelectedAction(null); setRun(null); setError(null); }}
                  className="flex items-center gap-1 rounded-full border border-white/8 px-2.5 py-1 text-[10px] text-zinc-500 transition hover:border-white/15 hover:text-zinc-300"
                >
                  <ChevronLeft className="h-3 w-3" /> Volver
                </button>
                {actionMeta && (
                  <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${actionMeta.bg} ${actionMeta.color}`}>
                    <actionMeta.icon className="h-3 w-3" />
                    {actionMeta.label}
                  </div>
                )}
              </div>

              {/* Run button */}
              <button
                type="button"
                onClick={runAction}
                disabled={agentRunning}
                className="flex items-center gap-2 rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-4 py-2.5 text-[11px] font-bold text-yellow-300 transition hover:bg-yellow-400/15 disabled:opacity-50"
              >
                {agentRunning ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Ejecutando…</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5" /> Ejecutar {actionMeta?.label}</>
                )}
              </button>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-500/5 p-3 text-[11px] text-red-300">
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Result */}
              {run && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                    {formatAgentResponse(run.response)}
                  </div>
                  {canApply && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={applyRun}
                        disabled={run.applyState === 'pending' || run.applyState === 'ok'}
                        className="flex items-center gap-1.5 rounded-xl bg-yellow-400 px-4 py-2 text-[11px] font-bold text-black transition hover:bg-yellow-300 disabled:opacity-50"
                      >
                        {run.applyState === 'pending' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {run.applyState === 'ok' ? 'Aplicado' : 'Aplicar'}
                      </button>
                      {run.applyState === 'ok' && run.applyMessage && (
                        <p className="text-[11px] text-emerald-400">{run.applyMessage}</p>
                      )}
                      {run.applyState === 'error' && run.applyMessage && (
                        <p className="text-[11px] text-red-400">{run.applyMessage}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: AI Chat ── */}
        <div className="flex flex-col" style={{ height: 'calc(100vh - 160px)', minHeight: '400px' }}>
          {/* Chat header */}
          <div className="flex shrink-0 items-center gap-2 border-b border-white/8 px-4 py-2.5">
            <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-bold text-zinc-300">Preguntar al Coach IA</span>
            {chatThreadId && (
              <button
                type="button"
                onClick={() => { setChatMessages([]); setChatThreadId(null); }}
                title="Nueva conversación"
                className="ml-auto text-zinc-700 hover:text-zinc-400"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 p-4">
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/15 bg-amber-400/8">
                  <Bot className="h-6 w-6 text-amber-400" />
                </div>
                <p className="text-[12px] font-semibold text-zinc-400">Pregunta sobre tus campañas</p>
                <div className="mt-2 space-y-1.5 w-full max-w-xs">
                  {[
                    '¿Cómo mejorar mi CTR en Meta Ads?',
                    '¿Qué presupuesto recomiendas para empezar?',
                    'Analiza mi estrategia de audiencias',
                  ].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setChatInput(s)}
                      className="w-full rounded-xl border border-white/8 px-3 py-2 text-left text-[11px] text-zinc-500 transition hover:border-amber-400/20 hover:text-zinc-300"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500">
                    <Bot className="h-3 w-3 text-black" />
                  </div>
                )}
                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-[12px] leading-relaxed ${
                    m.role === 'user'
                      ? 'rounded-br-sm border border-amber-500/20 bg-amber-500/10 text-zinc-200'
                      : 'rounded-bl-sm border border-white/8 bg-white/[0.04] text-zinc-300'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.role === 'assistant' && m.model && (
                    <p className="mt-1.5 text-[10px] text-zinc-700 font-mono">
                      {m.model.split('/')[1]?.replace(':free', '') ?? m.model}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {chatSending && (
              <div className="flex gap-2 justify-start">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500">
                  <Bot className="h-3 w-3 text-black" />
                </div>
                <div className="rounded-2xl rounded-bl-sm border border-white/8 bg-white/[0.04] px-4 py-3">
                  <span className="flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat error */}
          {chatError && (
            <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/5 px-3 py-2 text-[11px] text-red-300">
              <X className="h-3 w-3 shrink-0" /> {chatError}
            </div>
          )}

          {/* Composer */}
          <div className="shrink-0 border-t border-white/8 p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
              <textarea
                ref={inputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Pregunta sobre tus campañas…"
                rows={2}
                className="flex-1 resize-none bg-transparent text-[12px] text-white outline-none placeholder:text-zinc-700"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendChat();
                  }
                }}
                disabled={chatSending}
              />
              <button
                type="button"
                onClick={() => void sendChat()}
                disabled={chatSending || !chatInput.trim()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-black transition hover:bg-amber-400 disabled:opacity-40"
              >
                {chatSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

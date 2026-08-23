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
  Wand2,
  X,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader } from '@/components/admin/ui';
import { ModelStatusBadge } from '@/components/admin/ModelStatusBadge';

const FALLBACK_FREE = 'meta-llama/llama-3.1-8b-instruct:free';
const COACH_SYSTEM =
  'Eres el Coach de Campañas de Soluciones Fabrick. Analiza campañas de Meta Ads, Google Ads y TikTok Ads. Responde en español de Chile, de forma concisa y accionable. Usa métricas reales (CTR, CPM, CPC, ROAS) cuando las tengas. Si no tienes datos, propón estrategias basadas en mejores prácticas.';

const ACTIONS = [
  { id: 'analyze' as const, label: 'Analizar', description: 'Audita CTR, CPM, CPC y ROAS.', icon: BarChart3 },
  { id: 'suggest' as const, label: 'Sugerir creativos', description: 'Genera copy A/B, CTAs y hashtags.', icon: Wand2 },
  { id: 'create' as const, label: 'Generar campaña', description: 'Define objetivo, audiencia y presupuesto.', icon: Plus },
  { id: 'optimize' as const, label: 'Optimizar', description: 'Revisa pujas, públicos y horarios.', icon: TrendingUp },
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
    const insights = res.insights as Record<string, unknown> | undefined;
    const diagnosis = (res.diagnosis as string[]) ?? [];
    const recommendations = (res.recommendations as string[]) ?? [];
    return (
      <div className="space-y-4 text-sm">
        {insights ? (
          <div className="grid grid-cols-3 divide-x divide-black/8 border-y border-black/8 py-3">
            {(['ctr', 'cpc', 'roas'] as const).map((key) => (
              <div key={key} className="px-3 text-center">
                <strong className="block text-xl font-black text-[#171612]">{insights[key] == null ? '—' : String(insights[key])}</strong>
                <span className="mt-1 block text-[9px] font-black uppercase tracking-[.16em] text-[#9a9286]">{key}</span>
              </div>
            ))}
          </div>
        ) : null}
        {diagnosis.length ? <InsightList title="Diagnóstico" items={diagnosis} /> : null}
        {recommendations.length ? <InsightList title="Recomendaciones" items={recommendations} success /> : null}
      </div>
    );
  }

  if (kind === 'suggestions') {
    const copyA = res.copyA as string | undefined;
    const copyB = res.copyB as string | undefined;
    const ctas = (res.ctas as string[]) ?? [];
    const tags = (res.hashtags as string[]) ?? [];
    return (
      <div className="space-y-3 text-sm text-[#514b42]">
        {copyA ? <CopyBlock label="Copy A" value={copyA} /> : null}
        {copyB ? <CopyBlock label="Copy B" value={copyB} /> : null}
        {ctas.length ? <div className="flex flex-wrap gap-2">{ctas.map((cta) => <span key={cta} className="rounded-full bg-[#ffb000]/10 px-3 py-1 text-xs font-bold text-[#77500a]">{cta}</span>)}</div> : null}
        {tags.length ? <p className="text-xs text-[#8f887c]">{tags.map((tag) => `#${tag}`).join(' ')}</p> : null}
      </div>
    );
  }

  if (kind === 'campaign_draft') {
    const objective = res.objective as string | undefined;
    const audience = res.audience as Record<string, unknown> | undefined;
    const budget = res.budget as Record<string, unknown> | undefined;
    return (
      <div className="space-y-4 text-sm">
        {objective ? <CopyBlock label="Objetivo" value={objective} /> : null}
        {audience ? (
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">Audiencia</p>
            <dl className="divide-y divide-black/8 border-y border-black/8">
              {Object.entries(audience).map(([key, value]) => (
                <div key={key} className="grid gap-1 py-2.5 sm:grid-cols-[120px_1fr]">
                  <dt className="text-xs font-bold text-[#8f887c]">{key}</dt>
                  <dd className="text-sm font-semibold text-[#332f29]">{JSON.stringify(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
        {budget ? <div className="flex flex-wrap gap-4">{Object.entries(budget).map(([key, value]) => <div key={key}><strong className="block text-xl font-black text-[#171612]">{String(value)}</strong><span className="text-[9px] font-black uppercase tracking-[.16em] text-[#9a9286]">{key}</span></div>)}</div> : null}
      </div>
    );
  }

  if (kind === 'optimizations') {
    const optimizations = (res.optimizations as string[]) ?? [];
    return <InsightList title="Optimizaciones" items={optimizations} success />;
  }

  return <pre className="max-h-80 overflow-auto rounded-xl bg-[#171612] p-3 text-xs leading-5 text-[#f3eee4]">{JSON.stringify(res, null, 2)}</pre>;
}

function InsightList({ title, items, success = false }: { title: string; items: string[]; success?: boolean }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">{title}</p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <p key={`${item}-${index}`} className="flex gap-2 text-sm leading-6 text-[#514b42]">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${success ? 'bg-emerald-600' : 'bg-[#c77a00]'}`} />
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-2 border-[#ffb000]/45 pl-3">
      <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">{label}</p>
      <p className="mt-1 leading-6 text-[#403a32]">{value}</p>
    </div>
  );
}

export default function AdsCoachClient() {
  const [selectedAction, setSelectedAction] = useState<ActionId | null>(null);
  const [agentRunning, setAgentRunning] = useState(false);
  const [run, setRun] = useState<AgentRun | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  const actionMeta = selectedAction ? ACTIONS.find((action) => action.id === selectedAction) : null;

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
      setRun({ runId: typeof json.runId === 'string' ? json.runId : null, response: (json.response ?? {}) as Record<string, unknown>, applyState: 'idle' });
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
          body: JSON.stringify({ title: text.slice(0, 60), model: FALLBACK_FREE, system_prompt: COACH_SYSTEM, preset_key: 'ads_coach' }),
        });
        const tj = await tr.json();
        if (!tr.ok) throw new Error(tj?.error ?? 'Error creando hilo');
        threadId = tj.thread.id as string;
        setChatThreadId(threadId);
      }

      const cr = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId, model: FALLBACK_FREE, user_message: text, system_prompt: COACH_SYSTEM, allow_paid: false }),
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
    <AdminPage>
      <AdminPageHeader
        eyebrow="Marketing · Inteligencia"
        title="Coach de campañas"
        description="Analiza rendimiento, genera creativos y conversa con el agente de publicidad desde el mismo sistema visual del administrador."
        icon={Sparkles}
        meta={<ModelStatusBadge showDetail />}
        actions={<Link href="/admin/integraciones" className="inline-flex min-h-10 items-center rounded-xl border border-black/10 bg-white/70 px-4 text-xs font-bold text-[#5f584d] hover:bg-white">Credenciales IA</Link>}
      />

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <AdminCard className="p-0 sm:p-0">
          <div className="border-b border-black/8 p-4 sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">Acciones del agente</p>
            <p className="mt-1 text-sm text-[#716b60]">Selecciona una acción y revisa el resultado antes de aplicarlo.</p>
          </div>

          <div className="p-4 sm:p-5">
            {!selectedAction ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => { setSelectedAction(action.id); setRun(null); setError(null); }}
                      className="group flex items-start gap-3 rounded-xl border border-black/8 bg-white/45 p-4 text-left transition hover:border-[#c77a00]/20 hover:bg-white/80"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#ffb000]/10 text-[#a56600]"><Icon className="h-4 w-4" /></span>
                      <span>
                        <strong className="block text-sm text-[#171612]">{action.label}</strong>
                        <span className="mt-1 block text-xs leading-5 text-[#817a6f]">{action.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button type="button" onClick={() => { setSelectedAction(null); setRun(null); setError(null); }} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#716b60] hover:text-[#171612]"><ChevronLeft className="h-3.5 w-3.5" />Volver</button>
                  {actionMeta ? <span className="rounded-full bg-[#ffb000]/10 px-3 py-1 text-xs font-bold text-[#77500a]">{actionMeta.label}</span> : null}
                </div>

                <button type="button" onClick={() => void runAction()} disabled={agentRunning} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-[#2a2823] disabled:opacity-50">
                  {agentRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {agentRunning ? 'Ejecutando…' : `Ejecutar ${actionMeta?.label ?? ''}`}
                </button>

                {error ? <div className="rounded-xl border border-rose-600/15 bg-rose-500/7 px-4 py-3 text-sm text-rose-800">{error}</div> : null}

                {run ? (
                  <div className="space-y-3 border-t border-black/8 pt-4">
                    {formatAgentResponse(run.response)}
                    {canApply ? (
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button type="button" onClick={() => void applyRun()} disabled={run.applyState === 'pending' || run.applyState === 'ok'} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#ffb000] px-4 text-xs font-black text-[#171612] disabled:opacity-50">
                          {run.applyState === 'pending' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          {run.applyState === 'ok' ? 'Aplicado' : 'Aplicar'}
                        </button>
                        {run.applyMessage ? <p className={`text-xs font-semibold ${run.applyState === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>{run.applyMessage}</p> : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </AdminCard>

        <AdminCard className="p-0 sm:p-0 xl:sticky xl:top-24">
          <div className="flex items-center gap-2 border-b border-black/8 px-4 py-3">
            <MessageSquare className="h-4 w-4 text-[#a56600]" />
            <strong className="text-sm text-[#171612]">Preguntar al Coach</strong>
            {chatThreadId ? <button type="button" onClick={() => { setChatMessages([]); setChatThreadId(null); }} title="Nueva conversación" className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-[#8f887c] hover:bg-black/5 hover:text-[#171612]"><X className="h-3.5 w-3.5" /></button> : null}
          </div>

          <div className="flex min-h-[460px] max-h-[70dvh] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {chatMessages.length === 0 ? (
                <div className="grid min-h-72 place-items-center text-center">
                  <div className="max-w-xs">
                    <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[#ffb000]/10 text-[#a56600]"><Bot className="h-5 w-5" /></span>
                    <p className="mt-3 text-sm font-bold text-[#332f29]">Consulta tus campañas</p>
                    <div className="mt-3 grid gap-2">
                      {['¿Cómo mejorar mi CTR en Meta Ads?', '¿Qué presupuesto recomiendas para empezar?', 'Analiza mi estrategia de audiencias'].map((suggestion) => (
                        <button key={suggestion} type="button" onClick={() => setChatInput(suggestion)} className="rounded-xl border border-black/8 bg-white/45 px-3 py-2 text-left text-xs leading-5 text-[#716b60] hover:bg-white">{suggestion}</button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {chatMessages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === 'user' ? 'rounded-br-md bg-[#171612] text-white' : 'rounded-bl-md bg-[#f0e7d8] text-[#403a32]'}`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.role === 'assistant' && message.model ? <p className="mt-1 text-[10px] text-[#9a9286]">{message.model.split('/')[1]?.replace(':free', '') ?? message.model}</p> : null}
                  </div>
                </div>
              ))}

              {chatSending ? <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md bg-[#f0e7d8] px-4 py-3"><Loader2 className="h-4 w-4 animate-spin text-[#a56600]" /></div></div> : null}
              <div ref={messagesEndRef} />
            </div>

            {chatError ? <div className="mx-4 mb-2 rounded-xl border border-rose-600/15 bg-rose-500/7 px-3 py-2 text-xs text-rose-800">{chatError}</div> : null}

            <div className="border-t border-black/8 p-3">
              <div className="flex items-end gap-2 rounded-xl border border-black/10 bg-white/75 px-3 py-2 focus-within:border-[#c77a00]/30 focus-within:bg-white">
                <textarea
                  ref={inputRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Pregunta sobre tus campañas…"
                  rows={2}
                  className="min-w-0 flex-1 resize-none bg-transparent text-sm text-[#171612] outline-none placeholder:text-[#aaa296]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void sendChat();
                    }
                  }}
                  disabled={chatSending}
                />
                <button type="button" onClick={() => void sendChat()} disabled={chatSending || !chatInput.trim()} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#171612] text-white transition hover:bg-[#2a2823] disabled:opacity-40">
                  {chatSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </AdminCard>
      </section>
    </AdminPage>
  );
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Bot,
  CheckCircle2,
  KeyRound,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

type ModelEntry = { id: string; name: string; description?: string };
type ProviderResult = { id: string; label: string; configured: boolean; error?: string; models: ModelEntry[] };
type TraceItem = { id: string; at: string; label: string; detail: string; tone: 'info' | 'ok' | 'error' };
type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; streaming?: boolean; error?: string; tokens?: { input: number; output: number } };
type SseEvent =
  | { type: 'chunk'; text: string }
  | { type: 'usage'; tokens: { input: number; output: number; total: number } }
  | { type: 'error'; message: string; errorType: string }
  | { type: 'done' };

function nowLabel() {
  return new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AiHarnessPage() {
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<ProviderResult | null>(null);
  const [model, setModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(true);
  const [saving, setSaving] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [trace, setTrace] = useState<TraceItem[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addTrace = useCallback((label: string, detail: string, tone: TraceItem['tone'] = 'info') => {
    setTrace((current) => [{ id: crypto.randomUUID(), at: nowLabel(), label, detail, tone }, ...current].slice(0, 30));
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
        addTrace('Ollama pendiente', 'Agrega una API key para habilitar el chat.', 'info');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar los modelos.';
      setError(message);
      addTrace('Error de modelos', message, 'error');
    } finally {
      setLoadingModels(false);
    }
  }, [addTrace]);

  useEffect(() => { void loadModels(); }, [loadModels]);
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
      addTrace('Credencial guardada', 'La clave quedó asociada a este tenant y no se vuelve a mostrar.', 'ok');
      await loadModels();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar Ollama.';
      setError(message);
      addTrace('Error de credencial', message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || !model || streaming) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    const assistantId = crypto.randomUUID();
    const history = [...messages, userMessage].map((item) => ({ role: item.role, content: item.content }));
    setMessages((current) => [...current, userMessage, { id: assistantId, role: 'assistant', content: '', streaming: true }]);
    setInput('');
    setStreaming(true);
    setError('');
    addTrace('Solicitud enviada', `Modelo ${model} · ${text.length} caracteres.`, 'info');
    const started = performance.now();
    let firstToken = false;
    let usage = { input: 0, output: 0 };

    try {
      const response = await fetch('/api/admin/modelos-ia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'ollama', modelo: model, messages: history }),
      });
      if (!response.ok || !response.body) throw new Error(`El chat respondió HTTP ${response.status}.`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
              setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, streaming: false, error: event.message } : item));
              addTrace('Proveedor reportó error', event.message, 'error');
            } else if (event.type === 'done') {
              setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, streaming: false, tokens: usage } : item));
            }
          } catch { /* ignore keepalive/non-json lines */ }
        }
      }

      addTrace('Respuesta completada', `${Math.round(performance.now() - started)} ms · ${usage.input + usage.output} tokens contabilizados.`, 'ok');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo completar el chat.';
      setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, streaming: false, error: message } : item));
      setError(message);
      addTrace('Fallo de chat', message, 'error');
    } finally {
      setStreaming(false);
    }
  }

  const totalTokens = useMemo(() => messages.reduce((sum, item) => sum + (item.tokens?.input || 0) + (item.tokens?.output || 0), 0), [messages]);
  const configured = Boolean(provider?.configured);
  const ready = configured && Boolean(provider?.models?.length) && Boolean(model);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="IA & análisis · laboratorio"
        title="AI Harness"
        description="Conecta Ollama Cloud, carga modelos y conversa desde un entorno de prueba con trazabilidad visible. La clave se guarda por tenant y el navegador nunca vuelve a recibir el secreto guardado."
        icon={Sparkles}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/mcp" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/75 px-4 text-xs font-black text-[#514b42]"><ArrowLeft className="h-4 w-4" /> ChatGPT & MCP</Link>
            <button type="button" onClick={() => void loadModels()} disabled={loadingModels} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white disabled:opacity-50">{loadingModels ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Recargar modelos</button>
          </div>
        }
        meta={
          <>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] ${ready ? 'bg-emerald-500/10 text-emerald-800' : configured ? 'bg-amber-500/10 text-amber-800' : 'bg-black/5 text-[#716b60]'}`}>{ready ? 'Ollama listo' : configured ? 'API guardada' : 'Sin API'}</span>
            <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] text-[#716b60]">{provider?.models?.length || 0} modelos</span>
          </>
        }
      />

      {(error || notice) ? <AdminMotion><div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${error ? 'border-rose-500/20 bg-rose-500/8 text-rose-800' : 'border-emerald-500/20 bg-emerald-500/8 text-emerald-800'}`}>{error || notice}</div></AdminMotion> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Proveedor" value="Ollama" icon={Bot} />
        <AdminStat label="Estado" value={ready ? 'Listo' : configured ? 'Parcial' : 'Pendiente'} icon={Activity} accent={ready ? 'emerald' : 'yellow'} />
        <AdminStat label="Modelos" value={loadingModels ? '…' : provider?.models?.length || 0} icon={Zap} accent="cyan" />
        <AdminStat label="Tokens sesión" value={totalTokens.toLocaleString('es-CL')} icon={MessageSquare} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
        <div className="grid gap-5">
          <AdminCard glow>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Conexión Ollama Cloud</p><h2 className="mt-1 text-xl font-black tracking-[-.03em] text-[#171612]">API + modelo</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#716b60]">Pega una API key solo cuando quieras reemplazar o configurar la actual. Ollama Cloud usa autenticación Bearer para su API remota.</p></div>
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

          <AdminCard className="p-0 sm:p-0" glow>
            <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 sm:px-5">
              <div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#9b6a12]">Chat directo</p><p className="mt-0.5 text-sm font-black text-[#171612]">{model || 'Ollama Cloud'}</p></div>
              <button type="button" onClick={() => setMessages([])} disabled={!messages.length || streaming} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3 text-[10px] font-black uppercase tracking-[.1em] text-[#716b60] disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /> Limpiar</button>
            </div>

            <div className="min-h-[420px] max-h-[64vh] overflow-y-auto bg-white/20 px-4 py-5 sm:px-5">
              {messages.length === 0 ? (
                <div className="grid min-h-[360px] place-items-center text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#ffb000]/10 text-[#a56600]"><Bot className="h-6 w-6" /></span><h3 className="mt-4 text-lg font-black text-[#171612]">Prueba tu modelo aquí</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#8f887c]">Puedes preguntar, comparar respuestas y mirar el panel de actividad para saber cuándo se envió la solicitud, cuándo llegó el primer token y cuánto tardó.</p></div></div>
              ) : (
                <div className="grid gap-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-[#171612] text-white' : 'border border-black/8 bg-white/80 text-[#3f3a33]'}`}>
                        <p className="whitespace-pre-wrap">{message.content || (message.streaming ? 'Pensando…' : '')}</p>
                        {message.streaming ? <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold opacity-60"><Loader2 className="h-3 w-3 animate-spin" /> generando</span> : null}
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
                <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void sendMessage(); } }} rows={2} placeholder={ready ? 'Escribe una pregunta…  Ctrl/⌘ + Enter para enviar' : 'Configura Ollama y selecciona un modelo'} disabled={!ready || streaming} className="min-h-[48px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[#171612] outline-none placeholder:text-[#aaa397] disabled:opacity-50" />
                <button type="button" onClick={() => void sendMessage()} disabled={!ready || streaming || !input.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#171612] text-white disabled:opacity-30">{streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
              </div>
            </div>
          </AdminCard>
        </div>

        <AdminCard className="self-start xl:sticky xl:top-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">Activity trace</p><h2 className="mt-1 text-lg font-black text-[#171612]">Qué está pasando</h2><p className="mt-1 text-xs leading-5 text-[#8f887c]">Traza local de esta sesión. No contiene tu API key.</p></div><Activity className="h-5 w-5 text-[#a56600]" /></div>
          <div className="mt-4 grid gap-2">
            {trace.length === 0 ? <p className="rounded-xl border border-dashed border-black/10 px-3 py-5 text-xs text-[#8f887c]">Sin actividad todavía.</p> : trace.map((item) => (
              <div key={item.id} className="rounded-xl border border-black/8 bg-white/45 px-3 py-3">
                <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${item.tone === 'ok' ? 'bg-emerald-500' : item.tone === 'error' ? 'bg-rose-500' : 'bg-[#F5871F]'}`} /><p className="text-xs font-black text-[#171612]">{item.label}</p><span className="ml-auto text-[9px] font-bold text-[#aaa397]">{item.at}</span></div>
                <p className="mt-1 text-[11px] leading-5 text-[#8f887c]">{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-[#c77a00]/12 bg-[#fff7e7] p-3 text-xs leading-5 text-[#80652a]">Este chat prueba el proveedor Ollama. La conexión ChatGPT ↔ Fabrick se prueba en <Link href="/admin/mcp" className="font-black underline decoration-[#c77a00]/30 underline-offset-2">ChatGPT & MCP</Link>.</div>
        </AdminCard>
      </div>
    </AdminPage>
  );
}

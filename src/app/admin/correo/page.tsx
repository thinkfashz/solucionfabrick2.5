'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCheck,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  Inbox,
  Loader2,
  MailOpen,
  MailPlus,
  MousePointerClick,
  RefreshCw,
  Reply,
  Send,
  Settings,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecibidoRow {
  id: string;
  resend_id: string | null;
  de: string;
  para: string;
  asunto: string;
  cuerpo_texto: string;
  cuerpo_html: string;
  leido: boolean;
  respondido: boolean;
  fecha_recibido: string;
}

interface EnviadoRow {
  id: string;
  resend_id: string | null;
  presupuesto_id: string | null;
  destinatario: string;
  asunto: string;
  estado: string;
  tipo: string;
  enviado_at: string;
}

type EmailItem =
  | ({ _kind: 'received' } & RecibidoRow)
  | ({ _kind: 'sent' } & EnviadoRow);

type Folder = 'inbox' | 'sent' | 'all' | 'resend';

interface StatsData {
  enviado: number;
  entregado: number;
  abierto: number;
  rebotado: number;
  spam: number;
  deliveryRate: number;
  openRate: number;
  bounceRate: number;
}

interface ResendItem {
  id: string;
  from: string;
  to: string[];
  subject: string;
  created_at: string;
  last_event: string;
  // loaded lazily
  html?: string | null;
  text?: string | null;
  bcc?: string[];
  cc?: string[];
  opens_count?: number;
  clicks_count?: number;
  opens?: { timestamp: string; ip: string }[];
  clicks?: { timestamp: string; link: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500',
  'bg-cyan-500', 'bg-blue-500', 'bg-violet-500', 'bg-pink-500',
];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % 8];
}

function avatarInitial(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase();
}

function relDate(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return '';
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
}

function fullDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CL', {
      weekday: 'short', day: '2-digit', month: 'short',
      year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

const EVENT_STYLES: Record<string, string> = {
  sent:      'border-zinc-600   text-zinc-300   bg-zinc-900/60',
  delivered: 'border-emerald-600/50 text-emerald-300 bg-emerald-900/20',
  opened:    'border-blue-600/50   text-blue-300   bg-blue-900/20',
  bounced:   'border-red-600/50    text-red-300    bg-red-900/20',
  complained:'border-orange-600/50 text-orange-300 bg-orange-900/20',
  // DB states
  enviado:   'border-zinc-600   text-zinc-300   bg-zinc-900/60',
  entregado: 'border-emerald-600/50 text-emerald-300 bg-emerald-900/20',
  abierto:   'border-blue-600/50   text-blue-300   bg-blue-900/20',
  rebotado:  'border-red-600/50    text-red-300    bg-red-900/20',
  spam:      'border-orange-600/50 text-orange-300 bg-orange-900/20',
};

const EVENT_LABELS: Record<string, string> = {
  sent: 'enviado', delivered: 'entregado', opened: 'abierto',
  bounced: 'rebotado', complained: 'spam',
};

function StatusBadge({ event }: { event: string }) {
  const cls = EVENT_STYLES[event] ?? 'border-zinc-700 text-zinc-400';
  const label = EVENT_LABELS[event] ?? event;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

// ─── Compose Modal ────────────────────────────────────────────────────────────

interface ComposeProps {
  onClose: () => void;
  onSent: () => void;
  initialTo?: string;
  initialSubject?: string;
  fromAddress?: string | null;
}

const AI_PRESETS = [
  { label: 'Profesional', prompt: 'Convierte este correo a un estilo profesional y corporativo. Usa colores oscuros, tipografía limpia, sin emojis.' },
  { label: 'Oscuro', prompt: 'Dale un estilo moderno dark con fondo negro/zinc, texto blanco, acentos en amarillo o dorado. Muy premium.' },
  { label: 'Minimalista', prompt: 'Hazlo minimalista: fondo blanco, texto negro, sin imágenes, solo tipografía y espaciado.' },
];

function parseModelValue(val: string): { provider: string; modelo: string } {
  if (val === 'auto') return { provider: 'auto', modelo: '' };
  const colon = val.indexOf(':');
  return { provider: val.slice(0, colon), modelo: val.slice(colon + 1) };
}

function RecipientTag({ email, onRemove }: { email: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-white/[0.10] bg-zinc-800 pl-2.5 pr-1.5 py-1 text-xs text-zinc-200">
      {email}
      <button type="button" onClick={onRemove} className="rounded-full p-0.5 text-zinc-500 hover:text-white hover:bg-white/[0.08] transition-colors">
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

function TagInput({
  tags, inputVal, onAdd, onRemove, onInputChange, placeholder,
}: {
  tags: string[];
  inputVal: string;
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  onInputChange: (v: string) => void;
  placeholder?: string;
}) {
  function commit(val: string) {
    const trimmed = val.trim().replace(/,+$/, '');
    if (trimmed.includes('@')) onAdd(trimmed);
    onInputChange('');
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 min-h-[40px] focus-within:border-amber-500/40 transition-colors">
      {tags.map((t, i) => (
        <RecipientTag key={t} email={t} onRemove={() => onRemove(i)} />
      ))}
      <input
        type="text"
        value={inputVal}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
            e.preventDefault();
            commit(inputVal);
          } else if (e.key === 'Backspace' && inputVal === '' && tags.length > 0) {
            onRemove(tags.length - 1);
          }
        }}
        onBlur={() => { if (inputVal.trim().includes('@')) commit(inputVal); }}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
      />
    </div>
  );
}

function ComposeModal({ onClose, onSent, initialTo = '', initialSubject = '', fromAddress }: ComposeProps) {
  const [toTags, setToTags] = useState<string[]>(initialTo && initialTo.includes('@') ? [initialTo] : []);
  const [toInput, setToInput] = useState(initialTo && !initialTo.includes('@') ? initialTo : '');
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState('<p>Hola,</p><p><br/></p><p>Saludos,<br/>Soluciones Fabrick</p>');
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [instruccion, setInstruccion] = useState('');
  const [selectedModel, setSelectedModel] = useState('auto');
  const [fallbackNotice, setFallbackNotice] = useState<{ provider: string; modelo: string } | null>(null);
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const originalRef = useRef(body);

  useEffect(() => {
    fetch('/api/admin/ai/config')
      .then(r => r.json())
      .then((d: { ok: boolean; provider?: string; modelo?: string }) => {
        if (d.ok && d.provider) setAiProvider(`${d.provider} · ${d.modelo}`);
      })
      .catch(() => {});
  }, []);

  const handleSend = useCallback(async () => {
    const pendingTo = toInput.trim().includes('@') ? toInput.trim() : null;
    const allTo = pendingTo ? [...toTags, pendingTo] : toTags;
    if (allTo.length === 0) { setNotice({ type: 'err', msg: 'Agrega al menos un destinatario' }); return; }
    if (!subject.trim()) { setNotice({ type: 'err', msg: 'Asunto requerido' }); return; }
    setSending(true); setNotice(null);
    try {
      const payload: Record<string, unknown> = { to: allTo, subject, html: body };
      if (ccInput.trim()) payload.cc = ccInput;
      if (bccInput.trim()) payload.bcc = bccInput;
      const r = await fetch('/api/admin/correo/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json() as { ok: boolean; error?: string };
      if (!data.ok) { setNotice({ type: 'err', msg: data.error ?? 'Error al enviar' }); return; }
      setNotice({ type: 'ok', msg: `¡Correo enviado a ${allTo.length > 1 ? `${allTo.length} destinatarios` : allTo[0]}!` });
      setTimeout(() => { onSent(); onClose(); }, 1800);
    } finally { setSending(false); }
  }, [toTags, toInput, ccInput, bccInput, subject, body, onSent, onClose]);

  const handleAi = useCallback(async (presetPrompt?: string) => {
    const promptText = presetPrompt ?? instruccion;
    if (!promptText.trim()) { setNotice({ type: 'err', msg: 'Escribe una instrucción' }); return; }
    const { provider: selProvider, modelo: selModelo } = parseModelValue(selectedModel);
    setAiLoading(true); setNotice(null); setFallbackNotice(null);
    try {
      const r = await fetch('/api/admin/correo/ai-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruccion: promptText, html: body, provider: selProvider, modelo: selModelo }),
      });
      const data = await r.json() as { ok: boolean; html?: string; error?: string; provider?: string; modelo?: string; usedFallback?: boolean };
      if (!data.ok || !data.html) { setNotice({ type: 'err', msg: data.error ?? 'Sin respuesta de IA' }); return; }
      originalRef.current = body;
      setBody(data.html);
      if (data.usedFallback && data.provider && data.modelo) {
        setFallbackNotice({ provider: data.provider, modelo: data.modelo });
      }
    } finally { setAiLoading(false); }
  }, [instruccion, body, selectedModel]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full max-w-2xl flex-col rounded-t-2xl sm:rounded-2xl bg-[#18181b] border border-white/[0.08] shadow-2xl max-h-[95dvh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
          <h2 className="font-semibold text-white flex items-center gap-2 text-sm">
            <MailPlus className="h-4 w-4 text-amber-400" /> Nuevo correo
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="overflow-y-auto flex-1 divide-y divide-white/[0.05]">

          {/* From (read-only) */}
          <div className="flex items-center gap-3 px-5 py-2.5">
            <span className="w-8 shrink-0 text-[10px] font-bold uppercase tracking-widest text-zinc-700 text-right">De</span>
            <span className="text-sm text-zinc-500 truncate">
              {fromAddress ?? 'Soluciones Fabrick <onboarding@resend.dev>'}
            </span>
            {!fromAddress && (
              <a href="/admin/integraciones" target="_blank" className="ml-auto shrink-0 text-[10px] text-amber-500/70 hover:text-amber-400 transition-colors">
                Configurar →
              </a>
            )}
          </div>

          {/* To (tag input) */}
          <div className="flex items-start gap-3 px-5 py-2.5">
            <span className="mt-2 w-8 shrink-0 text-[10px] font-bold uppercase tracking-widest text-zinc-700 text-right">Para</span>
            <div className="flex-1">
              <TagInput
                tags={toTags}
                inputVal={toInput}
                onAdd={(v) => setToTags((p) => p.includes(v) ? p : [...p, v])}
                onRemove={(i) => setToTags((p) => p.filter((_, idx) => idx !== i))}
                onInputChange={setToInput}
                placeholder="nombre@email.com — Enter o coma para agregar"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCcBcc((v) => !v)}
              className="mt-2 shrink-0 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {showCcBcc ? 'Ocultar CC' : 'CC/BCC'}
            </button>
          </div>

          {/* CC/BCC */}
          {showCcBcc && (
            <>
              <div className="flex items-center gap-3 px-5 py-2.5">
                <span className="w-8 shrink-0 text-[10px] font-bold uppercase tracking-widest text-zinc-700 text-right">CC</span>
                <input
                  type="text"
                  value={ccInput}
                  onChange={(e) => setCcInput(e.target.value)}
                  placeholder="cc@email.com, otro@email.com"
                  className="flex-1 rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/40 focus:outline-none transition-colors"
                />
              </div>
              <div className="flex items-center gap-3 px-5 py-2.5">
                <span className="w-8 shrink-0 text-[10px] font-bold uppercase tracking-widest text-zinc-700 text-right">BCC</span>
                <input
                  type="text"
                  value={bccInput}
                  onChange={(e) => setBccInput(e.target.value)}
                  placeholder="bcc@email.com"
                  className="flex-1 rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/40 focus:outline-none transition-colors"
                />
              </div>
            </>
          )}

          {/* Subject */}
          <div className="flex items-center gap-3 px-5 py-2.5">
            <span className="w-8 shrink-0 text-[10px] font-bold uppercase tracking-widest text-zinc-700 text-right">Asunto</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto del correo"
              className="flex-1 rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/40 focus:outline-none transition-colors"
            />
          </div>

          {/* Body + AI */}
          <div className="p-5 space-y-4">
            {/* AI presets */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-amber-500" /> Asistente IA
                {aiProvider && (
                  <span className="ml-auto font-normal normal-case tracking-normal text-zinc-700">{aiProvider}</span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {AI_PRESETS.map((p) => (
                  <button key={p.label} onClick={() => void handleAi(p.prompt)} disabled={aiLoading}
                    className="rounded-full border border-white/[0.08] bg-zinc-800 px-3 py-1 text-xs text-zinc-400 hover:border-amber-500/30 hover:text-amber-300 transition-colors disabled:opacity-50">
                    {p.label}
                  </button>
                ))}
                {body !== originalRef.current && (
                  <button onClick={() => setBody(originalRef.current)}
                    className="rounded-full border border-white/[0.08] bg-zinc-800 px-3 py-1 text-xs text-zinc-500 hover:text-white transition-colors">
                    ↩ Restaurar
                  </button>
                )}
              </div>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-zinc-900 border border-white/[0.08] text-xs text-zinc-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500/40 w-full"
              >
                <option value="auto">Auto · proveedor configurado</option>
                <optgroup label="Gratis">
                  <option value="openrouter:meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B · OpenRouter</option>
                  <option value="openrouter:google/gemma-3-27b-it:free">Gemma 3 27B · OpenRouter</option>
                  <option value="openrouter:deepseek/deepseek-r1:free">DeepSeek R1 · OpenRouter</option>
                  <option value="groq:llama-3.3-70b-versatile">Llama 3.3 70B · Groq</option>
                  <option value="groq:llama3-8b-8192">Llama 3 8B · Groq</option>
                  <option value="groq:gemma2-9b-it">Gemma 2 9B · Groq</option>
                </optgroup>
                <optgroup label="De pago">
                  <option value="anthropic:claude-haiku-4-5-20251001">Claude Haiku · Anthropic</option>
                  <option value="anthropic:claude-sonnet-4-6">Claude Sonnet · Anthropic</option>
                  <option value="openai:gpt-4o-mini">GPT-4o mini · OpenAI</option>
                  <option value="openai:gpt-4o">GPT-4o · OpenAI</option>
                  <option value="gemini:gemini-2.0-flash-exp">Gemini 2.0 Flash · Google</option>
                  <option value="grok:grok-2-1212">Grok-2 · xAI</option>
                </optgroup>
              </select>
              {fallbackNotice && (
                <p className="text-[10px] text-amber-400/80 bg-amber-500/[0.06] border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                  Usando {fallbackNotice.provider} · {fallbackNotice.modelo} (fallback automático)
                </p>
              )}
              <div className="flex gap-2">
                <input value={instruccion} onChange={(e) => setInstruccion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleAi(); }}
                  placeholder="Ej: hazlo más formal, agrega firma..."
                  className="flex-1 rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-amber-500/40 focus:outline-none transition-colors" />
                <button onClick={() => void handleAi()} disabled={aiLoading || !instruccion.trim()}
                  className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-40 transition-colors">
                  {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Generar'}
                </button>
              </div>
            </div>

            {/* Body editor */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Cuerpo HTML</label>
                <button onClick={() => setPreview(!preview)}
                  className="ml-auto rounded-full border border-white/[0.08] px-3 py-0.5 text-[10px] text-zinc-500 hover:text-white transition-colors">
                  {preview ? 'Editar' : 'Vista previa'}
                </button>
              </div>
              {preview ? (
                <div className="h-48 overflow-auto rounded-xl border border-white/[0.08] bg-white">
                  <iframe srcDoc={body} sandbox="" className="h-full w-full" title="Preview" />
                </div>
              ) : (
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8}
                  className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2.5 text-xs font-mono text-white focus:border-amber-500/40 focus:outline-none resize-none transition-colors" />
              )}
            </div>

            {notice && (
              <div className={`rounded-xl px-4 py-2.5 text-xs ${notice.type === 'ok'
                ? 'bg-emerald-900/20 text-emerald-300 border border-emerald-600/20'
                : 'bg-red-900/20 text-red-300 border border-red-600/20'}`}>
                {notice.msg}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3.5">
          <button onClick={onClose} className="text-sm text-zinc-500 hover:text-white transition-colors">Cancelar</button>
          <div className="flex items-center gap-3">
            {toTags.length > 0 && (
              <span className="text-[11px] text-zinc-600">
                {toTags.length} destinatario{toTags.length > 1 ? 's' : ''}
              </span>
            )}
            <button onClick={() => void handleSend()} disabled={sending}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50 transition-colors">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DB Email Row ─────────────────────────────────────────────────────────────

function EmailRow({ item, selected, onClick }: { item: EmailItem; selected: boolean; onClick: () => void }) {
  const isReceived = item._kind === 'received';
  const sender = isReceived ? item.de : item.destinatario;
  const date = isReceived ? item.fecha_recibido : item.enviado_at;
  const isUnread = isReceived && !item.leido;
  const snippet = isReceived ? item.cuerpo_texto.slice(0, 90) : '';

  return (
    <button onClick={onClick} className={[
      'group w-full text-left flex items-start gap-3 px-4 py-3.5 border-b border-white/[0.04] transition-all',
      selected ? 'bg-amber-500/[0.07] border-l-2 border-l-amber-500' : 'hover:bg-white/[0.03] border-l-2 border-l-transparent',
    ].join(' ')}>
      <div className={`h-8 w-8 shrink-0 rounded-full ${avatarColor(sender)} flex items-center justify-center text-white text-xs font-bold mt-0.5`}>
        {avatarInitial(sender)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={`truncate text-sm ${isUnread ? 'font-semibold text-white' : 'text-zinc-300'}`}>{sender || '(sin remitente)'}</span>
          <span className="shrink-0 text-[10px] text-zinc-600">{relDate(date)}</span>
        </div>
        <p className={`truncate text-xs ${isUnread ? 'text-zinc-200' : 'text-zinc-500'}`}>{item.asunto || '(sin asunto)'}</p>
        {snippet && <p className="truncate text-[11px] text-zinc-700 mt-0.5">{snippet}</p>}
        <div className="flex items-center gap-2 mt-1.5">
          {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />}
          {!isReceived && <StatusBadge event={item.estado} />}
          {isReceived && item.respondido && <span className="text-[10px] text-zinc-700">↩ respondido</span>}
        </div>
      </div>
    </button>
  );
}

// ─── Resend History Row ───────────────────────────────────────────────────────

function ResendRow({ item, selected, onClick }: { item: ResendItem; selected: boolean; onClick: () => void }) {
  const to = item.to[0] ?? '';
  return (
    <button onClick={onClick} className={[
      'group w-full text-left flex items-start gap-3 px-4 py-3.5 border-b border-white/[0.04] transition-all',
      selected ? 'bg-amber-500/[0.07] border-l-2 border-l-amber-500' : 'hover:bg-white/[0.03] border-l-2 border-l-transparent',
    ].join(' ')}>
      <div className={`h-8 w-8 shrink-0 rounded-full ${avatarColor(to)} flex items-center justify-center text-white text-xs font-bold mt-0.5`}>
        {avatarInitial(to)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="truncate text-sm text-zinc-300">{to || '(desconocido)'}</span>
          <span className="shrink-0 text-[10px] text-zinc-600">{relDate(item.created_at)}</span>
        </div>
        <p className="truncate text-xs text-zinc-500">{item.subject}</p>
        <div className="mt-1.5">
          <StatusBadge event={item.last_event} />
        </div>
      </div>
    </button>
  );
}

// ─── DB Email Detail ──────────────────────────────────────────────────────────

function EmailDetail({ item, onBack, onReply, onMarkRead }: {
  item: EmailItem;
  onBack: () => void;
  onReply: (to: string, subject: string) => void;
  onMarkRead: (id: string) => void;
}) {
  const isReceived = item._kind === 'received';
  const from = isReceived ? item.de : 'Tú';
  const to = isReceived ? item.para : item.destinatario;
  const date = isReceived ? item.fecha_recibido : item.enviado_at;
  const hasHtml = isReceived && Boolean(item.cuerpo_html?.trim());
  const hasText = isReceived && Boolean(item.cuerpo_texto?.trim());
  const [archived, setArchived] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-start gap-3 mb-3">
          <button onClick={onBack} className="lg:hidden rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="flex-1 text-base font-bold text-white leading-snug">{item.asunto || '(sin asunto)'}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`h-8 w-8 rounded-full ${avatarColor(from)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
              {avatarInitial(from)}
            </div>
            <div>
              <p className="text-xs font-semibold text-white leading-none">{from}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">→ {to}</p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {!isReceived && <StatusBadge event={item.estado} />}
            {isReceived && <span className="rounded-full border border-blue-500/25 bg-blue-500/8 px-2 py-0.5 text-[10px] font-bold text-blue-300">Recibido</span>}
            {item.resend_id && (
              <span className="text-[10px] text-zinc-700 font-mono truncate max-w-[160px]" title={item.resend_id}>
                ID: {item.resend_id.slice(0, 12)}…
              </span>
            )}
            <span className="text-[11px] text-zinc-500">{fullDate(date)}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {isReceived ? (
          hasHtml ? (
            <iframe srcDoc={item.cuerpo_html} sandbox="" className="h-full w-full bg-white" title="Correo recibido" />
          ) : hasText ? (
            <div className="h-full overflow-y-auto p-5">
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">{item.cuerpo_texto}</pre>
            </div>
          ) : (
            <EmptyBody icon={MailOpen} msg="Sin contenido" />
          )
        ) : (
          <EmptyBody icon={Send} msg="El cuerpo no se almacena localmente." sub="Consulta el historial de Resend para ver el contenido." />
        )}
      </div>
      <div className="shrink-0 border-t border-white/[0.06] px-4 py-3 flex flex-wrap items-center gap-2">
        {isReceived && (
          <>
            <button onClick={() => onReply(item.de, `Re: ${item.asunto}`)}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-colors">
              <Reply className="h-3.5 w-3.5" /> Responder
            </button>
            {!item.leido && (
              <button onClick={() => onMarkRead(item.id)}
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                <CheckCheck className="h-3.5 w-3.5" /> Marcar leído
              </button>
            )}
            <button
              onClick={async () => {
                await fetch('/api/admin/correo/inbox', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: item.id, action: 'archivado' }),
                }).catch(() => {});
                setArchived(true);
              }}
              disabled={archived}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-500/12 disabled:opacity-50 transition-colors">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {archived ? 'Guardado ✓' : 'Guardar en historial'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Resend Email Detail ──────────────────────────────────────────────────────

function ResendDetail({ item, loading, onBack }: {
  item: ResendItem;
  loading: boolean;
  onBack: () => void;
}) {
  const to = item.to[0] ?? '';
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-start gap-3 mb-3">
          <button onClick={onBack} className="lg:hidden rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="flex-1 text-base font-bold text-white leading-snug">{item.subject}</h2>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`h-8 w-8 rounded-full ${avatarColor(to)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
              {avatarInitial(to)}
            </div>
            <div>
              <p className="text-xs font-semibold text-white leading-none">{item.from}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">→ {item.to.join(', ')}</p>
              {item.cc && item.cc.length > 0 && (
                <p className="text-[10px] text-zinc-600 mt-0.5">CC: {item.cc.join(', ')}</p>
              )}
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <StatusBadge event={item.last_event} />
            <span className="text-[10px] font-mono text-zinc-700 truncate max-w-[160px]" title={item.id}>
              {item.id.slice(0, 16)}…
            </span>
            <span className="text-[11px] text-zinc-500">{fullDate(item.created_at)}</span>
          </div>
        </div>

        {/* Engagement metrics */}
        {(item.opens_count !== undefined || item.clicks_count !== undefined) && (
          <div className="mt-3 flex gap-4">
            {item.opens_count !== undefined && (
              <div className="flex items-center gap-1.5 text-[11px]">
                <Eye className="h-3 w-3 text-blue-400" />
                <span className="font-semibold text-white">{item.opens_count}</span>
                <span className="text-zinc-600">aperturas</span>
              </div>
            )}
            {item.clicks_count !== undefined && (
              <div className="flex items-center gap-1.5 text-[11px]">
                <MousePointerClick className="h-3 w-3 text-emerald-400" />
                <span className="font-semibold text-white">{item.clicks_count}</span>
                <span className="text-zinc-600">clics</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#09090b]/80 z-10">
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando desde Resend…
            </div>
          </div>
        )}
        {item.html ? (
          <iframe srcDoc={item.html} sandbox="" className="h-full w-full bg-white" title="Email Resend" />
        ) : item.text ? (
          <div className="h-full overflow-y-auto p-5">
            <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">{item.text}</pre>
          </div>
        ) : !loading ? (
          <EmptyBody icon={Clock} msg="Sin contenido HTML disponible" sub="Este email no tiene cuerpo almacenado en Resend." />
        ) : null}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/[0.06] px-4 py-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-700">
          <Zap className="h-3 w-3 text-amber-500/50" />
          Datos en tiempo real de Resend
        </div>
        <a
          href={`https://resend.com/emails/${item.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ver en Resend
        </a>
      </div>
    </div>
  );
}

// ─── Empty helpers ────────────────────────────────────────────────────────────

function EmptyBody({ icon: Icon, msg, sub }: { icon: React.ElementType; msg: string; sub?: string }) {
  const El = Icon as React.ComponentType<{ className?: string }>;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-[#18181b]">
        <El className="h-6 w-6 text-zinc-600" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-zinc-500">{msg}</p>
        {sub && <p className="text-xs text-zinc-700 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function EmptyState({ folder }: { folder: Folder }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-[#18181b]">
        {folder === 'inbox' ? <Inbox className="h-6 w-6 text-zinc-600" /> : <Send className="h-6 w-6 text-zinc-600" />}
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-zinc-500">
          {folder === 'resend' ? 'Sin correos en Resend' : folder === 'inbox' ? 'Bandeja vacía' : folder === 'sent' ? 'Sin enviados' : 'Sin correos'}
        </p>
        <p className="text-xs text-zinc-700 mt-1">
          {folder === 'resend' ? 'No hay correos en el historial de Resend' : 'Los correos aparecerán aquí'}
        </p>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-3 px-4 py-3.5 border-b border-white/[0.04]">
          <div className="h-8 w-8 rounded-full bg-white/[0.06] shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-2.5 rounded-full bg-white/[0.06] w-3/4" />
            <div className="h-2 rounded-full bg-white/[0.04] w-1/2" />
            <div className="h-2 rounded-full bg-white/[0.03] w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Bottom tab definition ────────────────────────────────────────────────────

const MOBILE_TABS: { folder: Folder; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { folder: 'all',    label: 'Todos',     icon: MailOpen },
  { folder: 'inbox',  label: 'Recibidos', icon: Inbox },
  { folder: 'sent',   label: 'Enviados',  icon: Send },
  { folder: 'resend', label: 'Resend',    icon: Zap },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CorreoPage() {
  // DB data
  const [recibidos, setRecibidos]         = useState<RecibidoRow[]>([]);
  const [enviados, setEnviados]           = useState<EnviadoRow[]>([]);
  const [unread, setUnread]               = useState(0);
  const [emailStats, setEmailStats]       = useState<StatsData | null>(null);
  const [resendConfigured, setResendConfigured] = useState(true);
  const [fromAddress, setFromAddress]     = useState<string | null>(null);
  const [loadingInbox, setLoadingInbox]   = useState(true);
  const [loadingSent, setLoadingSent]     = useState(true);

  // Resend real-time data
  const [resendEmails, setResendEmails]   = useState<ResendItem[]>([]);
  const [loadingResend, setLoadingResend] = useState(false);
  const [resendError, setResendError]     = useState<string | null>(null);
  const [resendSelected, setResendSelected] = useState<ResendItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // UI
  const [folder, setFolder]     = useState<Folder>('all');
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<EmailItem | null>(null);
  const [compose, setCompose]   = useState<{ to?: string; subject?: string } | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [syncing, setSyncing]   = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [resendBannerDismissed, setResendBannerDismissed] = useState(false);
  const [resendSaveBannerCollapsed, setResendSaveBannerCollapsed] = useState(false);

  // ── Fetch DB inbox ────────────────────────────────────────────────────────

  const fetchInbox = useCallback(async (signal?: AbortSignal) => {
    setLoadingInbox(true);
    try {
      const r = await fetch('/api/admin/correo/inbox', { signal, cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json() as { ok: boolean; emails: RecibidoRow[]; unread: number };
      if (data.ok) { setRecibidos(data.emails ?? []); setUnread(data.unread ?? 0); }
    } catch { /* ignore abort */ }
    finally { setLoadingInbox(false); }
  }, []);

  // ── Fetch DB sent + stats ─────────────────────────────────────────────────

  const fetchSent = useCallback(async (signal?: AbortSignal) => {
    setLoadingSent(true);
    try {
      const r = await fetch('/api/admin/correo/stats', { signal, cache: 'no-store' });
      if (!r.ok) return;
      type StatsApiResponse = {
        ok: boolean;
        recent: EnviadoRow[];
        totals: { enviado: number; entregado: number; abierto: number; rebotado: number; spam: number };
        deliveryRate: number;
        openRate: number;
        bounceRate: number;
        key_configured: boolean;
        from_address: string | null;
      };
      const data = await r.json() as StatsApiResponse;
      if (data.ok) {
        setEnviados(data.recent ?? []);
        const t = data.totals ?? { enviado: 0, entregado: 0, abierto: 0, rebotado: 0, spam: 0 };
        setEmailStats({
          enviado: t.enviado, entregado: t.entregado, abierto: t.abierto,
          rebotado: t.rebotado, spam: t.spam,
          deliveryRate: data.deliveryRate ?? 0,
          openRate: data.openRate ?? 0,
          bounceRate: data.bounceRate ?? 0,
        });
        setResendConfigured(data.key_configured ?? false);
        setFromAddress(data.from_address ?? null);
      }
    } catch { /* ignore abort */ }
    finally { setLoadingSent(false); }
  }, []);

  // ── Fetch Resend real-time history ────────────────────────────────────────

  const fetchResend = useCallback(async () => {
    setLoadingResend(true);
    setResendError(null);
    try {
      const r = await fetch('/api/admin/correo/resend-list?limit=50', { cache: 'no-store' });
      const data = await r.json() as { ok: boolean; emails: ResendItem[]; error?: string };
      if (data.ok) {
        setResendEmails(data.emails);
      } else {
        setResendError(data.error ?? 'Error al cargar historial de Resend');
      }
    } catch (e) {
      setResendError((e as Error).message);
    } finally {
      setLoadingResend(false);
    }
  }, []);

  const refresh = useCallback(() => {
    const ctrl = new AbortController();
    void fetchInbox(ctrl.signal);
    void fetchSent(ctrl.signal);
    return ctrl;
  }, [fetchInbox, fetchSent]);

  // Initial load
  useEffect(() => {
    const ctrl = refresh();
    const interval = setInterval(() => { void refresh(); }, 30_000);
    return () => { ctrl.abort(); clearInterval(interval); };
  }, [refresh]);

  // Auto-load Resend history when switching to that folder
  useEffect(() => {
    if (folder === 'resend' && resendEmails.length === 0 && !loadingResend && !resendError) {
      void fetchResend();
    }
  }, [folder, resendEmails.length, loadingResend, resendError, fetchResend]);

  // ── Combined filtered list (DB) ───────────────────────────────────────────

  const allItems = useMemo<EmailItem[]>(() => {
    const received: EmailItem[] = recibidos.map((e) => ({ _kind: 'received' as const, ...e }));
    const sent: EmailItem[] = enviados.map((e) => ({ _kind: 'sent' as const, ...e }));
    let list: EmailItem[] =
      folder === 'inbox' ? received :
      folder === 'sent'  ? sent :
      [...received, ...sent].sort((a, b) => {
        const ta = a._kind === 'received' ? a.fecha_recibido : a.enviado_at;
        const tb = b._kind === 'received' ? b.fecha_recibido : b.enviado_at;
        return new Date(tb).getTime() - new Date(ta).getTime();
      });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((item) => {
        const sender = item._kind === 'received' ? item.de : item.destinatario;
        return item.asunto.toLowerCase().includes(q) || sender.toLowerCase().includes(q);
      });
    }
    return list;
  }, [recibidos, enviados, folder, search]);

  const filteredResend = useMemo(() => {
    if (!search.trim()) return resendEmails;
    const q = search.toLowerCase();
    return resendEmails.filter((e) =>
      e.subject.toLowerCase().includes(q) ||
      e.to.some((t) => t.toLowerCase().includes(q)) ||
      e.from.toLowerCase().includes(q)
    );
  }, [resendEmails, search]);

  const loading = loadingInbox || loadingSent;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSelect = useCallback(async (item: EmailItem) => {
    setSelected(item);
    setResendSelected(null);
    setMobileView('detail');
    if (item._kind === 'received' && !item.leido) {
      setRecibidos((prev) => prev.map((e) => e.id === item.id ? { ...e, leido: true } : e));
      await fetch('/api/admin/correo/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, action: 'leido' }),
      }).catch(() => {});
    }
  }, []);

  const handleSelectResend = useCallback(async (email: ResendItem) => {
    setResendSelected(email);
    setSelected(null);
    setMobileView('detail');
    // If we don't have HTML yet, fetch the full detail
    if (email.html === undefined) {
      setLoadingDetail(true);
      try {
        const r = await fetch(`/api/admin/correo/resend-detail?id=${encodeURIComponent(email.id)}`, { cache: 'no-store' });
        const data = await r.json() as {
          ok: boolean;
          email?: ResendItem & { html: string | null; text: string | null; opens_count: number; clicks_count: number };
          error?: string;
        };
        if (data.ok && data.email) {
          const enriched = { ...email, ...data.email };
          setResendSelected(enriched);
          setResendEmails((prev) => prev.map((e) => e.id === email.id ? enriched : e));
        }
      } finally {
        setLoadingDetail(false);
      }
    }
  }, []);

  const handleMarkRead = useCallback(async (id: string) => {
    setRecibidos((prev) => prev.map((e) => e.id === id ? { ...e, leido: true } : e));
    if (selected?._kind === 'received' && selected.id === id) {
      setSelected({ ...selected, leido: true });
    }
    await fetch('/api/admin/correo/inbox', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'leido' }),
    }).catch(() => {});
  }, [selected]);

  const handleReply = useCallback((to: string, subject: string) => { setCompose({ to, subject }); }, []);
  const handleSent = useCallback(() => { void fetchSent(); }, [fetchSent]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncNotice(null);
    try {
      const r = await fetch('/api/admin/correo/resend-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100 }),
      });
      const data = await r.json() as { ok: boolean; message?: string; synced?: number; error?: string };
      if (data.ok) {
        setSyncNotice({ type: 'ok', msg: data.message ?? 'Sincronizado correctamente' });
        void fetchSent();
        if (folder === 'resend') void fetchResend();
      } else {
        setSyncNotice({ type: 'err', msg: data.error ?? 'Error al sincronizar' });
      }
    } catch (e) {
      setSyncNotice({ type: 'err', msg: (e as Error).message });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncNotice(null), 5000);
    }
  }, [fetchSent, fetchResend, folder]);

  const isResendFolder = folder === 'resend';
  const activeDetail = isResendFolder ? resendSelected : selected;

  // ── Render ────────────────────────────────────────────────────────────────

  // Stats items shared between mobile/desktop renders
  const statsItems = emailStats ? [
    { label: 'Enviados',  value: String(emailStats.enviado),              icon: Send,          color: 'text-zinc-400'   },
    { label: 'Entrega',   value: `${emailStats.deliveryRate.toFixed(1)}%`, icon: CheckCircle2,  color: 'text-emerald-400' },
    { label: 'Apertura',  value: `${emailStats.openRate.toFixed(1)}%`,     icon: Eye,           color: 'text-blue-400'    },
    { label: 'Rebotes',   value: String(emailStats.rebotado),             icon: AlertCircle,   color: emailStats.bounceRate > 5 ? 'text-red-400' : 'text-zinc-600' },
  ] : [];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#09090b]">

      {/* ── Desktop Header (lg+) ── */}
      <header className="hidden lg:flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#09090b]/95 backdrop-blur-md px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <MailOpen className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">Correo</h1>
            <p className="text-[10px] text-zinc-600 mt-0.5 leading-none">Powered by Resend</p>
          </div>
        </div>

        {/* Resend status badge */}
        {!loadingSent && (
          <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold border ${
            resendConfigured
              ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-400'
              : 'border-red-500/20 bg-red-500/[0.07] text-red-400'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${resendConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            {resendConfigured ? 'Conectado' : 'Sin configurar'}
          </div>
        )}

        {/* Desktop stats strip */}
        {emailStats && (
          <div className="flex items-center gap-4 ml-2">
            {statsItems.map(({ label, value, icon: Icon, color }, i, arr) => (
              <div key={label} className="flex items-center gap-2 shrink-0">
                <Icon className={`h-3.5 w-3.5 ${color} shrink-0`} />
                <span className="text-sm font-bold text-white tabular-nums">{value}</span>
                <span className="text-[11px] text-zinc-600">{label}</span>
                {i < arr.length - 1 && <span className="ml-1 h-3.5 w-px bg-white/[0.08]" />}
              </div>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {unread > 0 && (
            <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">{unread}</span>
          )}
          {resendConfigured && (
            <button
              onClick={() => void handleSync()}
              disabled={syncing}
              title="Importar correos de Resend a la base de datos"
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.05] disabled:opacity-40 transition-colors"
            >
              {syncing
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Download className="h-3.5 w-3.5" />}
              <span>{syncing ? 'Importando…' : 'Importar Resend'}</span>
            </button>
          )}
          <button
            onClick={() => {
              if (isResendFolder) void fetchResend();
              else refresh();
            }}
            disabled={loading || loadingResend}
            title="Actualizar"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05] disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${(loading || loadingResend) ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setCompose({})}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-amber-400 transition-colors">
            <MailPlus className="h-3.5 w-3.5" />
            Redactar
          </button>
        </div>
      </header>

      {/* ── Mobile Header (below lg) ── */}
      <header className="flex lg:hidden h-12 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#09090b]/95 backdrop-blur-md px-3">
        {mobileView === 'detail' && activeDetail ? (
          /* Mobile detail sticky header */
          <>
            <button
              onClick={() => setMobileView('list')}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <p className="flex-1 truncate text-sm font-semibold text-white">
              {'subject' in activeDetail ? activeDetail.subject : activeDetail.asunto}
            </p>
          </>
        ) : (
          /* Mobile list header */
          <>
            <div className="flex items-center gap-2 flex-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                <MailOpen className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <h1 className="text-sm font-bold text-white leading-none">Correo</h1>
              {unread > 0 && (
                <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums leading-none">{unread}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {resendConfigured && (
                <button
                  onClick={() => void handleSync()}
                  disabled={syncing}
                  title="Importar Resend"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05] disabled:opacity-40 transition-colors"
                >
                  {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                </button>
              )}
              <button
                onClick={() => {
                  if (isResendFolder) void fetchResend();
                  else refresh();
                }}
                disabled={loading || loadingResend}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05] disabled:opacity-40 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${(loading || loadingResend) ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </>
        )}
      </header>

      {/* ── Mobile compact stats strip ── */}
      {emailStats && mobileView === 'list' && (
        <div className="flex lg:hidden gap-3 overflow-x-auto border-b border-white/[0.06] bg-[#18181b]/40 px-3 py-1.5 shrink-0">
          {statsItems.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-1 shrink-0">
              <Icon className={`h-3 w-3 ${color} shrink-0`} />
              <span className="text-[10px] font-bold text-white tabular-nums">{value}</span>
              <span className="text-[10px] text-zinc-600">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Resend not configured banner ── */}
      {!loadingSent && !resendConfigured && !resendBannerDismissed && (
        <div className="shrink-0 flex items-center gap-3 border-b border-amber-500/20 bg-amber-500/[0.05] px-4 py-2.5">
          <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300 flex-1">Resend no configurado. Agrega tu API key para enviar correos y ver el historial real.</p>
          <a href="/admin/integraciones"
            className="shrink-0 rounded-lg border border-amber-500/25 px-3 py-1 text-[11px] font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors">
            Configurar →
          </a>
          {/* Dismissible on mobile */}
          <button
            onClick={() => setResendBannerDismissed(true)}
            className="lg:hidden shrink-0 rounded-lg p-1 text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Sync notice ── */}
      {syncNotice && (
        <div className={`shrink-0 flex items-center gap-2.5 border-b px-4 py-2 text-xs transition-all ${
          syncNotice.type === 'ok'
            ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300'
            : 'border-red-500/20 bg-red-500/[0.06] text-red-300'
        }`}>
          {syncNotice.type === 'ok'
            ? <Download className="h-3.5 w-3.5 shrink-0" />
            : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
          {syncNotice.msg}
          <button onClick={() => setSyncNotice(null)} className="ml-auto text-current opacity-50 hover:opacity-100 transition-opacity">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── 3-panel layout ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Sidebar (desktop only) ── */}
        <div className="hidden lg:flex w-52 shrink-0 flex-col border-r border-white/[0.06] bg-[#18181b]">
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {([
              { key: 'all',   label: 'Todos',     icon: MailOpen, count: enviados.length + recibidos.length, badge: 0 },
              { key: 'inbox', label: 'Recibidos', icon: Inbox,    count: recibidos.length, badge: unread },
              { key: 'sent',  label: 'Enviados',  icon: Send,     count: enviados.length, badge: 0 },
            ] as const).map(({ key, label, icon: Icon, count, badge }) => (
              <button key={key}
                onClick={() => { setFolder(key); setSelected(null); setResendSelected(null); }}
                className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all ${
                  folder === key
                    ? 'bg-amber-500/10 text-amber-300 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {badge > 0 ? (
                  <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none tabular-nums">{badge}</span>
                ) : (
                  <span className="text-[10px] text-zinc-700 tabular-nums">{count}</span>
                )}
              </button>
            ))}

            {/* Divider */}
            <div className="my-2 border-t border-white/[0.04]" />

            {/* Resend real-time folder */}
            <button
              onClick={() => { setFolder('resend'); setSelected(null); setResendSelected(null); }}
              className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all ${
                folder === 'resend'
                  ? 'bg-amber-500/10 text-amber-300 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}>
              <Zap className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Historial Resend</span>
              {folder === 'resend' && resendEmails.length > 0 && (
                <span className="text-[10px] text-zinc-700 tabular-nums">{resendEmails.length}</span>
              )}
            </button>
          </nav>

          <div className="mt-auto p-2 border-t border-white/[0.06] space-y-0.5">
            <button onClick={() => setCompose({})}
              className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.03] transition-colors">
              <MailPlus className="h-3.5 w-3.5" /> Nuevo correo
            </button>
            <a href="/admin/integraciones"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-zinc-700 hover:text-zinc-500 hover:bg-white/[0.03] transition-colors">
              <Settings className="h-3.5 w-3.5" /> Configurar Resend
            </a>
          </div>
        </div>

        {/* ── Email list ── */}
        <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-80 shrink-0 border-r border-white/[0.06] bg-[#09090b] overflow-hidden`}>
          {/* Search */}
          <div className="shrink-0 border-b border-white/[0.06] p-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
              <svg className="h-3.5 w-3.5 text-zinc-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar…"
                className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-600 focus:outline-none" />
              {search && (
                <button onClick={() => setSearch('')} className="text-zinc-600 hover:text-white transition-colors">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* List content */}
          <div className="flex-1 overflow-y-auto">
            {isResendFolder ? (
              // ── Resend real-time list ──
              loadingResend ? <Skeleton /> :
              resendError ? (
                <div className="flex flex-col items-center justify-center gap-4 p-6 h-full">
                  <AlertCircle className="h-8 w-8 text-red-400/60" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-zinc-500">Error al cargar</p>
                    <p className="text-xs text-zinc-700 mt-1 max-w-[200px] mx-auto">{resendError}</p>
                  </div>
                  <button onClick={() => void fetchResend()}
                    className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                    <RefreshCw className="h-3.5 w-3.5" /> Reintentar
                  </button>
                </div>
              ) :
              filteredResend.length === 0 ? <EmptyState folder="resend" /> :
              <>
                {/* Banner: save to BD — collapsible on mobile */}
                <div className="flex items-center gap-2 border-b border-white/[0.04] bg-zinc-900/40 px-4 py-2">
                  <Zap className="h-3 w-3 text-amber-500/60 shrink-0" />
                  {/* Desktop always shows full text */}
                  <span className="hidden lg:inline text-[10px] text-zinc-600 flex-1">Tiempo real · no guardado en BD</span>
                  {/* Mobile collapsed */}
                  <span className="lg:hidden text-[10px] text-zinc-600 flex-1">
                    {resendSaveBannerCollapsed ? 'Resend en vivo' : 'Tiempo real · no guardado en BD'}
                  </span>
                  <button
                    onClick={() => void handleSync()}
                    disabled={syncing}
                    className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1 text-[10px] font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.05] disabled:opacity-40 transition-colors shrink-0"
                  >
                    {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                    <span className={resendSaveBannerCollapsed ? 'hidden' : ''}>Guardar en BD</span>
                  </button>
                  <button
                    onClick={() => setResendSaveBannerCollapsed((v) => !v)}
                    className="lg:hidden text-zinc-700 hover:text-zinc-500 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {filteredResend.map((email) => (
                  <ResendRow
                    key={email.id}
                    item={email}
                    selected={resendSelected?.id === email.id}
                    onClick={() => void handleSelectResend(email)}
                  />
                ))}
              </>
            ) : (
              // ── DB list ──
              loading ? <Skeleton /> :
              allItems.length === 0 ? <EmptyState folder={folder} /> :
              allItems.map((item) => (
                <EmailRow
                  key={`${item._kind}-${item.id}`}
                  item={item}
                  selected={selected?._kind === item._kind && selected?.id === item.id}
                  onClick={() => void handleSelect(item)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Detail panel ── */}
        <div className={`${mobileView === 'detail' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col min-w-0 bg-[#09090b] overflow-hidden`}>
          {isResendFolder && resendSelected ? (
            <ResendDetail
              item={resendSelected}
              loading={loadingDetail}
              onBack={() => setMobileView('list')}
            />
          ) : !isResendFolder && selected ? (
            <EmailDetail
              item={selected}
              onBack={() => setMobileView('list')}
              onReply={handleReply}
              onMarkRead={handleMarkRead}
            />
          ) : (
            /* Desktop-only empty state */
            <div className="hidden lg:flex flex-col items-center justify-center h-full gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-[#18181b]">
                {isResendFolder
                  ? <Zap className="h-7 w-7 text-zinc-700" />
                  : <MailOpen className="h-7 w-7 text-zinc-700" />}
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-zinc-600">
                  {isResendFolder ? 'Selecciona un correo de Resend' : 'Selecciona un correo'}
                </p>
                <p className="text-xs text-zinc-800 mt-1">para ver su contenido aquí</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom tabs (mobile only) ── */}
      <nav className="flex lg:hidden h-16 shrink-0 items-stretch border-t border-white/[0.06] bg-[#09090b]/95 backdrop-blur-md pb-safe">
        {MOBILE_TABS.map(({ folder: tabFolder, label, icon: Icon }) => {
          const isActive = folder === tabFolder;
          const badge = tabFolder === 'inbox' ? unread : 0;
          return (
            <button
              key={tabFolder}
              onClick={() => {
                setFolder(tabFolder);
                setSelected(null);
                setResendSelected(null);
                setMobileView('list');
              }}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-amber-400" />
              )}
              <Icon className="h-5 w-5" />
              <span className="text-[10px] leading-none">{label}</span>
              {badge > 0 && (
                <span className="absolute top-2 right-1/4 translate-x-1/2 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-bold text-white leading-none">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Mobile FAB (Redactar) ── */}
      <button
        onClick={() => setCompose({})}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 shadow-lg shadow-amber-500/25 hover:bg-amber-400 active:scale-95 transition-all lg:hidden"
        aria-label="Redactar correo"
      >
        <MailPlus className="h-6 w-6 text-black" />
      </button>

      {/* Compose Modal */}
      {compose !== null && (
        <ComposeModal
          onClose={() => setCompose(null)}
          onSent={handleSent}
          initialTo={compose.to}
          initialSubject={compose.subject}
          fromAddress={fromAddress}
        />
      )}
    </div>
  );
}

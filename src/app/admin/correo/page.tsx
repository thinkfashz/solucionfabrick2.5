'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Eye,
  Inbox,
  Loader2,
  MailOpen,
  MailPlus,
  RefreshCw,
  Reply,
  Send,
  Sparkles,
  TrendingUp,
  X,
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

type Folder = 'inbox' | 'sent' | 'all';

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

const ESTADO_STYLES: Record<string, string> = {
  enviado:   'border-zinc-600   text-zinc-300   bg-zinc-900/60',
  entregado: 'border-emerald-600/50 text-emerald-300 bg-emerald-900/20',
  abierto:   'border-blue-600/50   text-blue-300   bg-blue-900/20',
  rebotado:  'border-red-600/50    text-red-300    bg-red-900/20',
  spam:      'border-orange-600/50 text-orange-300 bg-orange-900/20',
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: 'blue' | 'emerald' | 'yellow' | 'purple' | 'red';
}) {
  const colors = {
    blue:    'text-blue-400   bg-blue-500/10   border-blue-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    yellow:  'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    purple:  'text-purple-400 bg-purple-500/10 border-purple-500/20',
    red:     'text-red-400    bg-red-500/10    border-red-500/20',
  };
  const El = Icon as React.ComponentType<{ className?: string }>;
  const textColor = colors[color].split(' ')[0] ?? '';
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 ${colors[color]}`}>
      <El className={`h-5 w-5 shrink-0 ${textColor}`} />
      <div className="min-w-0">
        <p className="text-lg font-black leading-none text-white">{value}</p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const cls = ESTADO_STYLES[estado] ?? 'border-zinc-700 text-zinc-400';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {estado}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3 p-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 rounded-xl p-3 animate-pulse">
          <div className="h-9 w-9 shrink-0 rounded-full bg-white/8" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 rounded bg-white/8" />
            <div className="h-2 w-1/2 rounded bg-white/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Compose Modal ────────────────────────────────────────────────────────────

interface ComposeProps {
  onClose: () => void;
  onSent: () => void;
  initialTo?: string;
  initialSubject?: string;
}

const AI_PRESETS = [
  { label: 'Profesional', prompt: 'Convierte este correo a un estilo profesional y corporativo. Usa colores oscuros, tipografía limpia, sin emojis.' },
  { label: 'Oscuro', prompt: 'Dale un estilo moderno dark con fondo negro/zinc, texto blanco, acentos en amarillo o dorado. Muy premium.' },
  { label: 'Minimalista', prompt: 'Hazlo minimalista: fondo blanco, texto negro, sin imágenes, solo tipografía y espaciado.' },
];

function ComposeModal({ onClose, onSent, initialTo = '', initialSubject = '' }: ComposeProps) {
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState('<p>Hola,</p><p><br/></p><p>Saludos,<br/>Soluciones Fabrick</p>');
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [instruccion, setInstruccion] = useState('');
  const originalRef = useRef(body);

  const handleSend = useCallback(async () => {
    if (!to.includes('@')) { setNotice({ type: 'err', msg: 'Destinatario inválido' }); return; }
    if (!subject.trim()) { setNotice({ type: 'err', msg: 'Asunto requerido' }); return; }
    setSending(true);
    setNotice(null);
    try {
      const r = await fetch('/api/admin/correo/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, html: body }),
      });
      const data = await r.json() as { ok: boolean; error?: string };
      if (!data.ok) { setNotice({ type: 'err', msg: data.error ?? 'Error al enviar' }); return; }
      setNotice({ type: 'ok', msg: '¡Correo enviado correctamente!' });
      setTimeout(() => { onSent(); onClose(); }, 1500);
    } finally { setSending(false); }
  }, [to, subject, body, onSent, onClose]);

  const handleAi = useCallback(async (presetPrompt?: string) => {
    const prompt = presetPrompt ?? instruccion;
    if (!prompt.trim()) { setNotice({ type: 'err', msg: 'Escribe una instrucción' }); return; }
    setAiLoading(true); setNotice(null);
    try {
      const r = await fetch('/api/admin/correo/ai-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, currentHtml: body }),
      });
      const data = await r.json() as { ok: boolean; html?: string; error?: string };
      if (!data.ok || !data.html) { setNotice({ type: 'err', msg: data.error ?? 'Sin respuesta de IA' }); return; }
      originalRef.current = body;
      setBody(data.html);
    } finally { setAiLoading(false); }
  }, [instruccion, body]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex w-full max-w-2xl flex-col rounded-t-2xl sm:rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl max-h-[95dvh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <MailPlus className="h-4 w-4 text-amber-400" />
            Nuevo correo
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-white/8 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Fields */}
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Para</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="destinatario@email.com"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Asunto</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Asunto del correo"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {/* AI toolbar */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Asistente IA
            </p>
            <div className="flex flex-wrap gap-1.5">
              {AI_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => void handleAi(p.prompt)}
                  disabled={aiLoading}
                  className="rounded-full border border-white/10 bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:border-amber-500/40 hover:text-amber-300 transition-colors disabled:opacity-50"
                >
                  {p.label}
                </button>
              ))}
              {body !== originalRef.current && (
                <button
                  onClick={() => setBody(originalRef.current)}
                  className="rounded-full border border-white/10 bg-zinc-800 px-3 py-1 text-xs text-zinc-500 hover:text-white transition-colors"
                >
                  ↩ Restaurar
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={instruccion}
                onChange={(e) => setInstruccion(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleAi(); }}
                placeholder="Ej: hazlo más formal, agrega firma..."
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none"
              />
              <button
                onClick={() => void handleAi()}
                disabled={aiLoading || !instruccion.trim()}
                className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-40 transition-colors"
              >
                {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Generar'}
              </button>
            </div>
          </div>

          {/* Body / Preview toggle */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Cuerpo HTML</label>
              <button
                onClick={() => setPreview(!preview)}
                className="ml-auto rounded-full border border-white/10 px-3 py-0.5 text-[10px] text-zinc-400 hover:text-white transition-colors"
              >
                {preview ? 'Editar' : 'Vista previa'}
              </button>
            </div>
            {preview ? (
              <div className="h-48 overflow-auto rounded-lg border border-white/10 bg-white">
                <iframe
                  srcDoc={body}
                  sandbox=""
                  className="h-full w-full"
                  title="Preview"
                />
              </div>
            ) : (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-mono text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none resize-none"
              />
            )}
          </div>

          {notice && (
            <div className={`rounded-lg px-4 py-2.5 text-sm ${notice.type === 'ok' ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-600/30' : 'bg-red-900/30 text-red-300 border border-red-600/30'}`}>
              {notice.msg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-white/8 px-5 py-4">
          <button onClick={onClose} className="text-sm text-zinc-500 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50 transition-colors"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Email List Row ────────────────────────────────────────────────────────────

function EmailRow({
  item,
  selected,
  onClick,
}: {
  item: EmailItem;
  selected: boolean;
  onClick: () => void;
}) {
  const isReceived = item._kind === 'received';
  const sender = isReceived ? item.de : item.destinatario;
  const date = isReceived ? item.fecha_recibido : item.enviado_at;
  const isUnread = isReceived && !item.leido;
  const snippet = isReceived
    ? item.cuerpo_texto.slice(0, 80)
    : '';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl transition-all ${
        selected
          ? 'bg-amber-500/10 border border-amber-500/20'
          : 'hover:bg-white/5 border border-transparent'
      } ${isUnread ? 'font-semibold' : ''}`}
    >
      {/* Avatar */}
      <div className={`h-9 w-9 shrink-0 rounded-full ${avatarColor(sender)} flex items-center justify-center text-white text-sm font-bold`}>
        {avatarInitial(sender)}
      </div>

      <div className="flex-1 min-w-0">
        {/* Top row */}
        <div className="flex items-center justify-between gap-1">
          <span className={`truncate text-sm ${isUnread ? 'text-white' : 'text-zinc-200'}`}>
            {sender || '(sin remitente)'}
          </span>
          <span className="shrink-0 text-[10px] text-zinc-500">{relDate(date)}</span>
        </div>
        {/* Subject */}
        <p className={`truncate text-xs mt-0.5 ${isUnread ? 'text-zinc-200' : 'text-zinc-400'}`}>
          {item.asunto || '(sin asunto)'}
        </p>
        {/* Snippet / badge */}
        <div className="flex items-center gap-2 mt-1">
          {snippet && (
            <p className="flex-1 truncate text-[11px] text-zinc-600 line-clamp-1">
              {snippet}
            </p>
          )}
          {isUnread && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
          )}
          {!isReceived && (
            <EstadoBadge estado={item.estado} />
          )}
          {isReceived && item.respondido && (
            <span className="shrink-0 text-[10px] text-zinc-600">↩</span>
          )}
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-700 mt-1" />
    </button>
  );
}

// ─── Email Detail ──────────────────────────────────────────────────────────────

function EmailDetail({
  item,
  onBack,
  onReply,
  onMarkRead,
}: {
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
      {/* Header bar */}
      <div className="flex items-center gap-3 border-b border-white/8 px-4 py-4 shrink-0">
        <button onClick={onBack} className="lg:hidden rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-white/8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className={`h-10 w-10 shrink-0 rounded-full ${avatarColor(from)} flex items-center justify-center text-white font-bold`}>
          {avatarInitial(from)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold text-white">{item.asunto || '(sin asunto)'}</p>
          <p className="truncate text-xs text-zinc-400 mt-0.5">
            {from} → {to}
          </p>
        </div>
        <span className="shrink-0 text-xs text-zinc-500">{fullDate(date)}</span>
      </div>

      {/* Metadata */}
      <div className="border-b border-white/8 px-5 py-3 flex flex-wrap gap-3 items-center shrink-0">
        {!isReceived && <EstadoBadge estado={item.estado} />}
        {isReceived && (
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-300">Recibido</span>
        )}
        {!isReceived && item.tipo === 'manual' && (
          <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-500">manual</span>
        )}
        {item.resend_id && (
          <span className="text-[10px] text-zinc-600 font-mono truncate max-w-[200px]" title={item.resend_id}>
            Resend: {item.resend_id}
          </span>
        )}
        <span className="ml-auto text-[11px] text-zinc-500">{fullDate(date)}</span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {isReceived ? (
          hasHtml ? (
            <iframe
              srcDoc={item.cuerpo_html}
              sandbox=""
              className="h-full w-full bg-white"
              title="Correo recibido"
            />
          ) : hasText ? (
            <div className="h-full overflow-y-auto p-5">
              <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans">{item.cuerpo_texto}</pre>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-600 text-sm">
              Sin contenido
            </div>
          )
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-600 p-6">
            <Send className="h-8 w-8 opacity-30" />
            <p className="text-sm text-center">El cuerpo de los correos enviados no se almacena en la base de datos.</p>
            <p className="text-xs text-zinc-700 text-center">Puedes ver el estado de entrega en el badge de arriba.</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-white/8 px-4 py-3 flex flex-wrap items-center gap-2 shrink-0">
        {isReceived && (
          <>
            <button
              onClick={() => onReply(item.de, `Re: ${item.asunto}`)}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 transition-colors"
            >
              <Reply className="h-3.5 w-3.5" />
              Responder
            </button>
            {!item.leido && (
              <button
                onClick={() => onMarkRead(item.id)}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/8 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar leído
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
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/8 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {archived ? 'Guardado ✓' : 'Guardar en historial'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ folder }: { folder: Folder }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-600 p-8">
      {folder === 'inbox' ? (
        <Inbox className="h-12 w-12 opacity-30" />
      ) : (
        <Send className="h-12 w-12 opacity-30" />
      )}
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-500">
          {folder === 'inbox' ? 'Bandeja vacía' : folder === 'sent' ? 'Sin correos enviados' : 'Sin correos'}
        </p>
        <p className="text-xs mt-1">
          {folder === 'inbox'
            ? 'Los correos recibidos en tu dominio Resend aparecerán aquí'
            : 'Los correos enviados desde este panel aparecerán aquí'}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CorreoPage() {
  // Data state
  const [recibidos, setRecibidos] = useState<RecibidoRow[]>([]);
  const [enviados, setEnviados] = useState<EnviadoRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [emailStats, setEmailStats] = useState<StatsData | null>(null);
  const [resendConfigured, setResendConfigured] = useState(true);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingSent, setLoadingSent] = useState(true);

  // UI state
  const [folder, setFolder] = useState<Folder>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<EmailItem | null>(null);
  const [compose, setCompose] = useState<{ to?: string; subject?: string } | null>(null);
  // mobile: 'list' shows list panel, 'detail' shows detail panel
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  // Fetch functions
  const fetchInbox = useCallback(async (signal?: AbortSignal) => {
    setLoadingInbox(true);
    try {
      const r = await fetch('/api/admin/correo/inbox', { signal, cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json() as { ok: boolean; emails: RecibidoRow[]; unread: number };
      if (data.ok) {
        setRecibidos(data.emails ?? []);
        setUnread(data.unread ?? 0);
      }
    } catch { /* ignore abort */ }
    finally { setLoadingInbox(false); }
  }, []);

  const fetchSent = useCallback(async (signal?: AbortSignal) => {
    setLoadingSent(true);
    try {
      const r = await fetch('/api/admin/correo/stats', { signal, cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json() as { ok: boolean; recent: EnviadoRow[]; stats: StatsData; resendConfigured: boolean };
      if (data.ok) {
        setEnviados(data.recent ?? []);
        setEmailStats(data.stats ?? null);
        setResendConfigured(data.resendConfigured ?? false);
      }
    } catch { /* ignore abort */ }
    finally { setLoadingSent(false); }
  }, []);

  const refresh = useCallback(() => {
    const ctrl = new AbortController();
    void fetchInbox(ctrl.signal);
    void fetchSent(ctrl.signal);
    return ctrl;
  }, [fetchInbox, fetchSent]);

  // Initial load + 30s auto-refresh
  useEffect(() => {
    const ctrl = refresh();
    const interval = setInterval(() => { void refresh(); }, 30_000);
    return () => { ctrl.abort(); clearInterval(interval); };
  }, [refresh]);

  // Combined + filtered list
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

  const loading = loadingInbox || loadingSent;

  const handleSelect = useCallback(async (item: EmailItem) => {
    setSelected(item);
    setMobileView('detail');
    if (item._kind === 'received' && !item.leido) {
      // Optimistic update
      setRecibidos((prev) => prev.map((e) => e.id === item.id ? { ...e, leido: true } : e));
      await fetch('/api/admin/correo/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, action: 'leido' }),
      }).catch(() => {});
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

  const handleReply = useCallback((to: string, subject: string) => {
    setCompose({ to, subject });
  }, []);

  const handleSent = useCallback(() => {
    void fetchSent();
  }, [fetchSent]);

  const isRefreshing = loading;

  return (
    <>
      {/* Header */}
      <div className="border-b border-white/8 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-20 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <MailOpen className="h-4 w-4 text-amber-400" />
            Centro de Correo
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {unread > 0 ? (
              <span className="text-blue-400">{unread} sin leer · </span>
            ) : null}
            {enviados.length} enviados · {recibidos.length} recibidos
          </p>
        </div>
        <button
          onClick={() => refresh()}
          disabled={isRefreshing}
          className="rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-white/8 transition-colors"
          title="Actualizar"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={() => setCompose({})}
          className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-colors"
        >
          <MailPlus className="h-3.5 w-3.5" />
          Redactar
        </button>
      </div>

      {/* Resend status + stats bar */}
      {!resendConfigured && (
        <div className="mx-4 mt-3 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 flex items-center gap-3">
          <TrendingUp className="h-4 w-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">
            Resend no está configurado.{' '}
            <Link href="/admin/integraciones" className="underline hover:text-amber-200">
              Configura tu API key →
            </Link>
          </p>
        </div>
      )}

      {emailStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 pt-3">
          <StatCard icon={Send}        label="Enviados"       value={emailStats.enviado}                              color="blue" />
          <StatCard icon={CheckCircle2} label="Entregados"    value={`${emailStats.deliveryRate.toFixed(0)}%`}        color="emerald" />
          <StatCard icon={Eye}         label="Tasa apertura"  value={`${emailStats.openRate.toFixed(0)}%`}            color="yellow" />
          <StatCard icon={TrendingUp}  label="Rebotes"        value={emailStats.rebotado}                             color={emailStats.bounceRate > 5 ? 'red' : 'purple'} />
        </div>
      )}

      {/* 3-panel layout */}
      <div className={`flex overflow-hidden ${emailStats ? 'h-[calc(100dvh-12rem)]' : 'h-[calc(100dvh-7rem)]'}`}>

        {/* ── Sidebar ── */}
        <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} lg:flex w-full lg:w-52 shrink-0 flex-col border-r border-white/8 bg-zinc-950/60 overflow-y-auto`}>
          <nav className="p-3 space-y-1">
            {([
              { key: 'all',   label: 'Todos',      icon: MailOpen, count: enviados.length + recibidos.length, badge: 0 },
              { key: 'inbox', label: 'Recibidos',  icon: Inbox,    count: recibidos.length, badge: unread },
              { key: 'sent',  label: 'Enviados',   icon: Send,     count: enviados.length, badge: 0 },
            ] as const).map(({ key, label, icon: Icon, count, badge }) => (
              <button
                key={key}
                onClick={() => { setFolder(key); setSelected(null); }}
                className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all ${
                  folder === key
                    ? 'bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {badge !== undefined && badge > 0 ? (
                  <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                    {badge}
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-700">{count}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Compose shortcut in sidebar */}
          <div className="mt-auto p-3 border-t border-white/8">
            <button
              onClick={() => setCompose({})}
              className="w-full flex items-center gap-2 rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-xs text-zinc-500 hover:text-white hover:border-white/20 transition-colors"
            >
              <MailPlus className="h-3.5 w-3.5" />
              Nuevo correo
            </button>
          </div>
        </div>

        {/* ── Email List ── */}
        <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-80 shrink-0 border-r border-white/8 bg-zinc-950/30 overflow-hidden`}>
          {/* Search */}
          <div className="border-b border-white/8 p-3">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <svg className="h-3.5 w-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por asunto o remitente…"
                className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-600 focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-zinc-600 hover:text-white">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex gap-1.5 px-3 py-2 border-b border-white/8 overflow-x-auto">
            {folder === 'inbox' && (
              <>
                {['Todos','No leídos','Respondidos'].map((f) => (
                  <button key={f} className="shrink-0 rounded-full border border-white/10 bg-zinc-800/60 px-2.5 py-1 text-[11px] text-zinc-400 hover:text-white transition-colors">
                    {f}
                  </button>
                ))}
              </>
            )}
            {folder === 'sent' && (
              <>
                {['Todos','Entregado','Abierto','Rebotado'].map((f) => (
                  <button key={f} className="shrink-0 rounded-full border border-white/10 bg-zinc-800/60 px-2.5 py-1 text-[11px] text-zinc-400 hover:text-white transition-colors">
                    {f}
                  </button>
                ))}
              </>
            )}
            {folder === 'all' && (
              <>
                {['Todos','Recibidos','Enviados'].map((f) => (
                  <button key={f} className="shrink-0 rounded-full border border-white/10 bg-zinc-800/60 px-2.5 py-1 text-[11px] text-zinc-400 hover:text-white transition-colors">
                    {f}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <Skeleton />
            ) : allItems.length === 0 ? (
              <EmptyState folder={folder} />
            ) : (
              <div className="p-2 space-y-0.5">
                {allItems.map((item) => (
                  <EmailRow
                    key={`${item._kind}-${item.id}`}
                    item={item}
                    selected={selected?._kind === item._kind && selected?.id === item.id}
                    onClick={() => void handleSelect(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Detail Panel ── */}
        <div className={`${mobileView === 'detail' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col min-w-0 bg-zinc-950/10 overflow-hidden`}>
          {selected ? (
            <EmailDetail
              item={selected}
              onBack={() => setMobileView('list')}
              onReply={handleReply}
              onMarkRead={handleMarkRead}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-700">
              <MailOpen className="h-14 w-14 opacity-20" />
              <div className="text-center">
                <p className="text-sm font-medium">Selecciona un correo</p>
                <p className="text-xs mt-1 text-zinc-800">para ver su contenido aquí</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {compose !== null && (
        <ComposeModal
          onClose={() => setCompose(null)}
          onSent={handleSent}
          initialTo={compose.to}
          initialSubject={compose.subject}
        />
      )}
    </>
  );
}

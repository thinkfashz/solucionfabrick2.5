'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Inbox, Instagram, Facebook, MessageCircle, ShoppingBag, Plus, RefreshCw, Sparkles } from 'lucide-react';

/**
 * Inbox social — versión conectada.
 *
 * - Lista mensajes desde GET /api/admin/social/inbox (poblado por el
 *   webhook receptor en /api/admin/social/webhook/[provider]).
 * - Botón "Conectar" inicia el flujo OAuth en
 *   /api/admin/social/oauth/[provider]/start.
 * - El estado de conexión se infiere de los mensajes recibidos (si
 *   hay al menos uno del provider, está conectado). Más adelante se
 *   reemplazará por una consulta a `integrations` (provider=`social_*`).
 */

type ProviderId = 'instagram' | 'facebook' | 'whatsapp' | 'mercadolibre';

const PROVIDERS: Array<{ id: ProviderId; label: string; icon: React.ComponentType<{ className?: string }>; oauth: boolean }> = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, oauth: true },
  { id: 'facebook', label: 'Facebook', icon: Facebook, oauth: true },
  { id: 'whatsapp', label: 'WhatsApp Business', icon: MessageCircle, oauth: false },
  { id: 'mercadolibre', label: 'Mercado Libre Q&A', icon: ShoppingBag, oauth: false },
];

interface SocialMessage {
  id: string;
  provider: string;
  thread_id: string | null;
  external_id: string;
  sender: string | null;
  sender_name: string | null;
  text: string | null;
  received_at: string | null;
  read_at: string | null;
}

function StatusPill({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.18em] ${
        connected
          ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
          : 'border border-white/10 bg-white/5 text-zinc-400'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
      {connected ? 'Conectado' : 'Sin conectar'}
    </span>
  );
}

export default function SocialInboxClient() {
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);

  async function loadInbox() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/social/inbox', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || `Error ${res.status}`);
        setMessages([]);
        return;
      }
      setMessages(Array.isArray(json.messages) ? json.messages : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInbox();
  }, []);

  const connectedProviders = useMemo(() => {
    const set = new Set<string>();
    for (const m of messages) if (m.provider) set.add(m.provider);
    return set;
  }, [messages]);

  const threads = useMemo(() => {
    // Group by thread_id (or by external_id as fallback) and keep the
    // newest message per thread for the list preview.
    const byThread = new Map<string, SocialMessage>();
    for (const m of messages) {
      const key = m.thread_id || m.external_id;
      const prev = byThread.get(key);
      if (!prev || (m.received_at || '') > (prev.received_at || '')) {
        byThread.set(key, m);
      }
    }
    return Array.from(byThread.values()).sort((a, b) =>
      (b.received_at || '').localeCompare(a.received_at || ''),
    );
  }, [messages]);

  const activeThread = useMemo(() => {
    if (!selectedThread) return [];
    return messages
      .filter((m) => (m.thread_id || m.external_id) === selectedThread)
      .sort((a, b) => (a.received_at || '').localeCompare(b.received_at || ''));
  }, [messages, selectedThread]);

  function startOAuth(provider: ProviderId) {
    if (provider === 'whatsapp' || provider === 'mercadolibre') {
      alert(`OAuth para ${provider} llegará en una iteración siguiente.`);
      return;
    }
    window.location.href = `/api/admin/social/oauth/${provider}/start`;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-400/15 text-yellow-400">
            <Inbox className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Inbox social</h1>
            <p className="text-xs text-zinc-500">Mensajes unificados de Instagram, Facebook, WhatsApp y Mercado Libre.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadInbox}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300 hover:border-yellow-400/40 hover:text-yellow-400 transition disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Sincronizar
        </button>
      </header>

      {/* Connected providers strip */}
      <section className="rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Redes conectadas</p>
          <p className="text-[10px] text-zinc-600">OAuth en /api/admin/social/oauth/&#91;provider&#93;</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PROVIDERS.map((p, i) => {
            const Icon = p.icon;
            const connected = connectedProviders.has(p.id);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-white/10 bg-zinc-950/60 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-zinc-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <StatusPill connected={connected} />
                </div>
                <p className="mt-2 text-xs font-semibold text-zinc-200">{p.label}</p>
                <button
                  type="button"
                  onClick={() => startOAuth(p.id)}
                  disabled={!p.oauth}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300 hover:border-yellow-400/40 hover:text-yellow-400 transition disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                  {connected ? 'Reconectar' : 'Conectar'}
                </button>
              </motion.div>
            );
          })}
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-3 text-[12px] text-red-300">
          {error}
        </div>
      )}

      {/* Layout: conversation list / thread / customer panel */}
      <section className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-3 min-h-[320px]">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Conversaciones</p>
          {threads.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-white/10 text-center">
              <p className="px-4 text-[11px] text-zinc-500">
                Aún no hay mensajes. Conecta una red para empezar a recibir.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {threads.map((t) => {
                const key = t.thread_id || t.external_id;
                const isActive = selectedThread === key;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedThread(key)}
                      className={`w-full text-left rounded-lg px-2.5 py-2 transition ${
                        isActive ? 'bg-yellow-400/10 border border-yellow-400/30' : 'border border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-zinc-200 truncate">
                          {t.sender_name || t.sender || 'Anónimo'}
                        </p>
                        <span className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">{t.provider}</span>
                      </div>
                      <p className="mt-0.5 text-[10.5px] text-zinc-500 truncate">
                        {t.text || '(sin texto)'}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-3 min-h-[320px]">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Conversación</p>
          {activeThread.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-white/10 text-center">
              <Sparkles className="mr-2 h-4 w-4 text-yellow-400" />
              <p className="text-[11px] text-zinc-500">Selecciona un hilo para responder.</p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {activeThread.map((m) => (
                <li key={m.id} className="rounded-lg border border-white/5 bg-zinc-950/60 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                      {m.sender_name || m.sender || 'Anónimo'}
                    </p>
                    <span className="text-[9px] text-zinc-500">
                      {m.received_at ? new Date(m.received_at).toLocaleString('es-CL') : ''}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-zinc-200 whitespace-pre-wrap">{m.text || '(sin texto)'}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-3 min-h-[320px]">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Cliente</p>
          <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-white/10 text-center">
            <p className="px-4 text-[11px] text-zinc-500">Cruzaremos remitente con la tabla `clientes` por email/teléfono/handle.</p>
          </div>
        </div>
      </section>

      <p className="text-[10px] text-zinc-600">
        Webhook URL para Meta: <code className="text-zinc-400">/api/admin/social/webhook/instagram</code> ·{' '}
        <code className="text-zinc-400">/api/admin/social/webhook/facebook</code> · firma vía{' '}
        <code className="text-zinc-400">META_APP_SECRET</code>, verify token via{' '}
        <code className="text-zinc-400">META_WEBHOOK_VERIFY_TOKEN</code>.
      </p>
    </div>
  );
}

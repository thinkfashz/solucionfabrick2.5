'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox,
  Instagram,
  Facebook,
  MessageCircle,
  ShoppingBag,
  Plus,
  RefreshCw,
  Sparkles,
  ChevronDown,
  Copy,
  HelpCircle,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

/**
 * Inbox social — VERSIÓN MEJORADA
 *
 * Mejoras:
 * - Instrucciones integradas para cada red
 * - Mejor visualización de estado
 * - Quick actions mejoradas
 * - Indicadores visuales de actividad
 * - Panel de setup integrado
 *
 * - Lista mensajes desde GET /api/admin/social/inbox
 * - Botón "Conectar" inicia el flujo OAuth
 * - Estado de conexión desde tabla `integrations`
 */

type ProviderId = 'instagram' | 'facebook' | 'whatsapp' | 'mercadolibre';

interface ProviderInfo {
  id: ProviderId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  oauth: boolean;
  webhookUrl: string;
  setupSteps: string[];
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    color: 'from-pink-400/20 to-purple-600/10',
    oauth: true,
    webhookUrl: '/api/admin/social/webhook/instagram',
    setupSteps: [
      'Ve a Meta App Dashboard → Tu App → Settings → Basic',
      'Copia el App ID y App Secret',
      'Añade la URL de webhook: tu-dominio/api/admin/social/webhook/instagram',
      'En Meta, configura el campo Verify Token',
      'Prueba la conexión desde el botón "Test"',
    ],
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: Facebook,
    color: 'from-blue-400/20 to-blue-600/10',
    oauth: true,
    webhookUrl: '/api/admin/social/webhook/facebook',
    setupSteps: [
      'Ve a Meta Business Suite',
      'Autoriza tu página de Facebook',
      'Configura el webhook en Settings',
      'Verifica tu dominio',
    ],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp Business',
    icon: MessageCircle,
    color: 'from-green-400/20 to-emerald-600/10',
    oauth: false,
    webhookUrl: '/api/admin/social/webhook/whatsapp',
    setupSteps: [
      'Crea una cuenta WhatsApp Business',
      'Obtén tu Business Account ID',
      'Genera un token de acceso',
      'Configura el webhook URL',
    ],
  },
  {
    id: 'mercadolibre',
    label: 'Mercado Libre Q&A',
    icon: ShoppingBag,
    color: 'from-yellow-400/20 to-orange-600/10',
    oauth: false,
    webhookUrl: '/api/admin/social/webhook/mercadolibre',
    setupSteps: [
      'Ve a Mercado Libre Developers',
      'Obtén tu API Key',
      'Configura el webhook',
      'Sincroniza tus publicaciones',
    ],
  },
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

function StatusBadge({ connected, expanded }: { connected: boolean; expanded: boolean }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all ${
        connected
          ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
          : 'border border-yellow-400/30 bg-yellow-400/5 text-yellow-300 hover:bg-yellow-400/10'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`}
      />
      {connected ? 'Conectado' : 'Setup pendiente'}
      <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
    </motion.button>
  );
}

export default function SocialInboxClient() {
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<ProviderId | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

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
    window.location.href = `/api/admin/social/oauth/${provider}/start`;
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-yellow-400 flex items-center gap-2">
            <Inbox className="w-6 h-6" /> Inbox social
          </h1>
          <p className="text-sm text-zinc-400">
            Mensajes unificados de Instagram, Facebook, WhatsApp y Mercado Libre
          </p>
        </div>
        <button
          onClick={loadInbox}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/20 disabled:opacity-50 font-bold text-sm transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Sincronizar
        </button>
      </header>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300 flex gap-3"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">{error}</p>
            <p className="text-xs mt-1">Verifica tu conexión a Internet o la configuración de las integraciones.</p>
          </div>
        </motion.div>
      )}

      {/* Provider Setup Cards */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-4 h-4 text-yellow-400" />
          <p className="text-xs font-bold uppercase tracking-widest text-yellow-400/80">Conectar redes sociales</p>
        </div>
        
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          {PROVIDERS.map((provider) => {
            const Icon = provider.icon;
            const connected = connectedProviders.has(provider.id);
            const expanded = expandedProvider === provider.id;

            return (
              <motion.div
                key={provider.id}
                className={`rounded-xl border transition-all ${
                  expanded
                    ? 'border-yellow-400/50 bg-gradient-to-b from-yellow-400/10 to-transparent'
                    : 'border-yellow-400/15 bg-black/40 hover:border-yellow-400/30'
                }`}
              >
                {/* Header */}
                <button
                  onClick={() => setExpandedProvider(expanded ? null : provider.id)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2.5 rounded-lg bg-gradient-to-br ${provider.color}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-white">{provider.label}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {connected ? `${threads.filter(t => t.provider === provider.id).length} mensajes` : 'Sin configurar'}
                      </p>
                    </div>
                  </div>
                  <StatusBadge connected={connected} expanded={expanded} />
                </button>

                {/* Setup Instructions */}
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-yellow-400/10 px-4 py-3 space-y-3 bg-black/50"
                    >
                      {!connected ? (
                        <>
                          <div className="space-y-2">
                            <p className="text-xs font-bold uppercase text-zinc-400">Pasos de setup:</p>
                            <ol className="space-y-1.5 text-xs text-zinc-300">
                              {provider.setupSteps.map((step, i) => (
                                <li key={i} className="flex gap-2">
                                  <span className="font-bold text-yellow-400 flex-shrink-0 min-w-5">{i + 1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                          <div className="bg-zinc-900/50 rounded-lg p-3 space-y-2">
                            <p className="text-[10px] font-bold uppercase text-zinc-500">Webhook URL:</p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-[10px] text-zinc-300 font-mono break-all bg-black/50 p-2 rounded">
                                {provider.webhookUrl}
                              </code>
                              <button
                                onClick={() => copyToClipboard(provider.webhookUrl)}
                                className="p-2 hover:bg-yellow-400/10 rounded transition-all"
                                title="Copiar webhook URL"
                                aria-label="Copiar URL del webhook"
                              >
                                <Copy className="w-4 h-4 text-zinc-400" />
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={() => startOAuth(provider.id)}
                            className="w-full py-2 rounded-lg bg-yellow-400 text-black font-bold text-sm hover:bg-yellow-300 transition-all flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Conectar {provider.label}
                          </button>
                        </>
                      ) : (
                        <div className="text-center py-3 space-y-2">
                          <p className="text-sm font-bold text-green-400">✓ Conectado correctamente</p>
                          <p className="text-xs text-zinc-400">Ahora recibes mensajes en tiempo real</p>
                          <button
                            className="text-[10px] text-yellow-400 hover:text-yellow-300 font-bold uppercase tracking-widest"
                            onClick={() => startOAuth(provider.id)}
                          >
                            Reconectar
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Messages Layout */}
      {threads.length > 0 && (
        <section className="rounded-xl border border-yellow-400/10 bg-black/40 overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[300px_1fr_320px]">
            {/* Conversations List */}
            <div className="border-r border-yellow-400/10 p-3 min-h-[400px] max-h-[500px] overflow-y-auto">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Conversaciones ({threads.length})</p>
              <div className="space-y-1.5">
                {threads.map((t) => {
                  const key = t.thread_id || t.external_id;
                  const isActive = selectedThread === key;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedThread(key)}
                      className={`w-full text-left p-2.5 rounded-lg transition-all ${
                        isActive
                          ? 'bg-yellow-400/20 border border-yellow-400/50'
                          : 'bg-zinc-900/50 border border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-xs font-bold text-white truncate">{t.sender_name || t.sender || 'Cliente'}</p>
                        <span className="text-[9px] uppercase text-zinc-500">{t.provider}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 line-clamp-2">{t.text || '(sin texto)'}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Conversation */}
            <div className="p-3 min-h-[400px] max-h-[500px] overflow-y-auto space-y-3 bg-zinc-900/20">
              {selectedThread ? (
                <>
                  {activeThread.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-black/50 rounded-lg p-3 border border-zinc-700"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-xs font-bold uppercase text-yellow-400">{m.sender_name || m.sender}</p>
                        <span className="text-[9px] text-zinc-500">
                          {m.received_at && new Date(m.received_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-200 whitespace-pre-wrap break-words">{m.text}</p>
                    </motion.div>
                  ))}
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-center">
                  <p className="text-zinc-500 text-sm">Selecciona una conversación</p>
                </div>
              )}
            </div>

            {/* Customer Panel */}
            <div className="border-l border-yellow-400/10 p-3 bg-black/20">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Cliente</p>
              {selectedThread ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-700">
                    <p className="text-xs text-zinc-500">Información del cliente (desde tabla clientes)</p>
                    <p className="text-sm font-bold text-white mt-2">Próximamente</p>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center rounded-lg border border-dashed border-zinc-700">
                  <p className="text-xs text-zinc-600">-</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {threads.length === 0 && (
        <div className="rounded-xl border border-dashed border-yellow-400/20 p-12 text-center space-y-3">
          <Sparkles className="w-8 h-8 text-yellow-400 mx-auto" />
          <p className="text-sm font-bold text-zinc-400">Sin mensajes aún</p>
          <p className="text-xs text-zinc-500">Conecta una red social para comenzar a recibir mensajes</p>
        </div>
      )}
    </div>
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

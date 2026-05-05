'use client';

/**
 * Extensions & Integrations Manager
 *
 * Sistema completo de:
 * - Snippets reutilizables (código, configuración)
 * - Webhooks (crear, editar, probar, signing keys)
 * - OAuth (múltiples providers, testing)
 * - Integraciones (estado, configuración)
 */

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Code,
  Zap,
  Lock,
  Eye,
  EyeOff,
  Settings,
  Play,
  Loader2,
  ChevronDown,
  Shield,
} from 'lucide-react';

interface Snippet {
  id: string;
  name: string;
  code: string;
  language: string;
  tags: string[];
  createdAt: Date;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  signingKey: string;
  active: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  failureCount: number;
}

interface OAuthFlow {
  provider: string;
  clientId: string;
  clientSecret?: string;
  scopes: string[];
  configured: boolean;
  testResult?: 'success' | 'failed' | 'pending';
}

const WEBHOOK_EVENTS = [
  'payment.created',
  'payment.completed',
  'order.created',
  'order.updated',
  'user.registered',
  'user.updated',
  'product.updated',
];

const OAUTH_PROVIDERS = [
  {
    name: 'Google',
    clientId: 'YOUR_CLIENT_ID',
    scopes: ['openid', 'email', 'profile'],
  },
  {
    name: 'GitHub',
    clientId: 'YOUR_CLIENT_ID',
    scopes: ['user:email', 'read:user'],
  },
  {
    name: 'Meta',
    clientId: 'YOUR_APP_ID',
    scopes: ['email', 'public_profile'],
  },
];

export default function ExtensionsPage() {
  const [activeTab, setActiveTab] = useState<'snippets' | 'webhooks' | 'oauth'>('snippets');
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [oauthFlows, setOauthFlows] = useState<OAuthFlow[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState<Set<string>>(new Set());
  const [testingId, setTestingId] = useState<string | null>(null);

  // Snippet management
  const addSnippet = useCallback(() => {
    const newSnippet: Snippet = {
      id: Math.random().toString(36).substring(7),
      name: 'Nueva snippet',
      code: '// Aquí va tu código',
      language: 'javascript',
      tags: [],
      createdAt: new Date(),
    };
    setSnippets((prev) => [newSnippet, ...prev]);
  }, []);

  const updateSnippet = useCallback((id: string, patch: Partial<Snippet>) => {
    setSnippets((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const deleteSnippet = useCallback((id: string) => {
    setSnippets((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Webhook management
  const addWebhook = useCallback(() => {
    const newWebhook: Webhook = {
      id: Math.random().toString(36).substring(7),
      name: 'Nuevo webhook',
      url: '',
      events: [],
      signingKey: 'sk_test_' + Math.random().toString(36).substring(2, 15),
      active: true,
      createdAt: new Date(),
      failureCount: 0,
    };
    setWebhooks((prev) => [newWebhook, ...prev]);
  }, []);

  const testWebhook = useCallback(async (webhook: Webhook) => {
    setTestingId(webhook.id);
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'sha256=' + Math.random().toString(36).substring(7),
        },
        body: JSON.stringify({
          event: 'test.webhook',
          data: { test: true, timestamp: new Date().toISOString() },
        }),
      });

      setWebhooks((prev) =>
        prev.map((w) =>
          w.id === webhook.id
            ? { ...w, lastTriggered: new Date(), failureCount: response.ok ? 0 : w.failureCount + 1 }
            : w
        )
      );
    } catch (error) {
      setWebhooks((prev) =>
        prev.map((w) =>
          w.id === webhook.id
            ? { ...w, failureCount: w.failureCount + 1 }
            : w
        )
      );
    } finally {
      setTestingId(null);
    }
  }, []);

  const toggleShowSecret = (id: string) => {
    setShowSecret((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-yellow-400 flex items-center gap-2">
            <Zap className="w-8 h-8" /> Extensiones
          </h1>
          <p className="text-sm text-zinc-400">
            Gestiona snippets, webhooks y OAuth en un único lugar
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 rounded-lg border border-yellow-400/10 bg-black/40 p-1 w-fit">
          {(['snippets', 'webhooks', 'oauth'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                activeTab === tab
                  ? 'bg-yellow-400 text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab === 'snippets' && '📝 Snippets'}
              {tab === 'webhooks' && '🔗 Webhooks'}
              {tab === 'oauth' && '🔐 OAuth'}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {/* Snippets Tab */}
          {activeTab === 'snippets' && (
            <motion.div key="snippets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <button
                onClick={addSnippet}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition-all"
              >
                <Plus className="w-4 h-4" /> Nueva Snippet
              </button>

              {snippets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-yellow-400/20 p-12 text-center">
                  <Code className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-500">No tienes snippets todavía</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {snippets.map((snippet) => (
                    <motion.div
                      key={snippet.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-yellow-400/10 bg-black/40 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={snippet.name}
                            onChange={(e) => updateSnippet(snippet.id, { name: e.target.value })}
                            className="text-lg font-bold bg-transparent border-0 outline-none text-white"
                            placeholder="Nombre de la snippet"
                          />
                          <div className="flex gap-2 flex-wrap">
                            {snippet.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 rounded-md bg-yellow-400/20 border border-yellow-400/30 text-xs text-yellow-400"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteSnippet(snippet.id)}
                          className="text-zinc-500 hover:text-red-400 transition-all"
                          title="Eliminar snippet"
                          aria-label="Eliminar esta snippet"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <motion.button
                        onClick={() => setExpandedId(expandedId === snippet.id ? null : snippet.id)}
                        className="mt-4 w-full text-left text-xs font-bold text-yellow-400 hover:text-yellow-300"
                      >
                        {expandedId === snippet.id ? '▼' : '▶'} Ver código
                      </motion.button>

                      <AnimatePresence>
                        {expandedId === snippet.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-3 pt-3 border-t border-white/10"
                          >
                            <textarea
                              value={snippet.code}
                              onChange={(e) => updateSnippet(snippet.id, { code: e.target.value })}
                              className="w-full p-3 rounded-lg bg-zinc-900 border border-yellow-400/10 text-xs font-mono text-zinc-300 min-h-32"
                              placeholder="Escribe tu código aquí"
                              aria-label="Código de la snippet"
                            />
                            <button
                              onClick={() => copyToClipboard(snippet.code, snippet.id)}
                              className="mt-2 text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                            >
                              {copiedId === snippet.id ? (
                                <>
                                  <Check className="w-3 h-3" /> Copiado
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" /> Copiar código
                                </>
                              )}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Webhooks Tab */}
          {activeTab === 'webhooks' && (
            <motion.div key="webhooks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <button
                onClick={addWebhook}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition-all"
              >
                <Plus className="w-4 h-4" /> Nuevo Webhook
              </button>

              {webhooks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-yellow-400/20 p-12 text-center">
                  <Zap className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-500">No tienes webhooks configurados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {webhooks.map((webhook) => (
                    <motion.div
                      key={webhook.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-xl border p-4 ${
                        webhook.active
                          ? 'border-green-500/30 bg-green-500/10'
                          : 'border-zinc-700 bg-zinc-900/20'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={webhook.name}
                            onChange={(e) =>
                              setWebhooks((prev) =>
                                prev.map((w) =>
                                  w.id === webhook.id
                                    ? { ...w, name: e.target.value }
                                    : w
                                )
                              )
                            }
                            className="text-lg font-bold bg-transparent border-0 outline-none text-white"
                            placeholder="Nombre del webhook"
                          />
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={webhook.active}
                              onChange={(e) =>
                                setWebhooks((prev) =>
                                  prev.map((w) =>
                                    w.id === webhook.id
                                      ? { ...w, active: e.target.checked }
                                      : w
                                  )
                                )
                              }
                              className="rounded"
                            />
                            Activo
                          </label>
                        </div>

                        <input
                          type="url"
                          value={webhook.url}
                          onChange={(e) =>
                            setWebhooks((prev) =>
                              prev.map((w) =>
                                w.id === webhook.id
                                  ? { ...w, url: e.target.value }
                                  : w
                              )
                            )
                          }
                          placeholder="https://tu-api.com/webhook"
                          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-yellow-400/10 text-sm outline-none focus:border-yellow-400/40"
                        />

                        {/* Events Selection */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase tracking-wider text-yellow-400/80">
                            Eventos
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {WEBHOOK_EVENTS.map((event) => (
                              <label key={event} className="flex items-center gap-1 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={webhook.events.includes(event)}
                                  onChange={(e) => {
                                    setWebhooks((prev) =>
                                      prev.map((w) =>
                                        w.id === webhook.id
                                          ? {
                                            ...w,
                                            events: e.target.checked
                                              ? [...w.events, event]
                                              : w.events.filter((ev) => ev !== event),
                                          }
                                          : w
                                      )
                                    );
                                  }}
                                  className="rounded"
                                />
                                <span>{event}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Signing Key */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-yellow-400/80 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Signing Key
                          </label>
                          <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-yellow-400/10">
                            <code className="text-xs font-mono text-zinc-400 flex-1 overflow-hidden text-ellipsis">
                              {showSecret.has(webhook.id)
                                ? webhook.signingKey
                                : '••••••••••••••••••••'}
                            </code>
                            <button
                              onClick={() => toggleShowSecret(webhook.id)}
                              className="text-yellow-400 hover:text-yellow-300 ml-2"
                              title={showSecret.has(webhook.id) ? 'Ocultar clave' : 'Mostrar clave'}
                              aria-label={showSecret.has(webhook.id) ? 'Ocultar clave de firma' : 'Mostrar clave de firma'}
                            >
                              {showSecret.has(webhook.id) ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => copyToClipboard(webhook.signingKey, webhook.id)}
                              className="text-yellow-400 hover:text-yellow-300 ml-1"
                              title={copiedId === webhook.id ? 'Copiado' : 'Copiar clave'}
                              aria-label="Copiar clave de firma al portapapeles"
                            >
                              {copiedId === webhook.id ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          <div className="text-xs text-zinc-500">
                            {webhook.failureCount > 0 && (
                              <span className="text-red-400">
                                {webhook.failureCount} fallos
                              </span>
                            )}
                            {webhook.lastTriggered && (
                              <span className="text-green-400 ml-2">
                                Última: {webhook.lastTriggered.toLocaleTimeString('es-CL')}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => testWebhook(webhook)}
                              disabled={testingId === webhook.id || !webhook.url}
                              className="flex items-center gap-2 px-3 py-1 rounded-lg bg-yellow-400/20 border border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/30 text-sm transition-all disabled:opacity-50"
                            >
                              {testingId === webhook.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                              Probar
                            </button>
                            <button
                              onClick={() => deleteSnippet(webhook.id)}
                              className="text-zinc-500 hover:text-red-400 transition-all"
                              title="Eliminar webhook"
                              aria-label="Eliminar este webhook"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* OAuth Tab */}
          {activeTab === 'oauth' && (
            <motion.div key="oauth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {OAUTH_PROVIDERS.map((provider) => (
                  <motion.div
                    key={provider.name}
                    whileHover={{ scale: 1.02 }}
                    className="rounded-xl border border-yellow-400/20 bg-gradient-to-br from-yellow-400/10 to-transparent p-4 cursor-pointer hover:border-yellow-400/40 transition-all"
                  >
                    <h3 className="text-lg font-bold mb-2">{provider.name}</h3>
                    <p className="text-xs text-zinc-500 mb-4">Scopes: {provider.scopes.join(', ')}</p>
                    <button className="w-full py-2 rounded-lg bg-yellow-400/20 border border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/30 font-bold text-sm transition-all">
                      Configurar
                    </button>
                  </motion.div>
                ))}
              </div>

              <div className="rounded-2xl border border-yellow-400/10 bg-black/40 p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Code className="w-5 h-5" /> Implementación OAuth
                </h3>
                <pre className="bg-zinc-900 p-4 rounded-lg text-sm overflow-x-auto text-zinc-300 font-mono max-h-48">
{`// Ejemplo: Google OAuth
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', 'YOUR_CLIENT_ID');
authUrl.searchParams.set('redirect_uri', 'https://tu-dominio.com/api/oauth/callback');
authUrl.searchParams.set('scope', 'openid email profile');
authUrl.searchParams.set('response_type', 'code');

window.location.href = authUrl.toString();`}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

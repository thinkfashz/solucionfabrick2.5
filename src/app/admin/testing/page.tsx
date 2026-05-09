'use client';

/**
 * Testing Playground
 *
 * Interfaz interactiva para:
 * - Simular eventos webhook
 * - Probar OAuth flows
 * - Ver resultados en tiempo real
 * - Debuggear integraciones
 */

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Terminal,
  Code,
  Send,
  RefreshCw,
  ChevronDown,
  Eye,
  EyeOff,
} from 'lucide-react';

interface TestResult {
  success: boolean;
  status?: number;
  response?: unknown;
  error?: string;
  duration: number;
  timestamp: string;
}

interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
}

const WEBHOOK_TEMPLATES = {
  'payment.created': {
    event: 'payment.created',
    data: {
      paymentId: 'pay_' + Math.random().toString(36).substring(7),
      amount: 99.99,
      currency: 'USD',
      status: 'pending',
      customer: { email: 'customer@example.com', name: 'Customer Name' },
      timestamp: new Date().toISOString(),
    },
  },
  'payment.completed': {
    event: 'payment.completed',
    data: {
      paymentId: 'pay_' + Math.random().toString(36).substring(7),
      amount: 99.99,
      currency: 'USD',
      status: 'completed',
      customer: { email: 'customer@example.com', name: 'Customer Name' },
      completedAt: new Date().toISOString(),
    },
  },
  'order.created': {
    event: 'order.created',
    data: {
      orderId: 'ord_' + Math.random().toString(36).substring(7),
      items: [
        { name: 'Product 1', quantity: 2, price: 49.99 },
        { name: 'Product 2', quantity: 1, price: 99.99 },
      ],
      total: 199.97,
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  },
  'user.registered': {
    event: 'user.registered',
    data: {
      userId: 'usr_' + Math.random().toString(36).substring(7),
      email: 'newuser@example.com',
      name: 'New User',
      registeredAt: new Date().toISOString(),
    },
  },
};

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

export default function TestingPlayground() {
  const [activeTab, setActiveTab] = useState<'webhooks' | 'oauth'>('webhooks');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof WEBHOOK_TEMPLATES>('payment.created');
  const [customPayload, setCustomPayload] = useState(JSON.stringify(WEBHOOK_TEMPLATES['payment.created'], null, 2));
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [expandedResult, setExpandedResult] = useState<number | null>(null);
  const [showPayload, setShowPayload] = useState(true);

  const handleTestWebhook = useCallback(async () => {
    if (!webhookUrl.trim()) {
      alert('Ingresa la URL del webhook');
      return;
    }

    setTesting(true);
    const startTime = Date.now();

    try {
      const payload = JSON.parse(customPayload);
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result: TestResult = {
        success: res.ok,
        status: res.status,
        duration: Date.now() - startTime,
        timestamp: new Date().toLocaleTimeString('es-CL'),
      };

      if (res.ok) {
        try {
          result.response = await res.json();
        } catch {
          result.response = await res.text();
        }
      } else {
        result.error = `HTTP ${res.status}: ${res.statusText}`;
      }

      setTestResults((prev) => [result, ...prev.slice(0, 9)]);
    } catch (err) {
      const result: TestResult = {
        success: false,
        error: err instanceof Error ? err.message : 'Error desconocido',
        duration: Date.now() - startTime,
        timestamp: new Date().toLocaleTimeString('es-CL'),
      };
      setTestResults((prev) => [result, ...prev.slice(0, 9)]);
    } finally {
      setTesting(false);
    }
  }, [webhookUrl, customPayload]);

  const handleSelectTemplate = useCallback((template: keyof typeof WEBHOOK_TEMPLATES) => {
    setSelectedTemplate(template);
    setCustomPayload(JSON.stringify(WEBHOOK_TEMPLATES[template], null, 2));
  }, []);

  const copyResultJson = useCallback((result: TestResult) => {
    const text = JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(text);
    setCopiedId(testResults.indexOf(result));
    setTimeout(() => setCopiedId(null), 2000);
  }, [testResults]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-yellow-400 flex items-center gap-2">
            <Terminal className="w-8 h-8" /> Testing Playground
          </h1>
          <p className="text-sm text-zinc-400">
            Simula webhooks, OAuth flows y prueba tus integraciones en tiempo real
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 rounded-lg border border-yellow-400/10 bg-black/40 p-1 w-fit">
          {(['webhooks', 'oauth'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                activeTab === tab
                  ? 'bg-yellow-400 text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab === 'webhooks' ? '🔗 Webhooks' : '🔐 OAuth'}
            </button>
          ))}
        </div>

        {/* Webhooks Tab */}
        {activeTab === 'webhooks' && (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            {/* Left: Editor */}
            <section className="rounded-2xl border border-yellow-400/10 bg-black/40 p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-yellow-400/80">
                  URL del Webhook
                </label>
                <input
                  type="url"
                  placeholder="https://tu-api.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-yellow-400/10 text-sm outline-none focus:border-yellow-400/40"
                />
                <p className="text-[10px] text-zinc-500">Pega la URL de tu webhook para probarla</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-yellow-400/80">
                    Template
                  </label>
                  <button
                    onClick={() => setShowPayload(!showPayload)}
                    className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                  >
                    {showPayload ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {showPayload ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                <select
                  value={selectedTemplate}
                  onChange={(e) => handleSelectTemplate(e.target.value as keyof typeof WEBHOOK_TEMPLATES)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-yellow-400/10 text-sm outline-none focus:border-yellow-400/40"
                  aria-label="Seleccionar template de webhook"
                >
                  {Object.keys(WEBHOOK_TEMPLATES).map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>

              {showPayload && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-yellow-400/80">
                    Payload (JSON)
                  </label>
                  <textarea
                    value={customPayload}
                    onChange={(e) => setCustomPayload(e.target.value)}
                    className="w-full p-3 rounded-lg bg-zinc-900 border border-yellow-400/10 text-sm outline-none focus:border-yellow-400/40 font-mono text-zinc-300 min-h-[200px]"
                    placeholder="Contenido JSON del webhook"
                  />
                </div>
              )}

              <button
                onClick={handleTestWebhook}
                disabled={testing || !webhookUrl.trim()}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-yellow-400 text-black font-bold hover:bg-yellow-300 disabled:opacity-50 transition-all"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {testing ? 'Enviando...' : 'Enviar Webhook'}
              </button>
            </section>

            {/* Right: Results */}
            <section className="rounded-2xl border border-yellow-400/10 bg-black/40 p-6 space-y-4 h-fit sticky top-4">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-yellow-400/80">
                  Resultados ({testResults.length})
                </p>
                {testResults.length === 0 ? (
                  <div className="h-32 flex items-center justify-center rounded-lg border border-dashed border-yellow-400/20">
                    <p className="text-xs text-zinc-500 text-center">
                      Envía un webhook para ver los resultados
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                    {testResults.map((result, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          result.success
                            ? 'border-green-500/30 bg-green-500/10'
                            : 'border-red-500/30 bg-red-500/10'
                        }`}
                        onClick={() => setExpandedResult(expandedResult === i ? null : i)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {result.success ? (
                                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                              )}
                              <span className="text-xs font-bold truncate">
                                {result.success ? 'OK' : 'ERROR'} · {result.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1">{result.duration}ms · {result.timestamp}</p>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-zinc-500 transition-transform flex-shrink-0 ${
                              expandedResult === i ? 'rotate-180' : ''
                            }`}
                          />
                        </div>

                        <AnimatePresence>
                          {expandedResult === i && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-2 pt-2 border-t border-white/10 space-y-2"
                            >
                              {result.error ? (
                                <p className="text-[10px] text-red-300 font-mono break-all">{result.error}</p>
                              ) : (
                                <pre className="text-[9px] text-zinc-300 font-mono bg-black/50 p-2 rounded overflow-x-auto max-h-40">
                                  {JSON.stringify(result.response, null, 2)}
                                </pre>
                              )}
                              <button
                                onClick={() => copyResultJson(result)}
                                className="text-[10px] text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                              >
                                {copiedId === i ? (
                                  <>
                                    <Check className="w-3 h-3" /> Copiado
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" /> Copiar
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
              </div>
            </section>
          </div>
        )}

        {/* OAuth Tab */}
        {activeTab === 'oauth' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-yellow-400/10 bg-black/40 p-6">
              <p className="text-sm text-zinc-400 mb-4">
                Prueba los flujos OAuth de tus integraciones. Selecciona un provider para simular el flujo de autenticación.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {OAUTH_PROVIDERS.map((provider) => (
                  <motion.div
                    key={provider.name}
                    whileHover={{ scale: 1.02 }}
                    className="rounded-lg border border-yellow-400/20 bg-gradient-to-br from-yellow-400/10 to-transparent p-4 cursor-pointer hover:border-yellow-400/40 transition-all"
                  >
                    <h3 className="font-bold text-white mb-3">{provider.name}</h3>
                    <div className="space-y-2 text-xs text-zinc-400 mb-4">
                      <p>
                        <span className="text-zinc-600">Client ID:</span>{' '}
                        <code className="text-zinc-300 font-mono">{provider.clientId}</code>
                      </p>
                      <p>
                        <span className="text-zinc-600">Scopes:</span>{' '}
                        <code className="text-zinc-300 font-mono">{provider.scopes.join(', ')}</code>
                      </p>
                    </div>
                    <button className="w-full py-2 rounded-lg bg-yellow-400/20 border border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/30 font-bold text-sm transition-all">
                      Probar flujo OAuth
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-400/10 bg-black/40 p-6">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Code className="w-5 h-5" /> Implementación OAuth
              </h3>
              <pre className="bg-zinc-900 p-4 rounded-lg text-sm overflow-x-auto text-zinc-300 font-mono">
{`// Ejemplo: Google OAuth
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', 'YOUR_CLIENT_ID');
authUrl.searchParams.set('redirect_uri', 'https://tu-dominio.com/api/oauth/callback');
authUrl.searchParams.set('scope', 'openid email profile');
authUrl.searchParams.set('response_type', 'code');

window.location.href = authUrl.toString();`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

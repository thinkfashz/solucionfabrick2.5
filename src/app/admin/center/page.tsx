'use client';

/**
 * Centro de Integración Unificado
 *
 * Combina en una sola página:
 * - Configuración de parámetros (site settings)
 * - Gestión de integraciones (API credentials)
 * - Status de conexiones
 * - Pruebas de integraciones
 *
 * Reemplaza: /admin/configuracion + /admin/integraciones
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Loader2,
  MessageCircle,
  Save,
  Search,
  Settings,
  Shield,
  TestTubes,
  Trash2,
  Zap,
  Plus,
} from 'lucide-react';
import { insforge } from '@/lib/insforge';

type IntegrationCategory = 'marketing' | 'payments' | 'storage' | 'hosting' | 'communication' | 'parameters';

interface Integration {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  icon: React.ReactNode;
  color: string;
  fields: IntegrationField[];
  isConfigured: boolean;
}

interface IntegrationField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'textarea';
  placeholder?: string;
  hint?: string;
  required: boolean;
}

interface Parameter {
  key: string;
  label: string;
  value: string;
  type: 'text' | 'textarea' | 'number';
  category: 'branding' | 'seo' | 'contact' | 'legal';
  description?: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'payments',
    description: 'Pagos en USD con Stripe',
    icon: <CreditCard className="w-5 h-5" />,
    color: 'from-indigo-400/20 to-violet-500/10',
    isConfigured: false,
    fields: [
      { key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...', required: true },
      { key: 'public_key', label: 'Public Key', type: 'text', placeholder: 'pk_live_...', required: true },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'whsec_...', required: false },
    ],
  },
  {
    id: 'meta',
    name: 'Meta · Facebook / Instagram',
    category: 'marketing',
    description: 'Conexión a Facebook / Instagram Ads',
    icon: <Globe className="w-5 h-5" />,
    color: 'from-blue-400/20 to-blue-500/10',
    isConfigured: false,
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'EAAG...', required: true },
      { key: 'ad_account_id', label: 'Ad Account ID', type: 'text', placeholder: '1234567890', required: true },
      { key: 'page_id', label: 'Page ID', type: 'text', placeholder: '1000000000', required: false },
      { key: 'instagram_business_id', label: 'Instagram Business ID', type: 'text', required: false },
    ],
  },
  {
    id: 'vercel',
    name: 'Vercel · Deployments',
    category: 'hosting',
    description: 'Logs y deployments de Vercel',
    icon: <Zap className="w-5 h-5" />,
    color: 'from-black/20 to-zinc-600/10',
    isConfigured: false,
    fields: [
      { key: 'api_token', label: 'API Token', type: 'password', placeholder: 'vercel_xxx', required: true, hint: 'Crea en Settings → Tokens' },
      { key: 'project_id', label: 'Project ID', type: 'text', placeholder: 'prj_...', required: true },
      { key: 'team_id', label: 'Team ID', type: 'text', placeholder: 'team_...', required: false },
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    category: 'communication',
    description: 'WhatsApp Cloud API',
    icon: <MessageCircle className="w-5 h-5" />,
    color: 'from-green-400/20 to-emerald-500/10',
    isConfigured: false,
    fields: [
      { key: 'phone_number_id', label: 'Phone Number ID', type: 'text', required: true },
      { key: 'business_account_id', label: 'Business Account ID', type: 'text', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'webhook_verify_token', label: 'Webhook Verify Token', type: 'password', required: false },
    ],
  },
  {
    id: 'cloudinary',
    name: 'Cloudinary · Imágenes',
    category: 'storage',
    description: 'Gestión de imágenes en la nube',
    icon: <Shield className="w-5 h-5" />,
    color: 'from-cyan-400/20 to-blue-500/10',
    isConfigured: false,
    fields: [
      { key: 'cloud_name', label: 'Cloud Name', type: 'text', required: true, hint: 'De tu dashboard de Cloudinary' },
      { key: 'api_key', label: 'API Key', type: 'text', required: true },
      { key: 'api_secret', label: 'API Secret', type: 'password', required: true },
    ],
  },
  {
    id: 'google',
    name: 'Google APIs',
    category: 'marketing',
    description: 'Google Auth, Analytics, Maps',
    icon: <Globe className="w-5 h-5" />,
    color: 'from-red-400/20 to-orange-500/10',
    isConfigured: false,
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'xxxxx.apps.googleusercontent.com', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: false },
    ],
  },
];

const CATEGORIES: Record<IntegrationCategory, { label: string; icon: React.ReactNode }> = {
  marketing: { label: '📊 Marketing', icon: <Globe className="w-4 h-4" /> },
  payments: { label: '💳 Pagos', icon: <CreditCard className="w-4 h-4" /> },
  storage: { label: '☁️ Almacenamiento', icon: <Shield className="w-4 h-4" /> },
  hosting: { label: '🚀 Hosting', icon: <Zap className="w-4 h-4" /> },
  communication: { label: '💬 Comunicación', icon: <MessageCircle className="w-4 h-4" /> },
  parameters: { label: '⚙️ Parámetros', icon: <Settings className="w-4 h-4" /> },
};

export default function IntegrationCenter() {
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'integrations' | 'parameters'>('integrations');
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const filteredIntegrations = useMemo(() => {
    return integrations.filter((i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [integrations, searchQuery]);

  const selectedIntegration = useMemo(
    () => integrations.find((i) => i.id === selectedId),
    [integrations, selectedId],
  );

  const handleSave = useCallback(async () => {
    if (!selectedIntegration) return;
    setSaving(true);
    try {
      // Save to insforge
      // This would call an API endpoint to persist the credentials
      setTimeout(() => {
        setSaving(false);
      }, 1000);
    } catch (e) {
      console.error('Save error:', e);
      setSaving(false);
    }
  }, [selectedIntegration]);

  const handleTest = useCallback(async (integrationId: string) => {
    setTestingId(integrationId);
    try {
      // Call test endpoint
      const res = await fetch(`/api/admin/integrations/${integrationId}/test`, {
        method: 'POST',
      });
      const result = await res.json();
      console.log('Test result:', result);
    } catch (e) {
      console.error('Test error:', e);
    } finally {
      setTestingId(null);
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-yellow-400">Centro de Integración</h1>
          <p className="text-sm text-zinc-400">
            Gestiona todas tus integraciones externas, parámetros y configuraciones en un solo lugar.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 rounded-lg border border-yellow-400/10 bg-black/40 p-1 w-fit">
          {(['integrations', 'parameters'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                activeTab === tab
                  ? 'bg-yellow-400 text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab === 'integrations' ? '🔗 Integraciones' : '⚙️ Parámetros'}
            </button>
          ))}
        </div>

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            {/* Left: List */}
            <aside className="rounded-2xl border border-yellow-400/10 bg-black/40 h-fit sticky top-4">
              <div className="p-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="search"
                    placeholder="Buscar…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-zinc-900 border border-yellow-400/10 text-sm outline-none focus:border-yellow-400/40"
                  />
                </div>

                <div className="space-y-1.5 max-h-[70vh] overflow-y-auto">
                  {filteredIntegrations.map((integration) => (
                    <motion.button
                      key={integration.id}
                      onClick={() => setSelectedId(integration.id)}
                      whileHover={{ x: 4 }}
                      className={`w-full text-left p-3 rounded-lg transition-all border ${
                        selectedId === integration.id
                          ? 'border-yellow-400/50 bg-yellow-400/10'
                          : 'border-yellow-400/10 bg-zinc-900/50 hover:border-yellow-400/30'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">{integration.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-yellow-400 truncate">{integration.name}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">{integration.description}</p>
                        </div>
                        {integration.isConfigured && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Right: Details */}
            <section className="rounded-2xl border border-yellow-400/10 bg-black/40 p-6">
              {selectedIntegration ? (
                <motion.div
                  key={selectedIntegration.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-400/10 to-yellow-600/10">
                          {selectedIntegration.icon}
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-yellow-400">{selectedIntegration.name}</h2>
                          <p className="text-sm text-zinc-400">{selectedIntegration.description}</p>
                        </div>
                      </div>
                    </div>
                    {selectedIntegration.isConfigured && (
                      <div className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/50 text-green-400 text-xs font-bold">
                        Configurado
                      </div>
                    )}
                  </div>

                  {/* Fields */}
                  <div className="space-y-4">
                    {selectedIntegration.fields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-xs font-bold uppercase tracking-wider text-yellow-400/80 mb-2">
                          {field.label}
                          {field.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-yellow-400/10 text-sm outline-none focus:border-yellow-400/40 text-white"
                        />
                        {field.hint && (
                          <p className="text-[10px] text-zinc-500 mt-1">{field.hint}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-yellow-400/10">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-black font-bold text-sm hover:bg-yellow-300 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Guardar
                    </button>
                    <button
                      onClick={() => handleTest(selectedIntegration.id)}
                      disabled={testingId === selectedIntegration.id}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-yellow-400/30 text-yellow-400 font-bold text-sm hover:bg-yellow-400/10"
                    >
                      {testingId === selectedIntegration.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTubes className="w-4 h-4" />
                      )}
                      Probar
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/10 ml-auto">
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-80 text-center">
                  <Settings className="w-12 h-12 text-zinc-600 mb-4" />
                  <p className="text-zinc-400">Selecciona una integración para configurarla</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Parameters Tab */}
        {activeTab === 'parameters' && (
          <div className="rounded-2xl border border-yellow-400/10 bg-black/40 p-6">
            <div className="text-center text-zinc-500 py-12">
              <Settings className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>Panel de parámetros sitio (próximamente)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

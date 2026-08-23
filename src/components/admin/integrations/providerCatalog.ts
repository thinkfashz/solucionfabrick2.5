import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Bot,
  Cloud,
  CreditCard,
  Globe2,
  Mail,
  MessageCircle,
  MessageSquareText,
  PlayCircle,
  Search,
  Server,
  Sparkles,
  Store,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';

export type ProviderKey =
  | 'meta'
  | 'google'
  | 'google_ads'
  | 'tiktok'
  | 'cloudinary'
  | 'vercel'
  | 'mercadolibre'
  | 'mercadopago'
  | 'stripe'
  | 'whatsapp'
  | 'resend'
  | 'openrouter'
  | 'serper'
  | 'serpapi'
  | 'anthropic'
  | 'groq'
  | 'openai'
  | 'gemini'
  | 'grok';

export type ProviderCategory = 'commerce' | 'marketing' | 'infrastructure' | 'messaging' | 'ai' | 'search';

export type ProviderField = {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'password';
  hint?: string;
};

export type ProviderDefinition = {
  id: ProviderKey;
  label: string;
  description: string;
  category: ProviderCategory;
  icon: LucideIcon;
  uses: string[];
  fields: ProviderField[];
  portalUrl?: string;
};

export const CATEGORY_LABELS: Record<'all' | ProviderCategory, string> = {
  all: 'Todas',
  commerce: 'Comercio',
  marketing: 'Marketing',
  infrastructure: 'Infraestructura',
  messaging: 'Mensajería',
  ai: 'IA',
  search: 'Búsqueda',
};

export const OAUTH_START_URLS: Partial<Record<ProviderKey, string>> = {
  mercadolibre: '/api/admin/ml/oauth/start',
  google: '/api/admin/google/oauth/start',
  meta: '/api/admin/meta/oauth/start',
  tiktok: '/api/admin/tiktok/oauth/start',
};

export const OAUTH_PROVIDERS = new Set<ProviderKey>(Object.keys(OAUTH_START_URLS) as ProviderKey[]);

export const TESTABLE_PROVIDERS = new Set<ProviderKey>([
  'cloudinary',
  'mercadopago',
  'resend',
  'stripe',
  'whatsapp',
  'tiktok',
  'google',
  'google_ads',
  'meta',
  'mercadolibre',
  'openrouter',
  'openai',
  'gemini',
  'groq',
  'anthropic',
  'grok',
  'serper',
  'serpapi',
]);

export const INTEGRATION_PROVIDERS: ProviderDefinition[] = [
  {
    id: 'mercadopago', label: 'MercadoPago', category: 'commerce', icon: Wallet,
    description: 'Checkout y cobros del servidor para Chile.',
    uses: ['Checkout', 'Cobros', 'Webhooks'],
    portalUrl: 'https://www.mercadopago.cl/developers/panel/app',
    fields: [
      { key: 'access_token', label: 'Access token', type: 'password', placeholder: 'APP_USR-...' },
      { key: 'public_key', label: 'Public key', placeholder: 'APP_USR-...' },
      { key: 'webhook_secret', label: 'Webhook secret', type: 'password', placeholder: 'Opcional' },
    ],
  },
  {
    id: 'stripe', label: 'Stripe', category: 'commerce', icon: CreditCard,
    description: 'Cobros internacionales y validación de cuenta Stripe.',
    uses: ['Pagos USD', 'Checkout', 'Webhook signing'],
    portalUrl: 'https://dashboard.stripe.com/apikeys',
    fields: [
      { key: 'secret_key', label: 'Secret key', type: 'password', placeholder: 'sk_live_...' },
      { key: 'public_key', label: 'Public key', placeholder: 'pk_live_...' },
      { key: 'webhook_secret', label: 'Webhook secret', type: 'password', placeholder: 'whsec_...' },
    ],
  },
  {
    id: 'mercadolibre', label: 'Mercado Libre', category: 'commerce', icon: Store,
    description: 'Publicaciones, pedidos, preguntas y sincronización vía OAuth.',
    uses: ['Publicaciones', 'Pedidos', 'Preguntas', 'Precios'],
    portalUrl: 'https://developers.mercadolibre.cl/',
    fields: [
      { key: 'access_token', label: 'Access token', type: 'password' },
      { key: 'refresh_token', label: 'Refresh token', type: 'password' },
      { key: 'user_id', label: 'Seller user ID' },
      { key: 'expires_at', label: 'Expira el', placeholder: 'ISO timestamp' },
      { key: 'scope', label: 'Scopes' },
    ],
  },
  {
    id: 'meta', label: 'Meta · Facebook / Instagram', category: 'marketing', icon: MessageSquareText,
    description: 'Activos de Meta, páginas, Instagram Business y publicidad.',
    uses: ['Facebook Page', 'Instagram Business', 'Meta Ads'],
    portalUrl: 'https://developers.facebook.com/apps/',
    fields: [
      { key: 'access_token', label: 'Access token', type: 'password', placeholder: 'EAAG...' },
      { key: 'ad_account_id', label: 'Ad account ID', placeholder: 'act_123...' },
      { key: 'page_id', label: 'Facebook Page ID' },
      { key: 'instagram_business_id', label: 'Instagram Business ID' },
    ],
  },
  {
    id: 'google', label: 'Google APIs', category: 'marketing', icon: Globe2,
    description: 'OAuth base para los servicios Google conectados al panel.',
    uses: ['OAuth', 'Analytics', 'Servicios Google'],
    portalUrl: 'https://console.cloud.google.com/apis/credentials',
    fields: [
      { key: 'client_id', label: 'OAuth client ID' },
      { key: 'client_secret', label: 'OAuth client secret', type: 'password' },
      { key: 'refresh_token', label: 'Refresh token', type: 'password' },
    ],
  },
  {
    id: 'google_ads', label: 'Google Ads', category: 'marketing', icon: Activity,
    description: 'Cuenta publicitaria, developer token y acceso OAuth.',
    uses: ['Ads API', 'Customer ID', 'MCC'],
    portalUrl: 'https://ads.google.com/aw/apicenter',
    fields: [
      { key: 'developer_token', label: 'Developer token', type: 'password' },
      { key: 'client_id', label: 'OAuth client ID' },
      { key: 'client_secret', label: 'OAuth client secret', type: 'password' },
      { key: 'refresh_token', label: 'Refresh token', type: 'password' },
      { key: 'customer_id', label: 'Customer ID' },
      { key: 'login_customer_id', label: 'Login customer ID (MCC)' },
    ],
  },
  {
    id: 'tiktok', label: 'TikTok Ads', category: 'marketing', icon: PlayCircle,
    description: 'Business API para anunciantes, campañas y activos TikTok.',
    uses: ['Business API', 'Advertiser ID', 'Campañas'],
    portalUrl: 'https://business-api.tiktok.com/portal',
    fields: [
      { key: 'access_token', label: 'Access token', type: 'password' },
      { key: 'advertiser_id', label: 'Advertiser ID' },
    ],
  },
  {
    id: 'cloudinary', label: 'Cloudinary', category: 'infrastructure', icon: Cloud,
    description: 'Biblioteca multimedia, subida de imágenes y transformaciones.',
    uses: ['Media library', 'Uploads', 'Transformaciones'],
    portalUrl: 'https://console.cloudinary.com/',
    fields: [
      { key: 'cloud_name', label: 'Cloud name' },
      { key: 'api_key', label: 'API key' },
      { key: 'api_secret', label: 'API secret', type: 'password' },
    ],
  },
  {
    id: 'vercel', label: 'Vercel', category: 'infrastructure', icon: Server,
    description: 'Deployments, observabilidad y acceso al proyecto de producción.',
    uses: ['Deployments', 'Logs', 'Project access'],
    portalUrl: 'https://vercel.com/account/tokens',
    fields: [
      { key: 'api_token', label: 'API token', type: 'password' },
      { key: 'project_id', label: 'Project ID', placeholder: 'prj_...' },
      { key: 'team_id', label: 'Team ID', placeholder: 'team_...' },
    ],
  },
  {
    id: 'whatsapp', label: 'WhatsApp Business', category: 'messaging', icon: MessageCircle,
    description: 'WhatsApp Cloud API para mensajería y automatizaciones.',
    uses: ['Cloud API', 'Mensajería', 'WABA'],
    portalUrl: 'https://developers.facebook.com/apps/',
    fields: [
      { key: 'access_token', label: 'Access token', type: 'password' },
      { key: 'phone_number_id', label: 'Phone number ID' },
      { key: 'business_account_id', label: 'Business account ID' },
    ],
  },
  {
    id: 'resend', label: 'Resend', category: 'messaging', icon: Mail,
    description: 'Correo transaccional, presupuestos y notificaciones.',
    uses: ['Email', 'Presupuestos', 'Notificaciones'],
    portalUrl: 'https://resend.com/api-keys',
    fields: [
      { key: 'api_key', label: 'API key', type: 'password', placeholder: 're_...' },
      { key: 'from', label: 'Remitente verificado', placeholder: 'Fabrick <correo@dominio.cl>' },
    ],
  },
  {
    id: 'openrouter', label: 'OpenRouter', category: 'ai', icon: Sparkles,
    description: 'Gateway unificado para múltiples proveedores y modelos de IA.',
    uses: ['Modelos múltiples', 'Asistente', 'Fallback IA'],
    portalUrl: 'https://openrouter.ai/keys',
    fields: [
      { key: 'api_key', label: 'API key', type: 'password', placeholder: 'sk-or-v1-...' },
      { key: 'app_name', label: 'App name' },
      { key: 'site_url', label: 'Site URL' },
    ],
  },
  {
    id: 'openai', label: 'OpenAI', category: 'ai', icon: Bot,
    description: 'API de OpenAI para modelos GPT y tareas de razonamiento.',
    uses: ['GPT', 'Asistente', 'Análisis'],
    portalUrl: 'https://platform.openai.com/api-keys',
    fields: [
      { key: 'api_key', label: 'API key', type: 'password', placeholder: 'sk-proj-...' },
      { key: 'modelo', label: 'Modelo activo', placeholder: 'gpt-4o-mini' },
    ],
  },
  {
    id: 'anthropic', label: 'Anthropic · Claude', category: 'ai', icon: Sparkles,
    description: 'Modelos Claude para análisis, redacción y agentes.',
    uses: ['Claude', 'Análisis', 'Agentes'],
    portalUrl: 'https://console.anthropic.com/settings/keys',
    fields: [
      { key: 'api_key', label: 'API key', type: 'password', placeholder: 'sk-ant-...' },
      { key: 'modelo', label: 'Modelo activo', placeholder: 'claude-3-5-sonnet-latest' },
    ],
  },
  {
    id: 'groq', label: 'Groq', category: 'ai', icon: Zap,
    description: 'Inferencia rápida con modelos Llama y Gemma.',
    uses: ['Llama', 'Gemma', 'Inferencia rápida'],
    portalUrl: 'https://console.groq.com/keys',
    fields: [
      { key: 'api_key', label: 'API key', type: 'password', placeholder: 'gsk_...' },
      { key: 'modelo', label: 'Modelo activo', placeholder: 'llama-3.3-70b-versatile' },
    ],
  },
  {
    id: 'gemini', label: 'Google Gemini', category: 'ai', icon: Sparkles,
    description: 'Modelos Gemini para tareas multimodales y generación.',
    uses: ['Gemini', 'Multimodal', 'Asistente'],
    portalUrl: 'https://aistudio.google.com/app/apikey',
    fields: [
      { key: 'api_key', label: 'API key', type: 'password', placeholder: 'AIza...' },
      { key: 'modelo', label: 'Modelo activo', placeholder: 'gemini-2.0-flash' },
    ],
  },
  {
    id: 'grok', label: 'xAI · Grok', category: 'ai', icon: Zap,
    description: 'API de xAI compatible con flujos tipo OpenAI.',
    uses: ['Grok', 'Chat', 'Análisis'],
    portalUrl: 'https://console.x.ai/',
    fields: [
      { key: 'api_key', label: 'API key', type: 'password', placeholder: 'xai-...' },
      { key: 'modelo', label: 'Modelo activo', placeholder: 'grok-2-latest' },
    ],
  },
  {
    id: 'serper', label: 'Serper.dev', category: 'search', icon: Search,
    description: 'Resultados Google para inteligencia de mercado y SEO.',
    uses: ['SERP', 'Competencia', 'SEO'],
    portalUrl: 'https://serper.dev/api-key',
    fields: [{ key: 'api_key', label: 'API key', type: 'password' }],
  },
  {
    id: 'serpapi', label: 'SerpAPI', category: 'search', icon: TrendingUp,
    description: 'Proveedor alternativo para resultados de búsqueda y shopping.',
    uses: ['SERP', 'Shopping', 'Mercados'],
    portalUrl: 'https://serpapi.com/manage-api-key',
    fields: [{ key: 'api_key', label: 'API key', type: 'password' }],
  },
];

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
	Activity,
	Bot,
	CheckCircle2,
	ChevronDown,
	Cloud,
	CreditCard,
	Eye,
	Globe,
	HelpCircle,
	LinkIcon,
	Loader2,
	LogOut,
	Mail,
	MessageCircle,
	MessageSquareText,
	PlayCircle,
	RefreshCw,
	Search,
	Server,
	ShieldAlert,
	Sparkles,
	Store,
	Trash2,
	TrendingUp,
	Wallet,
	Workflow,
	X,
	Zap,
	type LucideIcon,
} from 'lucide-react';
import AdminActionGuard, { type AdminActionResult } from '@/components/admin/AdminActionGuard';
import { AdminCard, AdminPage, AdminPageHeader, ConnectionPulse } from '@/components/admin/ui';
import { QuotaBar, unitForProvider } from '@/components/admin/QuotaBar';

const INTEGRATIONS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS public.integrations (
  provider text PRIMARY KEY,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);`;

type ProviderKey = 'meta' | 'google' | 'google_ads' | 'tiktok' | 'cloudinary' | 'vercel' | 'mercadolibre' | 'mercadopago' | 'stripe' | 'whatsapp' | 'resend' | 'openrouter' | 'serper' | 'serpapi' | 'anthropic' | 'groq' | 'openai' | 'gemini' | 'grok';

/** Providers that use OAuth and have a dedicated Conectar/Desconectar flow. */
const OAUTH_PROVIDERS = new Set<ProviderKey>(['mercadolibre', 'google', 'meta', 'tiktok']);

interface ProviderField {
	key: string;
	label: string;
	placeholder?: string;
	type?: 'text' | 'password';
	hint?: string;
}

interface ProviderDefinition {
	id: ProviderKey;
	label: string;
	description: string;
	icon: LucideIcon;
	accent: string;
	uses: string[];
	fields: ProviderField[];
	/** URL externa (botón "Obtener API Key") al portal del proveedor. */
	apiKeyUrl?: string;
	/** Texto corto del botón de la URL externa (default: "Obtener API Key"). */
	apiKeyLabel?: string;
	/** Instrucciones paso a paso renderizadas dentro de la tarjeta. */
	instructions?: string[];
}

interface ProviderStatus {
	credentials: Record<string, { set: boolean; preview: string; source?: 'db' | 'env'; envVar?: string }>;
	updated_at?: string;
	encrypted?: boolean;
	envManaged?: boolean;
}

interface TestResult {
	ok: boolean;
	error?: string;
	checks?: Array<{ name: string; ok: boolean; detail?: string }>;
}

interface RevealResponse {
	ok?: boolean;
	error?: string;
	hint?: string;
	credentials?: Record<string, string>;
	updatedAt?: string | null;
	expiresInSeconds?: number;
}

interface RevealDialogState {
	provider: ProviderKey;
	credentials: Record<string, string> | null;
	expiresAt: number | null;
	updatedAt?: string | null;
}

const PROVIDERS: ProviderDefinition[] = [
	{
		id: 'stripe',
		label: 'Stripe',
		description: 'Preparado para cobros en USD, validación de cuenta y webhook desde el mismo centro de integraciones.',
		icon: CreditCard,
		accent: 'from-indigo-400/20 to-violet-500/10',
		uses: ['Pagos USD', 'Stripe account', 'Webhook signing'],
		fields: [
			{ key: 'secret_key', label: 'Secret key', type: 'password', placeholder: 'sk_live_...' },
			{ key: 'public_key', label: 'Public key', placeholder: 'pk_live_...' },
			{ key: 'webhook_secret', label: 'Webhook secret (opcional)', type: 'password', placeholder: 'whsec_...' },
		],
	},
	{
		id: 'whatsapp',
		label: 'WhatsApp Business',
		description: 'Valida acceso a WhatsApp Cloud API para dejar lista la conexión de mensajería y automatizaciones futuras.',
		icon: MessageCircle,
		accent: 'from-emerald-400/20 to-green-500/10',
		uses: ['Cloud API', 'Phone number', 'WABA', 'Mensajería'],
		fields: [
			{ key: 'access_token', label: 'Access token', type: 'password', placeholder: 'EAAG...' },
			{ key: 'phone_number_id', label: 'Phone number ID', placeholder: '123456789012345' },
			{ key: 'business_account_id', label: 'Business account ID (opcional)', placeholder: '1029384756' },
		],
	},
	{
		id: 'mercadopago',
		label: 'MercadoPago',
		description: 'Checkout, cobros del servidor y monitoreo de pasarela en tiempo real desde el admin.',
		icon: Wallet,
		accent: 'from-sky-400/20 to-cyan-500/10',
		uses: ['Checkout', 'Cobros server-side', 'Webhook', 'Gateway health'],
		fields: [
			{ key: 'access_token', label: 'Access token', type: 'password', placeholder: 'APP_USR-...' },
			{ key: 'public_key', label: 'Public key', placeholder: 'APP_USR-public-key' },
			{ key: 'webhook_secret', label: 'Webhook secret (opcional)', type: 'password', placeholder: 'mp_webhook_secret' },
		],
	},
	{
		id: 'mercadolibre',
		label: 'MercadoLibre',
		description: 'Activa publicaciones, pedidos, preguntas y monitoreo de precios. Usa "Conectar con Mercado Libre" para iniciar el flujo OAuth + PKCE — los campos se completarán automáticamente al volver del consentimiento.',
		icon: Store,
		accent: 'from-yellow-400/20 to-amber-500/10',
		uses: ['Publicaciones ML', 'Pedidos ML', 'Preguntas ML', 'Monitor de precios'],
		fields: [
			{ key: 'access_token', label: 'Access token', type: 'password', placeholder: 'APP_USR-...' },
			{ key: 'refresh_token', label: 'Refresh token', type: 'password', placeholder: 'TG-...', hint: 'Se renueva automáticamente cada 6 h. Se rota en cada uso (ML invalida el anterior).' },
			{ key: 'user_id', label: 'User ID (seller)', placeholder: '123456789', hint: 'Lo devuelve ML al canjear el code.' },
			{ key: 'expires_at', label: 'Expira el', placeholder: 'YYYY-MM-DDTHH:mm:ss.sssZ', hint: 'Vencimiento del access_token. La app refresca solita antes de expirar.' },
			{ key: 'scope', label: 'Scopes', placeholder: 'offline_access read write' },
		],
	},
	{
		id: 'meta',
		label: 'Meta · Facebook / Instagram',
		description: 'Publicación, lectura de cuentas y validación de activos de Meta desde el admin.',
		icon: MessageSquareText,
		accent: 'from-sky-400/20 to-blue-500/10',
		uses: ['Facebook Page', 'Instagram Business', 'Meta Ads'],
		fields: [
			{ key: 'access_token', label: 'Access token', type: 'password', placeholder: 'EAAG...' },
			{ key: 'ad_account_id', label: 'Ad account ID', placeholder: 'act_1234567890' },
			{ key: 'page_id', label: 'Facebook Page ID', placeholder: '1000000000' },
			{ key: 'instagram_business_id', label: 'Instagram Business ID', placeholder: '17841400000000000' },
		],
	},
	{
		id: 'google',
		label: 'Google APIs',
		description: 'OAuth base para servicios Google conectados al admin.',
		icon: Globe,
		accent: 'from-emerald-400/20 to-teal-500/10',
		uses: ['OAuth refresh', 'Maps/Analytics', 'servicios Google'],
		fields: [
			{ key: 'client_id', label: 'OAuth client ID', placeholder: 'xxxxx.apps.googleusercontent.com' },
			{ key: 'client_secret', label: 'OAuth client secret', type: 'password' },
			{ key: 'refresh_token', label: 'Refresh token', type: 'password' },
		],
	},
	{
		id: 'google_ads',
		label: 'Google Ads',
		description: 'Valida cuenta publicitaria, developer token y acceso OAuth.',
		icon: Activity,
		accent: 'from-lime-400/20 to-green-500/10',
		uses: ['Developer token', 'Customer ID', 'Login customer ID'],
		fields: [
			{ key: 'developer_token', label: 'Developer token', type: 'password' },
			{ key: 'client_id', label: 'OAuth client ID', placeholder: 'xxxxx.apps.googleusercontent.com' },
			{ key: 'client_secret', label: 'OAuth client secret', type: 'password' },
			{ key: 'refresh_token', label: 'Refresh token', type: 'password' },
			{ key: 'customer_id', label: 'Customer ID', placeholder: '123-456-7890' },
			{ key: 'login_customer_id', label: 'Login customer ID (MCC)', placeholder: '987-654-3210' },
		],
	},
	{
		id: 'tiktok',
		label: 'TikTok Ads',
		description: 'Conexión de Business API para validar anunciantes y tokens activos.',
		icon: PlayCircle,
		accent: 'from-fuchsia-400/20 to-rose-500/10',
		uses: ['Advertiser ID', 'Long-term token', 'Business API'],
		fields: [
			{ key: 'access_token', label: 'Access token', type: 'password' },
			{ key: 'advertiser_id', label: 'Advertiser ID', placeholder: '7123456789012345678' },
		],
	},
	{
		id: 'cloudinary',
		label: 'Cloudinary',
		description: 'Subida, uso y administración real de imágenes desde el admin.',
		icon: Cloud,
		accent: 'from-cyan-400/20 to-sky-500/10',
		uses: ['Media library', 'Uploads', 'API usage'],
		fields: [
			{ key: 'cloud_name', label: 'Cloud name', placeholder: 'mi-cloud-name' },
			{ key: 'api_key', label: 'API Key', placeholder: '123456789012345' },
			{ key: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'aBcDeFgH...' },
		],
	},
	{
		id: 'vercel',
		label: 'Vercel',
		description: 'Inspección real de deployments y logs del proyecto desde el admin.',
		icon: Server,
		accent: 'from-violet-400/20 to-indigo-500/10',
		uses: ['Deployments', 'Project access', 'Logs de Vercel'],
		fields: [
			{ key: 'api_token', label: 'API Token', type: 'password', placeholder: 'vercel_xxx' },
			{ key: 'project_id', label: 'Project ID', placeholder: 'prj_xxxxxxxxxxxxxxxxxx' },
			{ key: 'team_id', label: 'Team ID (opcional)', placeholder: 'team_xxxxxxxxxxxxxxxxxx' },
		],
	},
	{
		id: 'resend',
		label: 'Resend',
		description: 'Envío transaccional del presupuesto al cliente con plantilla React Email (logo Fabrick + botón ámbar).',
		icon: Mail,
		accent: 'from-amber-400/20 to-yellow-500/10',
		uses: ['Email transaccional', 'React Email', 'Presupuestos', 'Notificaciones'],
		apiKeyUrl: 'https://resend.com/api-keys',
		apiKeyLabel: 'Obtener API Key',
		instructions: [
			'Entra a resend.com/api-keys (botón de la derecha) e inicia sesión.',
			'Crea una API key con permiso "Sending access"; cópiala (empieza por re_…). Solo se muestra una vez.',
			'Verifica el dominio remitente en Resend → Domains; usa una dirección de ese dominio en el campo "From" (p. ej. presupuestos@solucionesfabrick.cl).',
			'Pega la API key abajo y guarda. También puedes definir RESEND_API_KEY y RESEND_FROM como variables de entorno en Vercel.',
		],
		fields: [
			{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 're_xxxxxxxxxxxxxxxxxxxxxxxx' },
			{ key: 'from', label: 'From (remitente verificado)', placeholder: 'Soluciones Fabrick <presupuestos@solucionesfabrick.cl>' },
		],
	},
	{
		id: 'openrouter',
		label: 'OpenRouter',
		description: 'Gateway que da acceso unificado a +200 modelos de IA (Llama, Gemini, Claude, GPT, Mistral, Qwen…). Hay modelos gratis y de pago.',
		icon: Sparkles,
		accent: 'from-fuchsia-400/20 to-purple-500/10',
		uses: ['Asistente IA del admin', 'Análisis de código', 'Soporte cliente automatizado', 'Modelos gratis y de pago'],
		apiKeyUrl: 'https://openrouter.ai/keys',
		apiKeyLabel: 'Obtener API Key',
		instructions: [
			'Crea una cuenta en openrouter.ai (o inicia sesión con Google/GitHub).',
			'Ve a openrouter.ai/keys y haz clic en "Create Key". Cópiala (empieza por sk-or-…). Solo se muestra una vez.',
			'Para usar modelos de pago, agrega crédito en openrouter.ai/credits. Los modelos gratuitos (sufijo :free) no requieren saldo.',
			'Pega la API key abajo y guarda. Opcional: define OPENROUTER_API_KEY como variable de entorno en Vercel.',
		],
		fields: [
			{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx' },
			{ key: 'app_name', label: 'App Name (opcional)', placeholder: 'Soluciones Fabrick Admin' },
			{ key: 'site_url', label: 'Site URL (opcional, para ranking)', placeholder: 'https://solucionesfabrick.cl' },
		],
	},
	{
		id: 'anthropic',
		label: 'Anthropic · Claude',
		description: 'API oficial de Anthropic para usar modelos Claude (Opus, Sonnet, Haiku) en el Asistente IA de presupuestos y otras funciones del admin.',
		icon: Bot,
		accent: 'from-amber-400/20 to-orange-500/10',
		uses: ['Asistente IA presupuestos', 'Claude Opus / Sonnet / Haiku', 'Análisis de proyectos', 'Generación de contenido'],
		apiKeyUrl: 'https://console.anthropic.com/settings/keys',
		apiKeyLabel: 'Obtener API Key',
		instructions: [
			'Crea una cuenta en console.anthropic.com e inicia sesión.',
			'Ve a Settings → API Keys y haz clic en "Create Key". Cópiala (empieza por sk-ant-…). Solo se muestra una vez.',
			'Selecciona el modelo que quieres usar en el campo "Modelo activo" (Haiku es el más rápido y económico; Sonnet ofrece el mejor balance).',
			'Pega la API key abajo y guarda. El Asistente IA usará esta clave automáticamente.',
		],
		fields: [
			{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-ant-api03-xxxxxxxxxxxxxxxx' },
			{ key: 'modelo', label: 'Modelo activo', placeholder: 'claude-haiku-4-5-20251001', hint: 'Opciones: claude-haiku-4-5-20251001 · claude-sonnet-4-6 · claude-opus-4-8' },
		],
	},
	{
		id: 'groq',
		label: 'Groq · LLaMA / Gemma',
		description: 'Inferencia ultra-rápida con hardware Groq. Plan gratuito generoso: modelos LLaMA 3.3, LLaMA 3.1 y Gemma disponibles sin saldo. Alternativa económica a Anthropic.',
		icon: Zap,
		accent: 'from-rose-400/20 to-pink-500/10',
		uses: ['Asistente IA presupuestos (alternativa)', 'LLaMA 3.3 70B gratis', 'Inferencia ultra-rápida', 'Sin costo para pruebas'],
		apiKeyUrl: 'https://console.groq.com/keys',
		apiKeyLabel: 'Obtener API Key gratis',
		instructions: [
			'Crea una cuenta gratis en console.groq.com (puedes usar Google o GitHub).',
			'Ve a API Keys y haz clic en "Create API Key". Cópiala (empieza por gsk_…). Solo se muestra una vez.',
			'El plan free incluye: llama-3.3-70b-versatile (~30 req/min), llama-3.1-8b-instant (~30 req/min), gemma2-9b-it, mixtral-8x7b-32768.',
			'Selecciona el modelo en el campo "Modelo activo". Para el Asistente IA se recomienda llama-3.3-70b-versatile.',
			'Pega la API key abajo y guarda. En el Admin → Configuración IA puedes seleccionar Groq como proveedor activo.',
		],
		fields: [
			{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'gsk_xxxxxxxxxxxxxxxxxxxxxxxx' },
			{ key: 'modelo', label: 'Modelo activo', placeholder: 'llama-3.3-70b-versatile', hint: 'Gratuitos: llama-3.3-70b-versatile · llama-3.1-8b-instant · gemma2-9b-it · mixtral-8x7b-32768' },
		],
	},
	{
		id: 'openai',
		label: 'OpenAI · ChatGPT',
		description: 'API oficial de OpenAI para GPT-4o, GPT-4o-mini y o3. Accede al estándar de facto de la industria directamente desde el admin.',
		icon: Sparkles,
		accent: 'from-green-400/20 to-emerald-500/10',
		uses: ['GPT-4o', 'Asistente IA', 'Análisis de texto', 'Chat completions'],
		apiKeyUrl: 'https://platform.openai.com/api-keys',
		apiKeyLabel: 'Obtener API Key',
		instructions: [
			'Ve a platform.openai.com/api-keys e inicia sesión.',
			'Haz clic en "Create new secret key". Cópiala (empieza por sk-…). Solo se muestra una vez.',
			'Asegúrate de tener saldo en platform.openai.com/account/billing (mínimo $5).',
			'Pega la API key abajo y guarda. Selecciona el modelo deseado.',
		],
		fields: [
			{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx' },
			{ key: 'modelo', label: 'Modelo activo', placeholder: 'gpt-4o-mini', hint: 'Opciones: gpt-4o-mini · gpt-4o · o3-mini' },
		],
	},
	{
		id: 'gemini',
		label: 'Google Gemini',
		description: 'Modelos Gemini de Google (2.0 Flash, 1.5 Pro). Plan gratuito generoso para pruebas. Obtén la key en Google AI Studio.',
		icon: Sparkles,
		accent: 'from-blue-400/20 to-cyan-500/10',
		uses: ['Gemini 2.0 Flash', 'Análisis multimodal', 'Asistente IA', 'Plan gratuito'],
		apiKeyUrl: 'https://aistudio.google.com/app/apikey',
		apiKeyLabel: 'Obtener API Key en AI Studio',
		instructions: [
			'Ve a aistudio.google.com/app/apikey e inicia sesión con tu cuenta Google.',
			'Haz clic en "Create API key". Cópiala. El plan gratuito incluye 1.500 req/día en Gemini 1.5 Flash.',
			'Selecciona el modelo deseado abajo (gemini-2.0-flash-exp es el más reciente y gratis).',
			'Pega la API key y guarda.',
		],
		fields: [
			{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'AIzaSy...' },
			{ key: 'modelo', label: 'Modelo activo', placeholder: 'gemini-2.0-flash-exp', hint: 'Gratuitos: gemini-2.0-flash-exp · gemini-1.5-flash · gemini-1.5-pro' },
		],
	},
	{
		id: 'grok',
		label: 'xAI · Grok',
		description: 'Modelos Grok de xAI. API compatible con OpenAI. Acceso a Grok-2 y Grok Vision. $25 de crédito gratis para nuevos usuarios.',
		icon: Zap,
		accent: 'from-violet-400/20 to-purple-500/10',
		uses: ['Grok-2', 'Chat completions', 'API compatible OpenAI', '$25 crédito gratis'],
		apiKeyUrl: 'https://console.x.ai/',
		apiKeyLabel: 'Obtener API Key',
		instructions: [
			'Ve a console.x.ai e inicia sesión con tu cuenta X (Twitter).',
			'Crea una API key. Los nuevos usuarios reciben $25 de crédito gratis.',
			'La API es compatible con el formato OpenAI (mismo SDK).',
			'Pega la API key abajo y guarda.',
		],
		fields: [
			{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xai-xxxxxxxxxxxxxxxxxxxxxxxx' },
			{ key: 'modelo', label: 'Modelo activo', placeholder: 'grok-2-1212', hint: 'Opciones: grok-2-1212 · grok-2-vision-1212 · grok-beta' },
		],
	},
	{
		id: 'serper',
		label: 'Serper.dev',
		description: 'Google SERP API ultra-rápida con plan gratuito (≈2.500 búsquedas one-time). Alimenta el módulo Inteligencia de Mercado para descubrir precios, productos ganadores y competencia en Google.',
		icon: Search,
		accent: 'from-emerald-400/20 to-cyan-500/10',
		uses: [
			'Buscador agregado (ML + Google)',
			'Detección de productos ganadores / trending',
			'Histórico de subidas/bajadas de precio',
			'SEO con IA: análisis de términos en motores de búsqueda',
		],
		apiKeyUrl: 'https://serper.dev/api-key',
		apiKeyLabel: 'Obtener API Key gratis',
		instructions: [
			'Crea una cuenta gratis en serper.dev (puedes usar tu cuenta Google).',
			'Entra a serper.dev/api-key, copia la API Key (formato hexadecimal de 64 caracteres).',
			'Pégala abajo y guarda. El plan gratis incluye ≈2.500 búsquedas one-time, suficiente para empezar.',
			'Opcional: define SERPER_API_KEY como variable de entorno en Vercel para que no quede en la base de datos.',
		],
		fields: [
			{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
		],
	},
	{
		id: 'serpapi',
		label: 'SerpAPI (futuro · pago)',
		description: 'Alternativa premium a Serper con cobertura mundial y 100 búsquedas gratis al mes. Configurable hoy para activar el upgrade cuando lo necesites.',
		icon: TrendingUp,
		accent: 'from-amber-400/20 to-rose-500/10',
		uses: [
			'Buscador agregado (cuando se prefiere SerpAPI sobre Serper)',
			'Países y mercados regionales adicionales',
			'Resultados orgánicos + shopping en una sola llamada',
		],
		apiKeyUrl: 'https://serpapi.com/manage-api-key',
		apiKeyLabel: 'Obtener API Key',
		instructions: [
			'Crea cuenta en serpapi.com. El plan free entrega 100 búsquedas/mes (suficiente para pruebas).',
			'En serpapi.com/manage-api-key copia tu Private API Key.',
			'Pégala abajo. El módulo Inteligencia de Mercado priorizará Serper si ambas están configuradas; podrás cambiar la fuente desde el selector de la pantalla.',
		],
		fields: [
			{ key: 'api_key', label: 'API Key', type: 'password', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
		],
	},
];

function Field({
	label,
	type = 'text',
	value,
	onChange,
	placeholder,
	hint,
	disabled,
	envBadge,
	strikePreview,
}: {
	label: string;
	type?: 'text' | 'password';
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	hint?: string;
	disabled?: boolean;
	/** Name of the env var supplying this field (renders a "Vercel" pill next to the label). */
	envBadge?: string;
	/** When set, overrides the input with a struck-through preview to convey "ya configurada en Vercel". */
	strikePreview?: string;
}) {
	return (
		<label className="flex flex-col gap-2">
			<span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
				<span>{label}</span>
				{envBadge ? (
					<span
						title={`Definida por la variable de entorno ${envBadge} (Vercel).`}
						className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-[2px] text-[9px] font-bold tracking-[0.16em] text-emerald-300"
					>
						<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
						Vercel
					</span>
				) : null}
			</span>
			{strikePreview ? (
				<div
					aria-readonly="true"
					className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-4 py-3 text-sm"
					title={envBadge ? `Definida por ${envBadge}` : 'Definida en variables de entorno'}
				>
					<span className="truncate font-mono text-emerald-200/80 line-through decoration-emerald-300/60 decoration-2">
						{strikePreview}
					</span>
					<span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-[2px] text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-200">
						Activa
					</span>
				</div>
			) : (
				<input
					type={type}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					disabled={disabled}
					title={label}
					className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-300/50 disabled:opacity-50"
				/>
			)}
			{hint ? <span className="text-[11px] leading-relaxed text-zinc-600">{hint}</span> : null}
		</label>
	);
}

const DIAGNOSTIC_TIPS: Partial<Record<ProviderKey, string[]>> = {
	stripe: [
		'Para producción usa sk_live_; para pruebas sk_test_. Nunca expongas el secret_key en el frontend.',
		'El webhook_secret se obtiene en Stripe → Developers → Webhooks al registrar el endpoint.',
	],
	whatsapp: [
		'Necesitas una cuenta Meta for Developers con WhatsApp Cloud API habilitada.',
		'El phone_number_id está en Meta Business → WhatsApp → Configuración.',
		'El access_token caduca. Para producción genera un token de larga duración desde tu app de Meta.',
	],
	mercadopago: [
		'El access_token de producción empieza con APP_USR-; el de sandbox con TEST-.',
		'Para webhooks define también PLATFORM_MP_WEBHOOK_SECRET en Vercel.',
		'Si el test falla con "Invalid token", verifica que sea de la cuenta correcta (vendedor vs. comprador).',
	],
	mercadolibre: [
		'ML_CLIENT_ID y ML_CLIENT_SECRET deben estar en Vercel — el flujo OAuth los necesita para canjear el code.',
		'El redirect URI en tu app de ML debe ser exactamente: [tu-dominio]/api/admin/ml/oauth/callback',
		'El access_token expira cada 6 h — la app lo renueva automáticamente con el refresh_token guardado.',
	],
	meta: [
		'META_APP_ID y META_APP_SECRET deben estar en Vercel para iniciar el flujo OAuth.',
		'El long-lived token dura ~60 días. Usa "Reconectar Meta" para renovarlo antes de que expire.',
		'Algunos permisos (Ads API, Mensajes) requieren App Review en Meta — los scopes básicos funcionan de inmediato.',
	],
	google: [
		'GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET deben estar en Vercel; el refresh_token se obtiene al completar el flujo OAuth.',
		'Habilita las APIs necesarias en Google Cloud Console (Analytics, Search Console, etc.).',
		'El access_token se renueva automáticamente cada hora usando el refresh_token guardado.',
	],
	google_ads: [
		'El developer_token de Google Ads es diferente al client_id de OAuth — se obtiene en Google Ads → Herramientas → API Center.',
		'Necesitas completar también el flujo OAuth de Google (integración Google) para tener el refresh_token.',
		'El customer_id no lleva guiones en la API (usa 1234567890, no 123-456-7890).',
	],
	tiktok: [
		'TIKTOK_APP_ID y TIKTOK_APP_SECRET deben estar en Vercel para el flujo OAuth.',
		'Asegúrate de que tu app de TikTok for Business esté en modo producción (no sandbox).',
	],
	cloudinary: [
		'Necesitas cloud_name, api_key y api_secret del panel de Cloudinary → Dashboard.',
		'Para subidas sin firma desde el cliente, crea un Upload Preset "unsigned" en Settings → Upload.',
	],
	vercel: [
		'El API token necesita scope "Full Account" para leer deployments y logs.',
		'El project_id está en Vercel → tu proyecto → Settings → General → Project ID.',
	],
	resend: [
		'La API key empieza con re_ y debe tener permiso "Sending access".',
		'El remitente (From) debe ser un dominio verificado en Resend → Domains (no gmail.com ni similares).',
		'Si la key viene de Vercel (RESEND_API_KEY), la rotación automática desde aquí no está disponible — edítala allí.',
	],
	openrouter: [
		'La API key empieza con sk-or-v1-. Créala en openrouter.ai/keys.',
		'Los modelos gratis (sufijo :free) no requieren saldo pero sí una key válida.',
		'Si el test falla, verifica que el modelo seleccionado en el Asistente IA esté actualmente disponible.',
	],
	anthropic: [
		'La API key empieza con sk-ant-. Créala en console.anthropic.com/settings/keys.',
		'Asegúrate de que la cuenta de Anthropic tiene saldo disponible para usar la API (o está en el tier gratuito de prueba).',
		'Si recibes error 401, la API key es inválida o fue revocada. Genera una nueva desde la consola.',
		'Si recibes error 529 (overloaded), Anthropic está saturado; reintenta en unos minutos.',
	],
	groq: [
		'La API key empieza con gsk_. Créala gratis en console.groq.com/keys.',
		'El plan gratuito tiene límites de velocidad (~30 req/min para llama-3.3-70b-versatile). Si el test falla por rate limit, espera un minuto.',
		'Asegúrate de que el modelo en el campo "Modelo activo" sea exactamente uno de los soportados: llama-3.3-70b-versatile, llama-3.1-8b-instant, gemma2-9b-it, mixtral-8x7b-32768.',
		'Para usar Groq como proveedor principal del Asistente IA, ve a Admin → Configuración IA y selecciona "Groq".',
	],
	serper: [
		'La API key es una cadena hexadecimal de 64 caracteres (sin prefijos).',
		'El plan gratuito incluye ~2.500 búsquedas one-time; cuando se agotan necesitas recargar o cambiar a SerpAPI.',
	],
	serpapi: [
		'La Private API Key está en serpapi.com/manage-api-key.',
		'Si tienes Serper también configurado, el módulo Inteligencia de Mercado priorizará Serper por defecto.',
	],
	openai: [
		'La API key empieza con sk-proj- (proyectos) o sk- (legado). Créala en platform.openai.com/api-keys.',
		'Necesitas saldo disponible en tu cuenta OpenAI para realizar llamadas a la API.',
		'GPT-4o-mini es el más económico y rápido; GPT-4o tiene la mayor calidad pero mayor costo.',
		'Si recibes error 429, has superado el rate limit o el crédito disponible está agotado.',
	],
	gemini: [
		'La API key empieza con AIzaSy. Créala gratis en aistudio.google.com/app/apikey.',
		'El plan gratuito incluye 1.500 req/día para Gemini 1.5 Flash y 50 req/día para Gemini 1.5 Pro.',
		'gemini-2.0-flash-exp está disponible gratis con límites generosos.',
		'Si recibes error 429, has alcanzado el límite diario del plan gratuito; espera a que se reinicie a medianoche.',
	],
	grok: [
		'La API key la encuentras en console.x.ai después de iniciar sesión con tu cuenta X.',
		'Los nuevos usuarios reciben $25 de crédito gratuito al crear su primera API key.',
		'La API de Grok usa el mismo formato que OpenAI — endpoint: api.x.ai/v1.',
		'Grok-2-1212 es el modelo más capaz; grok-beta es el modelo estable anterior.',
	],
};

function DiagnosticTip({ provider }: { provider: ProviderKey }) {
	const [open, setOpen] = useState(false);
	const tips = DIAGNOSTIC_TIPS[provider];
	if (!tips || tips.length === 0) return null;
	return (
		<div className="overflow-hidden rounded-xl border border-amber-400/20 bg-amber-400/5 transition-all">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-amber-400/5"
			>
				<span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300/70">
					<HelpCircle className="h-3.5 w-3.5 flex-shrink-0" />
					¿Por qué podría no funcionar?
				</span>
				<ChevronDown
					className={`h-3.5 w-3.5 flex-shrink-0 text-amber-300/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
				/>
			</button>
			{open && (
				<div className="border-t border-amber-400/10 px-3 pb-3 pt-2">
					<ul className="space-y-1.5">
						{tips.map((tip, i) => (
							<li key={i} className="flex gap-2 text-[12px] leading-relaxed text-zinc-400">
								<span className="mt-0.5 flex-shrink-0 text-amber-300/50">›</span>
								<span>{tip}</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

export default function AdminIntegracionesPage() {
	const [integrations, setIntegrations] = useState<Record<string, ProviderStatus>>({});
	const [integrationInputs, setIntegrationInputs] = useState<Record<string, Record<string, string>>>({});
	const [integrationMsg, setIntegrationMsg] = useState<Record<string, { text: string; type: 'success' | 'error' } | null>>({});
	const [integrationTest, setIntegrationTest] = useState<Record<string, TestResult | null>>({});
	const [loadingIntegrations, setLoadingIntegrations] = useState(true);
	const [integrationsError, setIntegrationsError] = useState<string | null>(null);
	const [savingIntegration, setSavingIntegration] = useState<string | null>(null);
	const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
	const [revealDialog, setRevealDialog] = useState<RevealDialogState | null>(null);
	const [revealPassword, setRevealPassword] = useState('');
	const [revealError, setRevealError] = useState<string | null>(null);
	const [revealingProvider, setRevealingProvider] = useState<ProviderKey | null>(null);
	const [revealNow, setRevealNow] = useState(() => Date.now());
	const [quotaSnapshots, setQuotaSnapshots] = useState<Record<string, { used: number | null; limit: number | null; capturedAt: string }>>({});
	const [rotateConfirmOpen, setRotateConfirmOpen] = useState<ProviderKey | null>(null);
	const [rotatingProvider, setRotatingProvider] = useState<ProviderKey | null>(null);
	const [revokingOAuth, setRevokingOAuth] = useState<ProviderKey | null>(null);
	const [revokeConfirmOpen, setRevokeConfirmOpen] = useState<ProviderKey | null>(null);

	// OAuth callback feedback. After /api/admin/{ml,google,meta,tiktok}/oauth/callback completes,
	// the user lands here with `?connected=<provider>&account|seller=...&expires_at=...`
	// or `?<provider>_error=<msg>`. We surface that as a banner; loadIntegrations()
	// already runs on mount so the saved tokens appear pre-filled in the card.
	const searchParams = useSearchParams();
	const oauthConnected = searchParams?.get('connected') ?? null;
	const oauthSeller = searchParams?.get('seller') ?? null;
	const oauthAccount = searchParams?.get('account') ?? null;
	const oauthExpiresAt = searchParams?.get('expires_at') ?? null;
	const oauthPendingReview = searchParams?.get('pending_review') ?? null;
	const oauthError =
		searchParams?.get('ml_error') ??
		searchParams?.get('google_error') ??
		searchParams?.get('meta_error') ??
		searchParams?.get('tiktok_error') ??
		null;
	const oauthErrorProvider = searchParams?.get('google_error')
		? 'google'
		: searchParams?.get('meta_error')
			? 'meta'
			: searchParams?.get('tiktok_error')
				? 'tiktok'
				: searchParams?.get('ml_error')
					? 'mercadolibre'
					: null;

	const connectedCount = useMemo(
		() => PROVIDERS.filter((prov) => Object.values(integrations[prov.id]?.credentials ?? {}).some((c) => c.set)).length,
		[integrations],
	);

	async function loadIntegrations() {
		setLoadingIntegrations(true);
		setIntegrationsError(null);
		try {
			const res = await fetch('/api/admin/integrations', { cache: 'no-store' });
			const json = await res.json();
			if (!res.ok) {
				setIntegrationsError(json.hint ?? json.error ?? 'No se pudieron leer las integraciones.');
				return;
			}
			setIntegrations(json.providers ?? {});
		} catch (err) {
			setIntegrationsError(err instanceof Error ? err.message : 'Error de red al leer integraciones.');
		} finally {
			setLoadingIntegrations(false);
		}
	}

	useEffect(() => {
		void loadIntegrations();
		// Quota snapshots load is best-effort; the cron may not have run yet
		// (or the table may be missing on older deployments). In either case
		// the QuotaBar component just renders nothing.
		(async () => {
			try {
				const res = await fetch('/api/admin/integrations/quota', { cache: 'no-store' });
				if (!res.ok) return;
				const json = (await res.json()) as { snapshots?: Array<{ provider: string; used: number | null; limit: number | null; captured_at: string }> };
				const map: Record<string, { used: number | null; limit: number | null; capturedAt: string }> = {};
				for (const s of json.snapshots ?? []) {
					map[s.provider] = { used: s.used, limit: s.limit, capturedAt: s.captured_at };
				}
				setQuotaSnapshots(map);
			} catch {
				// ignore — UI degrades gracefully without quota bars.
			}
		})();
	}, []);

	useEffect(() => {
		if (!revealDialog?.expiresAt) return;
		const intervalId = window.setInterval(() => {
			setRevealNow(Date.now());
		}, 250);
		const timeoutMs = Math.max(revealDialog.expiresAt - Date.now(), 0);
		const timeoutId = window.setTimeout(() => {
			setRevealDialog(null);
			setRevealPassword('');
			setRevealError(null);
			setRevealingProvider(null);
		}, timeoutMs);
		return () => {
			window.clearInterval(intervalId);
			window.clearTimeout(timeoutId);
		};
	}, [revealDialog?.expiresAt]);

	const activeRevealProvider = useMemo(
		() => (revealDialog ? PROVIDERS.find((provider) => provider.id === revealDialog.provider) ?? null : null),
		[revealDialog],
	);

	const revealCountdown = revealDialog?.expiresAt ? Math.max(0, Math.ceil((revealDialog.expiresAt - revealNow) / 1000)) : 0;

	const revealedEntries = useMemo(() => {
		if (!revealDialog?.credentials || !activeRevealProvider) return [] as Array<{ key: string; label: string; value: string }>;
		const labels = new Map(activeRevealProvider.fields.map((field) => [field.key, field.label]));
		const fieldOrder = new Map(activeRevealProvider.fields.map((field, index) => [field.key, index]));
		return Object.entries(revealDialog.credentials)
			.sort(([leftKey], [rightKey]) => (fieldOrder.get(leftKey) ?? Number.MAX_SAFE_INTEGER) - (fieldOrder.get(rightKey) ?? Number.MAX_SAFE_INTEGER))
			.map(([key, value]) => ({ key, label: labels.get(key) ?? key, value }));
	}, [activeRevealProvider, revealDialog]);

	function closeRevealDialog() {
		setRevealDialog(null);
		setRevealPassword('');
		setRevealError(null);
		setRevealingProvider(null);
	}

	function openRevealDialog(provider: ProviderKey) {
		setRevealDialog({ provider, credentials: null, expiresAt: null, updatedAt: null });
		setRevealPassword('');
		setRevealError(null);
		setRevealingProvider(null);
		setRevealNow(Date.now());
	}

	async function handleRevealIntegration() {
		if (!revealDialog) return;
		setRevealingProvider(revealDialog.provider);
		setRevealError(null);
		try {
			const res = await fetch('/api/admin/integrations/reveal', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: revealDialog.provider, password: revealPassword }),
			});
			const json = (await res.json().catch(() => ({}))) as RevealResponse;
			if (!res.ok || !json.credentials) {
				setRevealError(json.error ?? json.hint ?? 'No se pudieron revelar las credenciales.');
				return;
			}
			const expiresInSeconds = typeof json.expiresInSeconds === 'number' && json.expiresInSeconds > 0 ? json.expiresInSeconds : 30;
			setRevealNow(Date.now());
			setRevealDialog((prev) =>
				prev && prev.provider === revealDialog.provider
					? {
						...prev,
						credentials: json.credentials ?? null,
						expiresAt: Date.now() + expiresInSeconds * 1000,
						updatedAt: json.updatedAt ?? null,
					}
					: prev,
			);
		} catch (err) {
			setRevealError(err instanceof Error ? err.message : 'Error de red al revelar credenciales.');
		} finally {
			setRevealingProvider(null);
		}
	}

	async function handleSaveIntegration(provider: ProviderKey): Promise<AdminActionResult> {
		const credentials = integrationInputs[provider] ?? {};
		const submittedCredentials = Object.fromEntries(
			Object.entries(credentials).filter(([, value]) => typeof value === 'string' && value.trim().length > 0),
		);
		if (Object.keys(submittedCredentials).length === 0) {
			const error = 'Ingresa al menos un campo antes de conectar.';
			setIntegrationMsg((prev) => ({ ...prev, [provider]: { text: error, type: 'error' } }));
			return { ok: false, error };
		}

		setSavingIntegration(provider);
		setIntegrationMsg((prev) => ({ ...prev, [provider]: null }));
		try {
			const res = await fetch('/api/admin/integrations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider, credentials: submittedCredentials }),
			});
			const json = (await res.json().catch(() => ({}))) as {
				ok?: boolean;
				error?: string;
				code?: string;
				details?: string;
				hint?: string;
				statusCode?: number;
			};
			if (!res.ok) {
				const text = json.error ?? json.hint ?? 'Error al guardar la integración.';
				setIntegrationMsg((prev) => ({ ...prev, [provider]: { text, type: 'error' } }));
				return {
					ok: false,
					error: text,
					code: json.code,
					details: json.details,
					hint: json.hint,
					statusCode: json.statusCode ?? res.status,
				};
			}
			setIntegrationMsg((prev) => ({
				...prev,
				[provider]: { text: 'Conexión guardada y validada correctamente.', type: 'success' },
			}));
			setIntegrationInputs((prev) => ({ ...prev, [provider]: {} }));
			await loadIntegrations();
			return { ok: true };
		} catch (err) {
			const text = err instanceof Error ? err.message : 'Error de red.';
			setIntegrationMsg((prev) => ({ ...prev, [provider]: { text, type: 'error' } }));
			return { ok: false, error: text };
		} finally {
			setSavingIntegration(null);
		}
	}

	async function handleDeleteIntegration(provider: ProviderKey) {
		setSavingIntegration(provider);
		setIntegrationMsg((prev) => ({ ...prev, [provider]: null }));
		try {
			const res = await fetch(`/api/admin/integrations?provider=${encodeURIComponent(provider)}`, {
				method: 'DELETE',
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				setIntegrationMsg((prev) => ({
					...prev,
					[provider]: { text: (json as { error?: string }).error ?? 'No se pudo desactivar.', type: 'error' },
				}));
				return;
			}
			setIntegrationMsg((prev) => ({ ...prev, [provider]: { text: 'Integración desactivada.', type: 'success' } }));
			setIntegrationTest((prev) => ({ ...prev, [provider]: null }));
			await loadIntegrations();
		} catch (err) {
			setIntegrationMsg((prev) => ({
				...prev,
				[provider]: { text: err instanceof Error ? err.message : 'Error de red.', type: 'error' },
			}));
		} finally {
			setSavingIntegration(null);
		}
	}

	async function handleRevokeOAuth(provider: ProviderKey) {
		setRevokingOAuth(provider);
		setRevokeConfirmOpen(null);
		setIntegrationMsg((prev) => ({ ...prev, [provider]: null }));
		try {
			const res = await fetch('/api/admin/integrations/oauth/revoke', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider }),
			});
			const json = (await res.json().catch(() => ({}))) as {
				ok?: boolean;
				error?: string;
				revokedAtProvider?: boolean;
				providerDetail?: string;
			};
			if (!res.ok || !json.ok) {
				setIntegrationMsg((prev) => ({
					...prev,
					[provider]: { text: json.error ?? 'No se pudo desconectar.', type: 'error' },
				}));
				return;
			}
			const detail = json.revokedAtProvider
				? 'Token revocado en el proveedor y credenciales eliminadas.'
				: `Credenciales eliminadas. ${json.providerDetail ?? ''}`.trim();
			setIntegrationMsg((prev) => ({ ...prev, [provider]: { text: detail, type: 'success' } }));
			setIntegrationTest((prev) => ({ ...prev, [provider]: null }));
			await loadIntegrations();
		} catch (err) {
			setIntegrationMsg((prev) => ({
				...prev,
				[provider]: { text: err instanceof Error ? err.message : 'Error de red.', type: 'error' },
			}));
		} finally {
			setRevokingOAuth(null);
		}
	}

	async function handleRotateResend() {
		setRotatingProvider('resend');
		setIntegrationMsg((prev) => ({ ...prev, resend: null }));
		try {
			const res = await fetch('/api/admin/integrations/rotate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: 'resend' }),
			});
			const json = (await res.json().catch(() => ({}))) as {
				ok?: boolean;
				error?: string;
				deleteWarning?: string | null;
				newKeyId?: string | null;
				oldKeyId?: string | null;
			};
			if (!res.ok || !json.ok) {
				setIntegrationMsg((prev) => ({
					...prev,
					resend: { text: json.error ?? 'No se pudo rotar la API key.', type: 'error' },
				}));
				return;
			}
			const warning = json.deleteWarning
				? ` Aviso: la key anterior no se pudo borrar (${json.deleteWarning}); revísalo en resend.com/api-keys.`
				: '';
			setIntegrationMsg((prev) => ({
				...prev,
				resend: {
					text: `API key rotada con éxito. Nueva key id: ${json.newKeyId ?? 'desconocido'}.${warning}`,
					type: 'success',
				},
			}));
			await loadIntegrations();
		} catch (err) {
			setIntegrationMsg((prev) => ({
				...prev,
				resend: { text: err instanceof Error ? err.message : 'Error de red al rotar la key.', type: 'error' },
			}));
		} finally {
			setRotatingProvider(null);
			setRotateConfirmOpen(null);
		}
	}

	async function handleTestIntegration(provider: ProviderKey) {
		setTestingIntegration(provider);
		setIntegrationTest((prev) => ({ ...prev, [provider]: null }));
		try {
			const res = await fetch(`/api/admin/integrations/test?provider=${encodeURIComponent(provider)}`, { cache: 'no-store' });
			const json = (await res.json().catch(() => ({}))) as TestResult;
			setIntegrationTest((prev) => ({
				...prev,
				[provider]: {
					ok: !!json.ok,
					error: json.error,
					checks: json.checks ?? [],
				},
			}));
		} catch (err) {
			setIntegrationTest((prev) => ({
				...prev,
				[provider]: { ok: false, error: err instanceof Error ? err.message : 'Error de red.', checks: [] },
			}));
		} finally {
			setTestingIntegration(null);
		}
	}

	return (
		<AdminPage>
			<AdminPageHeader
				eyebrow="Admin · Integraciones"
				title="Centro de integraciones"
				description="Conecta, valida y desactiva cada API desde una sola pantalla. La barra animada muestra el estado real de conexión: verde cuando responde, roja cuando falla, y el detalle exacto del error queda visible abajo."
				icon={Workflow}
				meta={
					<>
						<span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-300">
							{connectedCount} conectadas
						</span>
						<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-zinc-300">
							{PROVIDERS.length - connectedCount} pendientes
						</span>
					</>
				}
				actions={
					<button
						type="button"
						onClick={() => void loadIntegrations()}
						disabled={loadingIntegrations}
						className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/5 disabled:opacity-50"
					>
						<RefreshCw className={`h-4 w-4 ${loadingIntegrations ? 'animate-spin' : ''}`} />
						Actualizar estado
					</button>
				}
			/>

			{oauthConnected === 'mercadolibre' ? (
				<AdminCard className="border-emerald-500/30 bg-emerald-500/10">
					<div className="flex items-start gap-3 text-sm text-emerald-100">
						<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-emerald-200">
								Cuenta de Mercado Libre vinculada{oauthSeller ? ` como ${oauthSeller}` : ''}.
							</p>
							<p className="mt-1 leading-relaxed text-emerald-200/80">
								Los campos de la integración MercadoLibre se actualizaron con el access_token, refresh_token y user_id devueltos por ML.
								{oauthExpiresAt ? ` El access_token expira el ${oauthExpiresAt} (la app lo renueva sola).` : ''}
							</p>
						</div>
					</div>
				</AdminCard>
			) : null}

			{oauthConnected === 'google' || oauthConnected === 'meta' || oauthConnected === 'tiktok' ? (
				<AdminCard className="border-emerald-500/30 bg-emerald-500/10">
					<div className="flex items-start gap-3 text-sm text-emerald-100">
						<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-emerald-200">
								{oauthConnected === 'google' ? 'Google' : oauthConnected === 'meta' ? 'Meta (Facebook + Instagram)' : 'TikTok for Business'}
								{' '}vinculado{oauthAccount ? ` como ${oauthAccount}` : ''}.
							</p>
							<p className="mt-1 leading-relaxed text-emerald-200/80">
								Las credenciales se guardaron cifradas en la tabla integrations.
								{oauthExpiresAt ? ` El token expira el ${oauthExpiresAt}.` : ''}
								{oauthConnected === 'google' ? ' El access_token se renueva automáticamente cada hora con el refresh_token.' : null}
								{oauthConnected === 'meta' ? ' El long-lived token dura ~60 días; el cron de salud avisa antes de expirar.' : null}
								{oauthConnected === 'tiktok' ? ' El access_token de TikTok no expira; sólo se invalida si el merchant revoca permiso.' : null}
							</p>
							{oauthConnected === 'meta' && oauthPendingReview ? (
								<p className="mt-2 rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[12px] text-amber-100">
									<strong>Pendiente de App Review:</strong> {oauthPendingReview}. Estos scopes se solicitaron pero Meta no los concedió;
									las funciones que los requieran no operarán hasta que el merchant los apruebe en la consola de Meta.
								</p>
							) : null}
						</div>
					</div>
				</AdminCard>
			) : null}

			{oauthError ? (
				<AdminCard className="border-red-500/30 bg-red-500/5">
					<div className="flex items-start gap-3 text-sm text-red-200">
						<ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
						<div>
							<p className="font-semibold text-red-300">
								{oauthErrorProvider === 'google'
									? 'No se pudo conectar Google'
									: oauthErrorProvider === 'meta'
										? 'No se pudo conectar Meta'
										: oauthErrorProvider === 'tiktok'
											? 'No se pudo conectar TikTok'
											: 'No se pudo conectar Mercado Libre'}
							</p>
							<p className="mt-1 font-mono text-xs leading-relaxed text-red-200/80">{oauthError}</p>
						</div>
					</div>
				</AdminCard>
			) : null}

			{integrationsError ? (
				<AdminCard className="border-red-500/30 bg-red-500/5">
					<div className="flex items-start gap-3 text-sm text-red-200">
						<ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
						<div>
							<p className="font-semibold text-red-300">Error al cargar integraciones</p>
							<p className="mt-1 leading-relaxed">{integrationsError}</p>
						</div>
					</div>
				</AdminCard>
			) : null}

			{revokeConfirmOpen ? (() => {
				const prov = PROVIDERS.find((p) => p.id === revokeConfirmOpen);
				const provLabel = prov?.label ?? revokeConfirmOpen;
				return (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
						<button
							type="button"
							aria-label="Cerrar confirmación"
							onClick={() => (revokingOAuth ? null : setRevokeConfirmOpen(null))}
							className="absolute inset-0 bg-black/80 backdrop-blur-sm"
						/>
						<div className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/10 bg-zinc-950/95 p-6 shadow-2xl shadow-black/40">
							<div className="flex items-start justify-between gap-4">
								<div>
									<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-400">Desconectar OAuth</p>
									<h2 className="mt-2 text-xl font-black text-white">¿Desconectar {provLabel}?</h2>
									<p className="mt-2 text-sm leading-relaxed text-zinc-400">
										Se intentará revocar el token en {provLabel} y se borrarán las credenciales guardadas. Tendrás que volver a pasar por el flujo OAuth para reconectar.
									</p>
								</div>
							</div>
							<div className="mt-6 flex flex-wrap items-center gap-3">
								<button
									type="button"
									onClick={() => void handleRevokeOAuth(revokeConfirmOpen)}
									disabled={revokingOAuth === revokeConfirmOpen}
									className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-red-400 disabled:opacity-50"
								>
									{revokingOAuth === revokeConfirmOpen ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
									Sí, desconectar
								</button>
								<button
									type="button"
									onClick={() => setRevokeConfirmOpen(null)}
									disabled={revokingOAuth === revokeConfirmOpen}
									className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
								>
									Cancelar
								</button>
							</div>
						</div>
					</div>
				);
			})() : null}

			{rotateConfirmOpen === 'resend' ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<button
						type="button"
						aria-label="Cerrar confirmación"
						onClick={() => (rotatingProvider === 'resend' ? null : setRotateConfirmOpen(null))}
						className="absolute inset-0 bg-black/80 backdrop-blur-sm"
					/>
					<div className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/10 bg-zinc-950/95 p-6 shadow-2xl shadow-black/40">
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">Rotar API key</p>
								<h2 className="mt-2 text-xl font-black text-white">¿Confirmar rotación?</h2>
								<p className="mt-2 text-sm leading-relaxed text-zinc-400">
									Esto creará una nueva key en Resend, validará que funciona consultando <code className="font-mono">/domains</code> y borrará la anterior. Si la validación falla, no se borra nada y la key actual sigue activa.
								</p>
							</div>
						</div>
						<div className="mt-6 flex flex-wrap items-center gap-3">
							<button
								type="button"
								onClick={() => void handleRotateResend()}
								disabled={rotatingProvider === 'resend'}
								className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-950 transition hover:bg-cyan-300 disabled:opacity-50"
							>
								{rotatingProvider === 'resend' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
								Sí, rotar ahora
							</button>
							<button
								type="button"
								onClick={() => setRotateConfirmOpen(null)}
								disabled={rotatingProvider === 'resend'}
								className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
							>
								Cancelar
							</button>
						</div>
					</div>
				</div>
			) : null}

			{revealDialog && activeRevealProvider ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<button type="button" aria-label="Cerrar revelado" onClick={closeRevealDialog} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
					<div className="relative z-10 w-full max-w-2xl rounded-[2rem] border border-white/10 bg-zinc-950/95 p-6 shadow-2xl shadow-black/40">
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">Revelado temporal</p>
								<h2 className="mt-2 text-2xl font-black text-white">{activeRevealProvider.label}</h2>
								<p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
									Las credenciales se muestran solo en esta sesión del navegador y se eliminan automáticamente a los 30 segundos.
								</p>
							</div>
							<button
								type="button"
								onClick={closeRevealDialog}
								className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:bg-white/5 hover:text-white"
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						{revealDialog.credentials ? (
							<div className="mt-6 space-y-4">
								<div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
									<span className="rounded-full border border-emerald-400/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
										{revealCountdown}s restantes
									</span>
									<span>La ventana se cerrará automáticamente cuando el contador llegue a cero.</span>
								</div>
								<div className="grid gap-3">
									{revealedEntries.map((entry) => (
										<div key={entry.key} className="rounded-2xl border border-white/10 bg-black/25 p-4">
											<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">{entry.label}</p>
											<p className="mt-2 break-all font-mono text-sm text-white">{entry.value}</p>
										</div>
									))}
								</div>
								{revealDialog.updatedAt ? <p className="text-xs text-zinc-500">Última actualización: {new Date(revealDialog.updatedAt).toLocaleString('es-CL')}</p> : null}
							</div>
						) : (
							<div className="mt-6 space-y-4">
								<div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
									<p className="font-semibold text-amber-200">Protección adicional</p>
									<p className="mt-2 leading-relaxed">
										Ingresa la contraseña definida en ADMIN_VIEW_PASSWORD para ver las credenciales cifradas de esta integración.
									</p>
								</div>
								<Field
									label="Contraseña de visualización"
									type="password"
									value={revealPassword}
									onChange={setRevealPassword}
									placeholder="Ingresa ADMIN_VIEW_PASSWORD"
									disabled={revealingProvider === revealDialog.provider}
								/>
								{revealError ? (
									<div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{revealError}</div>
								) : null}
								<div className="flex flex-wrap items-center gap-3">
									<button
										type="button"
										onClick={() => void handleRevealIntegration()}
										disabled={revealingProvider === revealDialog.provider || revealPassword.trim().length === 0}
										className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-100 transition hover:bg-amber-400/15 disabled:opacity-50"
									>
										{revealingProvider === revealDialog.provider ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
										Revelar por 30s
									</button>
									<button
										type="button"
										onClick={closeRevealDialog}
										className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300 transition hover:bg-white/5"
									>
										Cancelar
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			) : null}

			<div className="grid gap-5 grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
				{PROVIDERS.map((provider) => {
					const Icon = provider.icon;
					const status = integrations[provider.id];
					const inputs = integrationInputs[provider.id] ?? {};
					const msg = integrationMsg[provider.id];
					const test = integrationTest[provider.id];
					const isConfigured = Object.values(status?.credentials ?? {}).some((credential) => credential.set);
					const envManaged = !!status?.envManaged;
					const hasAnyEnv = Object.values(status?.credentials ?? {}).some((c) => c.source === 'env');
					const submittedCredentials = Object.fromEntries(
						Object.entries(inputs).filter(([, value]) => typeof value === 'string' && value.trim().length > 0),
					);
					const actionName = isConfigured ? 'Actualizar conexión' : 'Conectar';

					return (
						<AdminCard key={provider.id} glow className="overflow-visible p-0">
							<AdminActionGuard
								actionName={actionName}
								payload={{ provider: provider.id, credentials: submittedCredentials }}
								onExecute={() => handleSaveIntegration(provider.id)}
								missingTableSql={INTEGRATIONS_TABLE_SQL}
								disabled={Object.keys(submittedCredentials).length === 0 || loadingIntegrations || savingIntegration === provider.id}
								className="rounded-[1.5rem] border-0 bg-transparent"
							>
								<div className={`rounded-t-[1.5rem] bg-gradient-to-r ${provider.accent} p-5`}>
									<div className="flex items-start justify-between gap-4">
										<div className="min-w-0">
											<div className="flex items-center gap-3">
												<span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-white">
													<Icon className="h-5 w-5" />
												</span>
												<div>
													<p className="text-base font-black text-white">{provider.label}</p>
													<p className="mt-1 text-sm text-zinc-300">{provider.description}</p>
												</div>
											</div>
											<div className="mt-3 flex flex-wrap gap-2">
												{provider.uses.map((useCase) => (
													<span key={useCase} className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-200">
														{useCase}
													</span>
												))}
											</div>
										</div>
										<div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
											envManaged
												? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
												: isConfigured
													? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
													: 'border-zinc-700 bg-black/40 text-zinc-500'
										}`}>
											{envManaged ? 'Vercel · Activa' : isConfigured ? 'Conectada' : 'Desactivada'}
										</div>
									</div>
								</div>

								<div className="space-y-4 p-5">
									{hasAnyEnv ? (
										<div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-3 text-[12px] leading-relaxed text-emerald-100">
											<div className="flex items-start gap-2">
												<span className="mt-1 inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
												<div className="min-w-0">
													<p className="font-semibold text-emerald-200">
														{envManaged
															? 'Esta integración ya está conectada vía variables de entorno (Vercel).'
															: 'Algunos campos están definidos en Vercel.'}
													</p>
													<p className="mt-1 text-emerald-100/80">
														Los campos con el sello <span className="font-semibold">Vercel</span> aparecen tachados porque ya
														están cargados en el deploy: el servidor los usa directamente sin pasar por la base de datos. No
														los reingreses aquí; para cambiarlos, edítalos en Vercel → Project Settings → Environment Variables.
													</p>
												</div>
											</div>
										</div>
									) : null}

									{provider.id === 'mercadolibre' ? (() => {
										const connectedAt = status?.credentials?.['connected_at'];
										const expiresAt = status?.credentials?.['expires_at'];
										const userId = status?.credentials?.['user_id'];
										return (
											<div className={`rounded-2xl border p-4 ${isConfigured ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-yellow-400/30 bg-yellow-400/5'}`}>
												{isConfigured ? (
													<div className="mb-3 flex items-center gap-2">
														<span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
														<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">Vinculado con OAuth</p>
													</div>
												) : (
													<p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-yellow-300">OAuth · Recomendado</p>
												)}
												{isConfigured && (userId?.set || connectedAt?.set) ? (
													<div className="mb-3 grid gap-1 text-[12px] text-zinc-400">
														{userId?.set ? <span>Usuario ML: <span className="font-mono text-zinc-200">{userId.preview}</span></span> : null}
														{expiresAt?.set ? <span>Token expira: <span className="font-mono text-zinc-200">{expiresAt.preview}</span></span> : null}
														{connectedAt?.set ? <span>Conectado: <span className="font-mono text-zinc-300">{connectedAt.preview}</span></span> : null}
													</div>
												) : null}
												{!isConfigured ? (
													<p className="mb-3 text-sm text-zinc-300">
														Usa el botón para iniciar el flujo OAuth + PKCE con Mercado Libre.
														Los campos se llenarán automáticamente y el access_token se renovará cada 6 h.
													</p>
												) : null}
												<p className="mb-3 text-[11px] leading-relaxed text-zinc-500">
													Requiere <code className="font-mono text-yellow-200/80">ML_CLIENT_ID</code> y{' '}
													<code className="font-mono text-yellow-200/80">ML_CLIENT_SECRET</code> en Vercel.
													Redirect URI: <code className="font-mono text-yellow-200/80">/api/admin/ml/oauth/callback</code>.
												</p>
												<div className="flex flex-wrap gap-2">
													<a
														href="/api/admin/ml/oauth/start"
														className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-950 transition hover:bg-yellow-300"
													>
														<LinkIcon className="h-3.5 w-3.5" />
														{isConfigured ? 'Reconectar Mercado Libre' : 'Conectar con Mercado Libre'}
													</a>
													{isConfigured ? (
														<button
															type="button"
															onClick={() => setRevokeConfirmOpen('mercadolibre')}
															disabled={revokingOAuth === 'mercadolibre'}
															className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
														>
															{revokingOAuth === 'mercadolibre' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
															Desconectar ML
														</button>
													) : null}
												</div>
											</div>
										);
									})() : null}

									{provider.id === 'google' || provider.id === 'meta' || provider.id === 'tiktok' ? (() => {
										const providerName = provider.id === 'google' ? 'Google' : provider.id === 'meta' ? 'Meta' : 'TikTok';
										const startHref = `/api/admin/${provider.id}/oauth/start`;
										const connectedAt = status?.credentials?.['connected_at'];
										const expiresAt = status?.credentials?.['expires_at'];
										const grantedScopes = status?.credentials?.['granted_scopes'];
										return (
											<div className={`rounded-2xl border p-4 ${isConfigured ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-yellow-400/30 bg-yellow-400/5'}`}>
												{isConfigured ? (
													<div className="mb-3 flex items-center gap-2">
														<span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
														<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">Vinculado con OAuth</p>
													</div>
												) : (
													<p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-yellow-300">OAuth · Recomendado</p>
												)}
												{isConfigured && (connectedAt?.set || expiresAt?.set) ? (
													<div className="mb-3 grid gap-1 text-[12px] text-zinc-400">
														{expiresAt?.set ? <span>Token expira: <span className="font-mono text-zinc-200">{expiresAt.preview}</span></span> : null}
														{provider.id === 'meta' && grantedScopes?.set ? (
															<span>Scopes: <span className="font-mono text-zinc-300 text-[11px]">{grantedScopes.preview}</span></span>
														) : null}
														{connectedAt?.set ? <span>Conectado: <span className="font-mono text-zinc-300">{connectedAt.preview}</span></span> : null}
													</div>
												) : null}
												{!isConfigured ? (
													<p className="mb-3 text-sm text-zinc-300">
														{provider.id === 'google'
															? 'OAuth + PKCE con Google. access_token, refresh_token y expires_at se guardarán cifrados; el token se renueva solo cada hora.'
															: provider.id === 'meta'
																? 'OAuth con Meta para Facebook Pages, Instagram Business, Ads y WhatsApp. Long-lived token (~60 d) guardado cifrado.'
																: 'OAuth de TikTok for Business. access_token no expira; se guarda la lista de advertisers.'}
													</p>
												) : null}
												<p className="mb-3 text-[11px] leading-relaxed text-zinc-500">
													Requiere{' '}
													{provider.id === 'google' ? (
														<><code className="font-mono text-yellow-200/80">GOOGLE_CLIENT_ID</code> y <code className="font-mono text-yellow-200/80">GOOGLE_CLIENT_SECRET</code></>
													) : provider.id === 'meta' ? (
														<><code className="font-mono text-yellow-200/80">META_APP_ID</code> y <code className="font-mono text-yellow-200/80">META_APP_SECRET</code></>
													) : (
														<><code className="font-mono text-yellow-200/80">TIKTOK_APP_ID</code> y <code className="font-mono text-yellow-200/80">TIKTOK_APP_SECRET</code></>
													)}{' '}en Vercel.
												</p>
												<div className="flex flex-wrap gap-2">
													<a
														href={startHref}
														className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-950 transition hover:bg-yellow-300"
													>
														<LinkIcon className="h-3.5 w-3.5" />
														{isConfigured ? `Reconectar ${providerName}` : `Conectar con ${providerName}`}
													</a>
													{isConfigured ? (
														<button
															type="button"
															onClick={() => setRevokeConfirmOpen(provider.id as ProviderKey)}
															disabled={revokingOAuth === provider.id}
															className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
														>
															{revokingOAuth === provider.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
															Desconectar {providerName}
														</button>
													) : null}
												</div>
											</div>
										);
									})() : null}

									{provider.id === 'resend' ? (
										<div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-4">
											<div className="flex flex-wrap items-start justify-between gap-3">
												<div className="min-w-0 flex-1">
													<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">
														Rotación automática · Resend
													</p>
													<p className="mt-1 text-sm text-zinc-300">
														Crea una nueva API key en Resend, valida que funciona consultando <code className="font-mono text-cyan-200/80">/domains</code>{' '}
														y borra la anterior — todo desde acá. Si la validación falla, no se borra nada (la key actual sigue viva).
													</p>
													<p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
														Sólo disponible cuando la key está guardada en la base de datos. Si proviene de una variable de entorno
														(<code className="font-mono text-cyan-200/80">RESEND_API_KEY</code> / <code className="font-mono text-cyan-200/80">RESEND_KEY</code>),
														bórrala primero de Vercel y guárdala desde este formulario.
													</p>
												</div>
												<button
													type="button"
													onClick={() => setRotateConfirmOpen('resend')}
													disabled={
														envManaged ||
														rotatingProvider === 'resend' ||
														!isConfigured ||
														loadingIntegrations
													}
													title={
														envManaged
															? 'Rotación deshabilitada: la key viene de una variable de entorno (Vercel).'
															: !isConfigured
																? 'Conecta la integración primero.'
																: 'Crear una nueva key, validarla y borrar la anterior.'
													}
													className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
												>
													{rotatingProvider === 'resend' ? (
														<Loader2 className="h-3.5 w-3.5 animate-spin" />
													) : (
														<RefreshCw className="h-3.5 w-3.5" />
													)}
													🔄 Rotar API key
												</button>
											</div>
										</div>
									) : null}

									{provider.apiKeyUrl || (provider.instructions && provider.instructions.length > 0) ? (
										<div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
											<div className="flex flex-wrap items-start justify-between gap-3">
												<div className="min-w-0 flex-1">
													<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">
														Cómo obtener tus credenciales
													</p>
													{provider.instructions && provider.instructions.length > 0 ? (
														<ol className="mt-2 list-decimal space-y-1 pl-4 text-sm leading-relaxed text-zinc-300">
															{provider.instructions.map((step, i) => (
																<li key={i}>{step}</li>
															))}
														</ol>
													) : null}
												</div>
												{provider.apiKeyUrl ? (
													<a
														href={provider.apiKeyUrl}
														target="_blank"
														rel="noopener noreferrer"
														className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-950 transition hover:bg-amber-300"
													>
														<LinkIcon className="h-3.5 w-3.5" />
														{provider.apiKeyLabel ?? 'Obtener API Key'}
													</a>
												) : null}
											</div>
										</div>
									) : null}

									<div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
										{provider.fields.map((field) => {
											const existing = status?.credentials?.[field.key];
											const isEnv = existing?.source === 'env';
											return (
												<Field
													key={field.key}
													label={field.label}
													type={field.type ?? 'text'}
													value={inputs[field.key] ?? ''}
													onChange={(value) =>
														setIntegrationInputs((prev) => ({
															...prev,
															[provider.id]: { ...(prev[provider.id] ?? {}), [field.key]: value },
														}))
													}
													placeholder={existing?.set ? existing.preview : field.placeholder}
													hint={
														isEnv
															? `Configurada en Vercel (${existing?.envVar ?? 'env'}). Para cambiarla, actualiza la variable de entorno en el dashboard de Vercel.`
															: existing?.set
																? 'Valor actual oculto. Déjalo vacío para mantenerlo.'
																: field.hint
													}
													disabled={loadingIntegrations || savingIntegration === provider.id || isEnv}
													envBadge={isEnv ? existing?.envVar : undefined}
													strikePreview={isEnv ? existing?.preview : undefined}
												/>
											);
										})}
									</div>

									<div className="rounded-2xl border border-white/10 bg-black/25 p-4">
										{quotaSnapshots[provider.id] ? (
											<div className="mb-3">
												<QuotaBar
													provider={provider.id}
													used={quotaSnapshots[provider.id].used}
													limit={quotaSnapshots[provider.id].limit}
													capturedAt={quotaSnapshots[provider.id].capturedAt}
													unit={unitForProvider(provider.id)}
												/>
											</div>
										) : null}
										<div className="mb-3 flex items-center justify-between gap-3">
											<div>
												<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Conexión en vivo</p>
												<p className="mt-1 text-sm text-zinc-500">Barra verde si responde bien, roja si falla y gris si aún no está configurada.</p>
											</div>
											<button
												type="button"
												onClick={() => void handleTestIntegration(provider.id)}
												disabled={testingIntegration === provider.id || savingIntegration === provider.id}
												className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/5 disabled:opacity-50"
											>
												{testingIntegration === provider.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
												Probar ahora
											</button>
										</div>
										<ConnectionPulse
											name={provider.label}
											pingUrl={`/api/admin/integrations/test?provider=${provider.id}`}
											disabled={!isConfigured}
											initialStatus={envManaged ? 'connected' : isConfigured ? 'reconnecting' : 'unconfigured'}
										/>
									</div>

									<div className="flex flex-wrap items-center gap-2">
										<button
											type="button"
											onClick={() => void handleTestIntegration(provider.id)}
											disabled={testingIntegration === provider.id || savingIntegration === provider.id}
											className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/5 disabled:opacity-50"
										>
											{testingIntegration === provider.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
											Validar uso real
										</button>
										{isConfigured ? (
											<button
												type="button"
												onClick={() => openRevealDialog(provider.id)}
												disabled={savingIntegration === provider.id || testingIntegration === provider.id}
												className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200 transition hover:bg-amber-400/10 disabled:opacity-50"
											>
												<Eye className="h-3.5 w-3.5" />
												Ver claves 30s
											</button>
										) : null}
										{/* OAuth providers use the Desconectar button in their OAuth section above;
										    non-OAuth providers get the generic Desactivar here. */}
										{isConfigured && !OAUTH_PROVIDERS.has(provider.id) ? (
											<button
												type="button"
												onClick={() => void handleDeleteIntegration(provider.id)}
												disabled={savingIntegration === provider.id}
												className="inline-flex items-center gap-2 rounded-full border border-red-500/25 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
											>
												<Trash2 className="h-3.5 w-3.5" />
												Desactivar
											</button>
										) : null}
									</div>

									{msg ? (
										<div className={`rounded-xl border px-3 py-2 text-sm ${msg.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
											<div className="flex items-start gap-2">
												{msg.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />}
												<span>{msg.text}</span>
											</div>
										</div>
									) : null}

									{test ? (
										<div className={`rounded-xl border px-4 py-3 text-sm ${test.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-red-500/30 bg-red-500/10 text-red-200'}`}>
											<p className="text-[11px] font-bold uppercase tracking-[0.18em]">
												{test.ok ? 'Confirmación de uso real' : 'Falla real detectada'}
											</p>
											{test.error ? <p className="mt-2 leading-relaxed">{test.error}</p> : null}
											{test.checks && test.checks.length > 0 ? (
												<ul className="mt-3 space-y-2 text-[13px]">
													{test.checks.map((check) => (
														<li key={`${provider.id}-${check.name}`} className="flex gap-2">
															<span className={`mt-0.5 ${check.ok ? 'text-emerald-300' : 'text-red-300'}`}>{check.ok ? '✓' : '✕'}</span>
															<span>
																<span className="font-semibold">{check.name}</span>
																{check.detail ? <span className="text-zinc-300"> — {check.detail}</span> : null}
															</span>
														</li>
													))}
												</ul>
											) : null}
										</div>
									) : null}

									<DiagnosticTip provider={provider.id} />
								</div>
							</AdminActionGuard>
						</AdminCard>
					);
				})}
			</div>
		</AdminPage>
	);
}

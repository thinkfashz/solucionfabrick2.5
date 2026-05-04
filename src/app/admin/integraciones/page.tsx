'use client';

import { useEffect, useMemo, useState } from 'react';
import {
	Activity,
	CheckCircle2,
	Cloud,
	CreditCard,
	Globe,
	Loader2,
	MessageCircle,
	MessageSquareText,
	PlayCircle,
	RefreshCw,
	Server,
	ShieldAlert,
	Wallet,
	Store,
	Trash2,
	Workflow,
	type LucideIcon,
} from 'lucide-react';
import AdminActionGuard, { type AdminActionResult } from '@/components/admin/AdminActionGuard';
import { AdminCard, AdminPage, AdminPageHeader, ConnectionPulse } from '@/components/admin/ui';

const INTEGRATIONS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS public.integrations (
  provider text PRIMARY KEY,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);`;

type ProviderKey = 'meta' | 'google' | 'google_ads' | 'tiktok' | 'cloudinary' | 'vercel' | 'mercadolibre' | 'mercadopago' | 'stripe' | 'whatsapp';

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
}

interface ProviderStatus {
	credentials: Record<string, { set: boolean; preview: string }>;
	updated_at?: string;
	encrypted?: boolean;
}

interface TestResult {
	ok: boolean;
	error?: string;
	checks?: Array<{ name: string; ok: boolean; detail?: string }>;
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
		description: 'Activa publicaciones, pedidos, preguntas y monitoreo de precios con el mismo token usado por los módulos ML.',
		icon: Store,
		accent: 'from-yellow-400/20 to-amber-500/10',
		uses: ['Publicaciones ML', 'Pedidos ML', 'Preguntas ML', 'Monitor de precios'],
		fields: [
			{ key: 'access_token', label: 'Access token', type: 'password', placeholder: 'APP_USR-...' },
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
];

function Field({
	label,
	type = 'text',
	value,
	onChange,
	placeholder,
	hint,
	disabled,
}: {
	label: string;
	type?: 'text' | 'password';
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	hint?: string;
	disabled?: boolean;
}) {
	return (
		<label className="flex flex-col gap-2">
			<span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</span>
			<input
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				disabled={disabled}
				title={label}
				className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-300/50 disabled:opacity-50"
			/>
			{hint ? <span className="text-[11px] leading-relaxed text-zinc-600">{hint}</span> : null}
		</label>
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
	}, []);

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

			<div className="grid gap-5 xl:grid-cols-2">
				{PROVIDERS.map((provider) => {
					const Icon = provider.icon;
					const status = integrations[provider.id];
					const inputs = integrationInputs[provider.id] ?? {};
					const msg = integrationMsg[provider.id];
					const test = integrationTest[provider.id];
					const isConfigured = Object.values(status?.credentials ?? {}).some((credential) => credential.set);
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
											isConfigured
												? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
												: 'border-zinc-700 bg-black/40 text-zinc-500'
										}`}>
											{isConfigured ? 'Conectada' : 'Desactivada'}
										</div>
									</div>
								</div>

								<div className="space-y-4 p-5">
									<div className="grid gap-3 sm:grid-cols-2">
										{provider.fields.map((field) => {
											const existing = status?.credentials?.[field.key];
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
													hint={existing?.set ? 'Valor actual oculto. Déjalo vacío para mantenerlo.' : field.hint}
													disabled={loadingIntegrations || savingIntegration === provider.id}
												/>
											);
										})}
									</div>

									<div className="rounded-2xl border border-white/10 bg-black/25 p-4">
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
											initialStatus={isConfigured ? 'reconnecting' : 'unconfigured'}
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
								</div>
							</AdminActionGuard>
						</AdminCard>
					);
				})}
			</div>
		</AdminPage>
	);
}
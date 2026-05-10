import 'server-only';

/**
 * Maps every provider field exposed by `/admin/integraciones` to the
 * environment-variable names that, when set on the deployment (typically
 * Vercel → Project Settings → Environment Variables), are considered to
 * supply that credential.
 *
 * Order matters: the first env var with a non-empty value wins. The list is
 * kept in sync with the per-provider helpers (`getMetaCredentials`,
 * `getMercadoPagoCredentials`, `getVercelCredentials`, …) so the admin UI
 * can flag values as "already in Vercel" and avoid the conflict described
 * in the original ticket — server code already prefers env over DB, but
 * without this map the admin could not see *which* fields were already
 * supplied externally.
 *
 * Adding a provider only requires extending this map; the GET/POST handlers
 * and the integraciones page consume it generically.
 */
export const INTEGRATIONS_ENV_MAP: Record<string, Record<string, readonly string[]>> = {
	stripe: {
		secret_key: ['STRIPE_SECRET_KEY'],
		public_key: ['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_STRIPE_PUBLIC_KEY'],
		webhook_secret: ['STRIPE_WEBHOOK_SECRET'],
	},
	whatsapp: {
		access_token: ['WHATSAPP_ACCESS_TOKEN', 'META_WHATSAPP_TOKEN', 'WHATSAPP_TOKEN'],
		phone_number_id: ['WHATSAPP_PHONE_NUMBER_ID', 'WA_PHONE_NUMBER_ID'],
		business_account_id: ['WHATSAPP_BUSINESS_ACCOUNT_ID', 'WA_BUSINESS_ACCOUNT_ID'],
	},
	mercadopago: {
		access_token: ['MERCADO_PAGO_ACCESS_TOKEN', 'MP_ACCESS_TOKEN', 'MERCADOPAGO_ACCESS_TOKEN'],
		public_key: [
			'NEXT_PUBLIC_MP_PUBLIC_KEY',
			'NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY',
			'NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY',
			'MP_PUBLIC_KEY',
			'MERCADO_PAGO_PUBLIC_KEY',
			'MERCADOPAGO_PUBLIC_KEY',
		],
		// Strictly scoped to MercadoPago-prefixed names. We intentionally do
		// NOT fall back to the generic `PAYMENTS_WEBHOOK_SECRET`: that env
		// var is owned by the legacy generic `/api/payments/webhook` route
		// (which may verify Stripe / a custom processor / etc.), and reusing
		// it here would make the env-conflict 409 guard reject any admin
		// attempt to save a MercadoPago-specific webhook secret whenever a
		// generic payments secret is also configured.
		webhook_secret: [
			'MERCADO_PAGO_WEBHOOK_SECRET',
			'MERCADOPAGO_WEBHOOK_SECRET',
			'MP_WEBHOOK_SECRET',
		],
	},
	mercadolibre: {
		access_token: ['ML_ACCESS_TOKEN', 'MERCADOLIBRE_ACCESS_TOKEN'],
		refresh_token: ['ML_REFRESH_TOKEN', 'MERCADOLIBRE_REFRESH_TOKEN'],
		user_id: ['ML_USER_ID', 'MERCADOLIBRE_USER_ID'],
		expires_at: ['ML_EXPIRES_AT', 'MERCADOLIBRE_EXPIRES_AT'],
		scope: ['ML_SCOPE', 'MERCADOLIBRE_SCOPE'],
	},
	meta: {
		access_token: ['META_ACCESS_TOKEN', 'FACEBOOK_ACCESS_TOKEN'],
		ad_account_id: ['META_AD_ACCOUNT_ID', 'META_ACCOUNT_ID'],
		page_id: ['META_FACEBOOK_PAGE_ID', 'META_PAGE_ID', 'FACEBOOK_PAGE_ID'],
		instagram_business_id: ['META_INSTAGRAM_BUSINESS_ID', 'INSTAGRAM_BUSINESS_ID'],
	},
	google: {
		client_id: ['GOOGLE_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_ID'],
		client_secret: ['GOOGLE_CLIENT_SECRET', 'GOOGLE_OAUTH_CLIENT_SECRET'],
		refresh_token: ['GOOGLE_REFRESH_TOKEN', 'GOOGLE_OAUTH_REFRESH_TOKEN'],
	},
	google_ads: {
		// Strictly scoped to GOOGLE_ADS_* env names. We intentionally do NOT
		// fall back to the generic GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET /
		// GOOGLE_REFRESH_TOKEN: those belong to the separate `google`
		// provider and reusing them here would (a) make the env-conflict
		// 409 guard reject any attempt to save Google-Ads-specific OAuth
		// credentials from the admin whenever generic Google OAuth is also
		// configured, and (b) silently couple two unrelated integrations.
		developer_token: ['GOOGLE_ADS_DEVELOPER_TOKEN'],
		client_id: ['GOOGLE_ADS_CLIENT_ID'],
		client_secret: ['GOOGLE_ADS_CLIENT_SECRET'],
		refresh_token: ['GOOGLE_ADS_REFRESH_TOKEN'],
		customer_id: ['GOOGLE_ADS_CUSTOMER_ID'],
		login_customer_id: ['GOOGLE_ADS_LOGIN_CUSTOMER_ID'],
	},
	tiktok: {
		access_token: ['TIKTOK_ACCESS_TOKEN', 'TIKTOK_ADS_ACCESS_TOKEN'],
		advertiser_id: ['TIKTOK_ADVERTISER_ID', 'TIKTOK_ADS_ADVERTISER_ID'],
	},
	cloudinary: {
		cloud_name: ['CLOUDINARY_CLOUD_NAME', 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME'],
		api_key: ['CLOUDINARY_API_KEY'],
		api_secret: ['CLOUDINARY_API_SECRET'],
	},
	vercel: {
		api_token: ['VERCEL_API_TOKEN', 'VERCEL_TOKEN'],
		project_id: ['VERCEL_PROJECT_ID'],
		team_id: ['VERCEL_TEAM_ID'],
	},
	resend: {
		api_key: ['RESEND_API_KEY', 'RESEND_KEY'],
		from: ['RESEND_FROM', 'RESEND_FROM_EMAIL'],
	},
	openrouter: {
		api_key: ['OPENROUTER_API_KEY', 'OPENROUTER_KEY'],
		site_url: ['OPENROUTER_SITE_URL', 'NEXT_PUBLIC_SITE_URL'],
		app_name: ['OPENROUTER_APP_NAME'],
	},
	serper: {
		// Serper.dev — Google SERP API con tier free (≈2.500 búsquedas one-time).
		// Lo consume el módulo /admin/inteligencia-mercado para enriquecer
		// los snapshots con resultados de Google además de MercadoLibre.
		api_key: ['SERPER_API_KEY', 'SERPER_KEY'],
	},
	serpapi: {
		// SerpAPI — alternativa de pago con 100 búsquedas gratis al mes.
		// Reservado para futuro: el helper marketIntel ya soporta este
		// proveedor pero por defecto prioriza Serper para mantener el flujo
		// 100% gratis.
		api_key: ['SERPAPI_KEY', 'SERPAPI_API_KEY'],
	},
};

export interface DetectedEnvField {
	/** The raw value resolved from the env (kept in-memory only — never returned over the wire). */
	value: string;
	/** The actual env var name that resolved (first non-empty wins). */
	envName: string;
}

function pick(names: readonly string[]): DetectedEnvField | null {
	for (const name of names) {
		const raw = process.env[name];
		if (typeof raw !== 'string') continue;
		const trimmed = raw.trim();
		if (trimmed.length === 0) continue;
		return { value: trimmed, envName: name };
	}
	return null;
}

/**
 * Returns a per-field map of env-resolved credentials for a single provider.
 * Fields without a matching env var are omitted (caller falls back to DB).
 */
export function detectEnvProviderCredentials(provider: string): Record<string, DetectedEnvField> {
	const fieldMap = INTEGRATIONS_ENV_MAP[provider];
	if (!fieldMap) return {};
	const out: Record<string, DetectedEnvField> = {};
	for (const [field, names] of Object.entries(fieldMap)) {
		const resolved = pick(names);
		if (resolved) out[field] = resolved;
	}
	return out;
}

/**
 * Returns env-resolved credentials for every provider that has at least one
 * env var present. Used by `GET /api/admin/integrations` so the UI can flag
 * fields as "already in Vercel".
 */
export function detectAllEnvCredentials(): Record<string, Record<string, DetectedEnvField>> {
	const out: Record<string, Record<string, DetectedEnvField>> = {};
	for (const provider of Object.keys(INTEGRATIONS_ENV_MAP)) {
		const detected = detectEnvProviderCredentials(provider);
		if (Object.keys(detected).length > 0) out[provider] = detected;
	}
	return out;
}

/**
 * Build the masked preview the admin UI shows for an env-sourced field.
 * Mirrors the format used by `maskCredentials` (`••• <last4>`) so the UI
 * stays consistent — but the caller adds a strikethrough style to convey
 * "ya configurada, no la pongas de nuevo".
 */
export function envFieldPreview(value: string): string {
	if (value.length === 0) return '';
	return value.length <= 4 ? '•••' : `••• ${value.slice(-4)}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 2B compatibility shims.
//
// The runtime credential helpers in `*Credentials.ts` consume the env map
// through these three thin wrappers so a new helper only needs to know one
// API. They sit on top of the existing `pick` / `INTEGRATIONS_ENV_MAP` —
// there is no second source of truth.
// ─────────────────────────────────────────────────────────────────────────

/** Provider keys declared in {@link INTEGRATIONS_ENV_MAP}. */
export type IntegrationProvider = keyof typeof INTEGRATIONS_ENV_MAP;

/**
 * Returns a string value from the first env-var alias that holds a non-empty
 * trimmed value, or `undefined`. Whitespace-only values are treated as unset.
 *
 * Returns `{ value, envVar }` rather than the raw string so callers can
 * surface the resolving alias in errors / audit logs without re-walking the
 * map themselves.
 */
export function readEnvFromMap(
	provider: string,
	field: string,
): { value: string; envVar: string } | undefined {
	const aliases = INTEGRATIONS_ENV_MAP[provider]?.[field];
	if (!aliases || aliases.length === 0) return undefined;
	const hit = pick(aliases);
	if (!hit) return undefined;
	return { value: hit.value, envVar: hit.envName };
}

/**
 * Returns the subset of provider fields whose env var is currently set,
 * with the alias name that resolved. Used by `POST /api/admin/integrations`
 * to refuse env-managed fields with a `409 ENV_VAR_PRESENT`.
 *
 * Values are intentionally NOT included — the API never echoes secrets back
 * to the client; only the alias name is exposed so the UI can render
 * "Gestionado por env (`META_ACCESS_TOKEN`)".
 */
export function envForProvider(
	provider: string,
): Record<string, { envVar: string }> {
	const fields = INTEGRATIONS_ENV_MAP[provider];
	if (!fields) return {};
	const out: Record<string, { envVar: string }> = {};
	for (const field of Object.keys(fields)) {
		const hit = readEnvFromMap(provider, field);
		if (hit) out[field] = { envVar: hit.envVar };
	}
	return out;
}

/**
 * Returns the list of providers known to the env map (regardless of whether
 * any alias is currently set). Useful for UI rendering where a deterministic
 * order matters.
 */
export function listIntegrationProviders(): readonly string[] {
	return Object.keys(INTEGRATIONS_ENV_MAP);
}

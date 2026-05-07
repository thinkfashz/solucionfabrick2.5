import 'server-only';
import { createClient } from '@insforge/sdk';
import { decryptCredentials, encryptCredentials } from './integrationsCrypto';
import { INTEGRATIONS_ENV_MAP } from './integrationsEnvMap';
import { getMlClientId, getMlClientSecret, refreshAccessToken } from './mlOAuth';

export interface MercadoLibreCredentials {
	accessToken?: string;
	sources: Record<'accessToken', 'env' | 'db' | undefined>;
}

function normalize(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Pull the first non-empty value from the list of env-var names advertised
 * by `INTEGRATIONS_ENV_MAP` for a given provider field. Keeping this in sync
 * with the env map is critical: if the map says a name is env-managed (and
 * therefore the admin POST refuses to write that field to the DB), the
 * runtime helper MUST also be able to read that same name — otherwise the
 * field is "locked" in the UI but invisible at runtime, producing the
 * "MercadoLibre no configurado" dead-end we saw in production.
 */
function readEnvFromMap(provider: string, field: string): string | undefined {
	const candidates = INTEGRATIONS_ENV_MAP[provider]?.[field] ?? [];
	for (const name of candidates) {
		const value = normalize(process.env[name]);
		if (value) return value;
	}
	return undefined;
}

/**
 * Refresh-token grace window: if the access_token expires within this many
 * seconds we proactively refresh, so we don't ship a token that will die
 * mid-request. 60 s is conservative — refresh round-trip is < 1 s in practice.
 */
const REFRESH_GRACE_SECONDS = 60;

interface MlIntegrationRow {
	access_token?: string;
	refresh_token?: string;
	expires_at?: string;
	user_id?: string;
	scope?: string;
	token_type?: string;
}

/**
 * Returns true when the access_token has expired OR will expire within the
 * REFRESH_GRACE_SECONDS window. Named to be explicit about the grace
 * behaviour so callers don't assume "expired" means strictly past-tense.
 */
function shouldRefresh(expiresAt: string | undefined): boolean {
	if (!expiresAt) return false;
	const ts = Date.parse(expiresAt);
	if (Number.isNaN(ts)) return false;
	return ts - REFRESH_GRACE_SECONDS * 1000 <= Date.now();
}

export async function getMercadoLibreCredentials(): Promise<MercadoLibreCredentials> {
	// Read env using the same priority list advertised by INTEGRATIONS_ENV_MAP
	// (currently `ML_ACCESS_TOKEN` first, then `MERCADOLIBRE_ACCESS_TOKEN`).
	// Previously this only checked the longer alias, so an operator who set
	// `ML_ACCESS_TOKEN` — the natural choice given `ML_CLIENT_ID` /
	// `ML_CLIENT_SECRET` / `ML_REDIRECT_URI` use the same prefix — would see
	// the field locked as env-managed in the admin UI but get "MercadoLibre
	// no configurado" at runtime because this helper couldn't see the value.
	const envToken = readEnvFromMap('mercadolibre', 'access_token');
	const creds: MercadoLibreCredentials = {
		accessToken: envToken,
		sources: {
			accessToken: envToken ? 'env' : undefined,
		},
	};

	if (creds.accessToken) return creds;

	const baseUrl = normalize(process.env.NEXT_PUBLIC_INSFORGE_URL);
	const anonKey = normalize(process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY);
	if (!baseUrl || !anonKey) return creds;

	try {
		const client = createClient({ baseUrl, anonKey });
		const { data, error } = await client.database
			.from('integrations')
			.select('credentials')
			.eq('provider', 'mercadolibre')
			.limit(1);
		if (error || !Array.isArray(data) || data.length === 0) return creds;

		const row = data[0] as { credentials?: Record<string, unknown> };
		const decrypted = decryptCredentials(row.credentials ?? {});
		const dbCreds: MlIntegrationRow = {
			access_token: typeof decrypted.access_token === 'string' ? decrypted.access_token : undefined,
			refresh_token: typeof decrypted.refresh_token === 'string' ? decrypted.refresh_token : undefined,
			expires_at: typeof decrypted.expires_at === 'string' ? decrypted.expires_at : undefined,
			user_id: typeof decrypted.user_id === 'string' ? decrypted.user_id : undefined,
			scope: typeof decrypted.scope === 'string' ? decrypted.scope : undefined,
			token_type: typeof decrypted.token_type === 'string' ? decrypted.token_type : undefined,
		};
		let dbToken = normalize(dbCreds.access_token);
		const refreshToken = normalize(dbCreds.refresh_token);
		const clientId = getMlClientId();
		const clientSecret = getMlClientSecret();

		// Auto-refresh: if the stored token is past its `expires_at` (or about
		// to expire) AND we have a refresh_token + client credentials, swap
		// it for a fresh pair before returning. Mercado Libre invalidates the
		// old refresh_token on each successful refresh, so we MUST persist
		// the new pair atomically.
		if (
			refreshToken &&
			clientId &&
			clientSecret &&
			shouldRefresh(dbCreds.expires_at)
		) {
			try {
				const refreshed = await refreshAccessToken({
					refreshToken,
					clientId,
					clientSecret,
				});
				const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
				const updated = encryptCredentials({
					access_token: refreshed.access_token,
					refresh_token: refreshed.refresh_token,
					token_type: refreshed.token_type,
					scope: refreshed.scope ?? dbCreds.scope ?? '',
					user_id: String(refreshed.user_id),
					expires_at: newExpiresAt,
					connected_at: new Date().toISOString(),
				});
				await client.database
					.from('integrations')
					.upsert([{ provider: 'mercadolibre', credentials: updated }], { onConflict: 'provider' });
				dbToken = refreshed.access_token;
			} catch (err) {
				// Log so operators can diagnose why auto-refresh is failing
				// (network issues, revoked grant, invalid_grant because the
				// refresh_token was already consumed elsewhere, etc.). The
				// caller's API call will then surface the resulting 401 and
				// the operator can re-run the OAuth flow.
				console.error('[ml-oauth] auto-refresh failed', err);
			}
		}

		if (!creds.accessToken && dbToken) {
			creds.accessToken = dbToken;
			creds.sources.accessToken = 'db';
		}
	} catch {
		/* swallow db fallback errors */
	}

	return creds;
}
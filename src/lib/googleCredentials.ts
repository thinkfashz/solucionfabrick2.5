import 'server-only';
import { createClient } from '@insforge/sdk';
import { decryptCredentials, encryptCredentials } from './integrationsCrypto';
import { getGoogleClientId, getGoogleClientSecret, refreshAccessToken } from './googleOAuth';

export interface GoogleCredentials {
	accessToken?: string;
	scope?: string;
	expiresAt?: string;
	sources: Record<'accessToken', 'env' | 'db' | undefined>;
}

function normalize(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length === 0 ? undefined : trimmed;
}

/** 60s grace before expiration triggers a proactive refresh. */
const REFRESH_GRACE_SECONDS = 60;

interface GoogleIntegrationRow {
	access_token?: string;
	refresh_token?: string;
	expires_at?: string;
	scope?: string;
	token_type?: string;
}

function shouldRefresh(expiresAt: string | undefined): boolean {
	if (!expiresAt) return false;
	const ts = Date.parse(expiresAt);
	if (Number.isNaN(ts)) return false;
	return ts - REFRESH_GRACE_SECONDS * 1000 <= Date.now();
}

/**
 * Resolves Google OAuth credentials. Prefers env (`GOOGLE_ACCESS_TOKEN` is
 * intentionally NOT supported because Google access_tokens expire after 1h
 * and pinning one in env would be useless; refresh-token-based env support
 * is provided indirectly via the `google` provider in `integrationsEnvMap`).
 *
 * Reads `integrations(provider='google')`, decrypts and auto-refreshes the
 * access_token if it is within the grace window. Unlike MercadoLibre,
 * Google refresh_tokens are NOT rotated on each refresh — we only persist
 * the new access_token + expires_at.
 */
export async function getGoogleCredentials(): Promise<GoogleCredentials> {
	const creds: GoogleCredentials = {
		sources: { accessToken: undefined },
	};

	const baseUrl = normalize(process.env.NEXT_PUBLIC_INSFORGE_URL);
	const anonKey = normalize(process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY);
	if (!baseUrl || !anonKey) return creds;

	try {
		const client = createClient({ baseUrl, anonKey });
		const { data, error } = await client.database
			.from('integrations')
			.select('credentials')
			.eq('provider', 'google')
			.limit(1);
		if (error || !Array.isArray(data) || data.length === 0) return creds;

		const row = data[0] as { credentials?: Record<string, unknown> };
		const decrypted = decryptCredentials(row.credentials ?? {});
		const dbCreds: GoogleIntegrationRow = {
			access_token: typeof decrypted.access_token === 'string' ? decrypted.access_token : undefined,
			refresh_token: typeof decrypted.refresh_token === 'string' ? decrypted.refresh_token : undefined,
			expires_at: typeof decrypted.expires_at === 'string' ? decrypted.expires_at : undefined,
			scope: typeof decrypted.scope === 'string' ? decrypted.scope : undefined,
			token_type: typeof decrypted.token_type === 'string' ? decrypted.token_type : undefined,
		};
		let dbToken = normalize(dbCreds.access_token);
		const refreshToken = normalize(dbCreds.refresh_token);
		const clientId = getGoogleClientId();
		const clientSecret = getGoogleClientSecret();

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
					...decrypted,
					access_token: refreshed.access_token,
					// refresh_token is NOT rotated by Google; keep the existing one.
					refresh_token: refreshToken,
					token_type: refreshed.token_type,
					scope: refreshed.scope ?? dbCreds.scope ?? '',
					expires_at: newExpiresAt,
					connected_at: new Date().toISOString(),
				});
				await client.database
					.from('integrations')
					.upsert([{ provider: 'google', credentials: updated }], { onConflict: 'provider' });
				dbToken = refreshed.access_token;
				creds.expiresAt = newExpiresAt;
				creds.scope = refreshed.scope ?? dbCreds.scope;
			} catch (err) {
				console.error('[google-oauth] auto-refresh failed', err);
			}
		} else {
			creds.expiresAt = dbCreds.expires_at;
			creds.scope = dbCreds.scope;
		}

		if (dbToken) {
			creds.accessToken = dbToken;
			creds.sources.accessToken = 'db';
		}
	} catch {
		/* swallow db fallback errors */
	}

	return creds;
}

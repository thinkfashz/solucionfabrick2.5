import 'server-only';
import { headers } from 'next/headers';
import { insforgeAdmin } from './insforge';
import { encryptCredentials } from './integrationsCrypto';
import { INTEGRATIONS_ENV_MAP } from './integrationsEnvMap';
import { getMlClientId, getMlClientSecret, refreshAccessToken } from './mlOAuth';
import { DEFAULT_TENANT_ID, getTenantIdFromHeaders } from './tenant-edge';
import { readTenantIntegration } from './tenantIntegrations';

export interface MercadoLibreCredentials {
	accessToken?: string;
	sources: Record<'accessToken', 'env' | 'db' | undefined>;
}

function normalize(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length === 0 ? undefined : trimmed;
}

function readEnvFromMap(provider: string, field: string): string | undefined {
	const candidates = INTEGRATIONS_ENV_MAP[provider]?.[field] ?? [];
	for (const name of candidates) {
		const value = normalize(process.env[name]);
		if (value) return value;
	}
	return undefined;
}

const REFRESH_GRACE_SECONDS = 60;

interface MlIntegrationRow {
	access_token?: string;
	refresh_token?: string;
	expires_at?: string;
	user_id?: string;
	scope?: string;
	token_type?: string;
}

function shouldRefresh(expiresAt: string | undefined): boolean {
	if (!expiresAt) return false;
	const ts = Date.parse(expiresAt);
	if (Number.isNaN(ts)) return false;
	return ts - REFRESH_GRACE_SECONDS * 1000 <= Date.now();
}

async function resolveTenantId(explicitTenantId?: string): Promise<string> {
	const explicit = normalize(explicitTenantId);
	if (explicit) return explicit;
	try {
		return getTenantIdFromHeaders(await headers());
	} catch {
		return DEFAULT_TENANT_ID;
	}
}

/**
 * Resolve Mercado Libre seller credentials for the current tenant.
 *
 * Environment-managed access tokens are intentionally available only to the
 * original Fabrick tenant because process.env is global to the deployment.
 * Every SaaS tenant reads its own encrypted `integrations` row.
 */
export async function getMercadoLibreCredentials(explicitTenantId?: string): Promise<MercadoLibreCredentials> {
	const tenantId = await resolveTenantId(explicitTenantId);
	const envToken = tenantId === DEFAULT_TENANT_ID
		? readEnvFromMap('mercadolibre', 'access_token')
		: undefined;

	const creds: MercadoLibreCredentials = {
		accessToken: envToken,
		sources: {
			accessToken: envToken ? 'env' : undefined,
		},
	};

	if (creds.accessToken) return creds;

	try {
		const integration = await readTenantIntegration(tenantId, 'mercadolibre');
		if (integration.source !== 'tenant') return creds;

		const values = integration.values;
		const dbCreds: MlIntegrationRow = {
			access_token: normalize(values.access_token),
			refresh_token: normalize(values.refresh_token),
			expires_at: normalize(values.expires_at),
			user_id: normalize(values.user_id),
			scope: normalize(values.scope),
			token_type: normalize(values.token_type),
		};

		let dbToken = dbCreds.access_token;
		const refreshToken = dbCreds.refresh_token;
		const clientId = getMlClientId();
		const clientSecret = getMlClientSecret();

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
					...values,
					access_token: refreshed.access_token,
					refresh_token: refreshed.refresh_token,
					token_type: refreshed.token_type,
					scope: refreshed.scope ?? dbCreds.scope ?? '',
					user_id: String(refreshed.user_id),
					expires_at: newExpiresAt,
					connected_at: values.connected_at ?? new Date().toISOString(),
					refreshed_at: new Date().toISOString(),
				});

				const { error } = await insforgeAdmin.database
					.from('integrations')
					.upsert(
						[{
							provider: 'mercadolibre',
							tenant_id: tenantId,
							credentials: updated,
							updated_at: new Date().toISOString(),
						}],
						{ onConflict: 'provider,tenant_id' },
					);
				if (error) throw new Error(error.message || 'No se pudo persistir el token renovado.');
				dbToken = refreshed.access_token;
			} catch (err) {
				console.error('[ml-oauth] tenant token auto-refresh failed', { tenantId, err });
			}
		}

		if (dbToken) {
			creds.accessToken = dbToken;
			creds.sources.accessToken = 'db';
		}
	} catch (err) {
		console.error('[ml-oauth] tenant credentials lookup failed', { tenantId, err });
	}

	return creds;
}

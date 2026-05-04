import 'server-only';
import { createClient } from '@insforge/sdk';
import { decryptCredentials } from './integrationsCrypto';

export interface MercadoLibreCredentials {
	accessToken?: string;
	sources: Record<'accessToken', 'env' | 'db' | undefined>;
}

function normalize(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length === 0 ? undefined : trimmed;
}

export async function getMercadoLibreCredentials(): Promise<MercadoLibreCredentials> {
	const envToken = normalize(process.env.MERCADOLIBRE_ACCESS_TOKEN);
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
		const dbCreds = decryptCredentials(row.credentials ?? {});
		const dbToken = normalize(dbCreds.access_token);
		if (!creds.accessToken && dbToken) {
			creds.accessToken = dbToken;
			creds.sources.accessToken = 'db';
		}
	} catch {
		/* swallow db fallback errors */
	}

	return creds;
}
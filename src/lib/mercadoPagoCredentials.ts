import 'server-only';
import { createClient } from '@insforge/sdk';
import { decryptCredentials } from './integrationsCrypto';

export interface MercadoPagoCredentials {
	accessToken?: string;
	publicKey?: string;
	webhookSecret?: string;
	sources: Record<'accessToken' | 'publicKey' | 'webhookSecret', 'env' | 'db' | undefined>;
}

function normalize(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length === 0 ? undefined : trimmed;
}

export async function getMercadoPagoCredentials(): Promise<MercadoPagoCredentials> {
	const envAccessToken =
		normalize(process.env.MERCADO_PAGO_ACCESS_TOKEN) ??
		normalize(process.env.MP_ACCESS_TOKEN) ??
		normalize(process.env.MERCADOPAGO_ACCESS_TOKEN);
	const envPublicKey =
		normalize(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY) ??
		normalize(process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY) ??
		normalize(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY) ??
		normalize(process.env.MP_PUBLIC_KEY) ??
		normalize(process.env.MERCADO_PAGO_PUBLIC_KEY) ??
		normalize(process.env.MERCADOPAGO_PUBLIC_KEY);
	const envWebhookSecret =
		normalize(process.env.MERCADO_PAGO_WEBHOOK_SECRET) ??
		normalize(process.env.MP_WEBHOOK_SECRET) ??
		normalize(process.env.PAYMENTS_WEBHOOK_SECRET);

	const creds: MercadoPagoCredentials = {
		accessToken: envAccessToken,
		publicKey: envPublicKey,
		webhookSecret: envWebhookSecret,
		sources: {
			accessToken: envAccessToken ? 'env' : undefined,
			publicKey: envPublicKey ? 'env' : undefined,
			webhookSecret: envWebhookSecret ? 'env' : undefined,
		},
	};

	if (creds.accessToken && creds.publicKey && creds.webhookSecret) return creds;

	const baseUrl = normalize(process.env.NEXT_PUBLIC_INSFORGE_URL);
	const anonKey = normalize(process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY);
	if (!baseUrl || !anonKey) return creds;

	try {
		const client = createClient({ baseUrl, anonKey });
		const { data, error } = await client.database
			.from('integrations')
			.select('credentials')
			.eq('provider', 'mercadopago')
			.limit(1);
		if (error || !Array.isArray(data) || data.length === 0) return creds;

		const row = data[0] as { credentials?: Record<string, unknown> };
		const dbCreds = decryptCredentials(row.credentials ?? {});
		const dbAccessToken = normalize(dbCreds.access_token);
		const dbPublicKey = normalize(dbCreds.public_key);
		const dbWebhookSecret = normalize(dbCreds.webhook_secret);

		if (!creds.accessToken && dbAccessToken) {
			creds.accessToken = dbAccessToken;
			creds.sources.accessToken = 'db';
		}
		if (!creds.publicKey && dbPublicKey) {
			creds.publicKey = dbPublicKey;
			creds.sources.publicKey = 'db';
		}
		if (!creds.webhookSecret && dbWebhookSecret) {
			creds.webhookSecret = dbWebhookSecret;
			creds.sources.webhookSecret = 'db';
		}
	} catch {
		/* swallow db fallback errors */
	}

	return creds;
}
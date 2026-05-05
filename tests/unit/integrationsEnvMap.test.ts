import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	INTEGRATIONS_ENV_MAP,
	detectAllEnvCredentials,
	detectEnvProviderCredentials,
	envFieldPreview,
} from '@/lib/integrationsEnvMap';

const TOUCHED_ENVS: string[] = [];

function setEnv(name: string, value: string) {
	TOUCHED_ENVS.push(name);
	process.env[name] = value;
}

function clearEnvs() {
	while (TOUCHED_ENVS.length > 0) {
		const name = TOUCHED_ENVS.pop();
		if (name) delete process.env[name];
	}
}

describe('integrationsEnvMap', () => {
	beforeEach(() => {
		clearEnvs();
	});
	afterEach(() => {
		clearEnvs();
	});

	it('returns an empty object for unknown providers', () => {
		expect(detectEnvProviderCredentials('does-not-exist')).toEqual({});
	});

	it('detects env vars per field with the first non-empty winning', () => {
		setEnv('VERCEL_API_TOKEN', 'vercel_token_value');
		setEnv('VERCEL_PROJECT_ID', 'prj_1234567890');
		const detected = detectEnvProviderCredentials('vercel');
		expect(detected.api_token?.envName).toBe('VERCEL_API_TOKEN');
		expect(detected.api_token?.value).toBe('vercel_token_value');
		expect(detected.project_id?.envName).toBe('VERCEL_PROJECT_ID');
		expect(detected.team_id).toBeUndefined();
	});

	it('falls back to subsequent env names when the first is blank', () => {
		setEnv('TIKTOK_ACCESS_TOKEN', '   '); // blank
		setEnv('TIKTOK_ADS_ACCESS_TOKEN', 'real-token');
		const detected = detectEnvProviderCredentials('tiktok');
		expect(detected.access_token?.envName).toBe('TIKTOK_ADS_ACCESS_TOKEN');
		expect(detected.access_token?.value).toBe('real-token');
	});

	it('skips providers with no env vars in detectAllEnvCredentials', () => {
		setEnv('STRIPE_SECRET_KEY', 'sk_test_xyz');
		const all = detectAllEnvCredentials();
		expect(all.stripe?.secret_key?.value).toBe('sk_test_xyz');
		expect(all.cloudinary).toBeUndefined();
	});

	it('preserves the masked preview format used by maskCredentials', () => {
		expect(envFieldPreview('')).toBe('');
		expect(envFieldPreview('abc')).toBe('•••');
		expect(envFieldPreview('abcdef1234')).toBe('••• 1234');
	});

	it('does not let generic Google OAuth env vars leak into google_ads', () => {
		// Reviewer scenario: an installation has generic Google OAuth env vars
		// configured for the `google` provider. Those must NOT be detected
		// as env-sourced for `google_ads`, otherwise the POST conflict guard
		// would reject any admin attempt to save Google-Ads-specific OAuth.
		setEnv('GOOGLE_CLIENT_ID', 'generic-client');
		setEnv('GOOGLE_CLIENT_SECRET', 'generic-secret');
		setEnv('GOOGLE_REFRESH_TOKEN', 'generic-refresh');
		const ads = detectEnvProviderCredentials('google_ads');
		expect(ads.client_id).toBeUndefined();
		expect(ads.client_secret).toBeUndefined();
		expect(ads.refresh_token).toBeUndefined();
		const google = detectEnvProviderCredentials('google');
		expect(google.client_id?.value).toBe('generic-client');
	});

	it('does not let generic PAYMENTS_WEBHOOK_SECRET leak into mercadopago', () => {
		// Reviewer scenario: PAYMENTS_WEBHOOK_SECRET is a generic name owned
		// by the legacy /api/payments/webhook route (could verify Stripe or
		// any other processor). It must NOT be detected as MercadoPago's
		// webhook secret, otherwise the POST conflict guard would reject
		// any admin attempt to save the real MP webhook secret.
		setEnv('PAYMENTS_WEBHOOK_SECRET', 'generic-secret');
		const mp = detectEnvProviderCredentials('mercadopago');
		expect(mp.webhook_secret).toBeUndefined();
	});

	it('covers every provider declared by the admin UI', () => {
		// Sanity check so that adding a provider to the form forces an entry here.
		const providers = ['stripe', 'whatsapp', 'mercadopago', 'mercadolibre', 'meta', 'google', 'google_ads', 'tiktok', 'cloudinary', 'vercel'];
		for (const p of providers) {
			expect(INTEGRATIONS_ENV_MAP[p], `provider ${p} missing from env map`).toBeDefined();
		}
	});
});

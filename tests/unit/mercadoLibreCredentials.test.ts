import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// `mercadoLibreCredentials` is `import 'server-only'`. Vitest's default Node
// pool is fine, but we still neutralise the guard the same way the rest of
// the suite does (see tests/unit/mlOAuth.test.ts) — by mocking the module.
vi.mock('server-only', () => ({}));

import { getMercadoLibreCredentials } from '@/lib/mercadoLibreCredentials';

describe('getMercadoLibreCredentials', () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		// Strip every env var the helper might consult so each case starts clean.
		delete process.env.ML_ACCESS_TOKEN;
		delete process.env.MERCADOLIBRE_ACCESS_TOKEN;
		delete process.env.NEXT_PUBLIC_INSFORGE_URL;
		delete process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
	});

	afterEach(() => {
		process.env = { ...originalEnv };
		vi.restoreAllMocks();
	});

	it('reads ML_ACCESS_TOKEN from env (regression for "MercadoLibre no configurado")', async () => {
		process.env.ML_ACCESS_TOKEN = 'APP_USR-from-ml-prefix';
		const result = await getMercadoLibreCredentials();
		expect(result.accessToken).toBe('APP_USR-from-ml-prefix');
		expect(result.sources.accessToken).toBe('env');
	});

	it('reads MERCADOLIBRE_ACCESS_TOKEN from env when ML_ACCESS_TOKEN is unset', async () => {
		process.env.MERCADOLIBRE_ACCESS_TOKEN = 'APP_USR-from-long-prefix';
		const result = await getMercadoLibreCredentials();
		expect(result.accessToken).toBe('APP_USR-from-long-prefix');
		expect(result.sources.accessToken).toBe('env');
	});

	it('prefers ML_ACCESS_TOKEN over MERCADOLIBRE_ACCESS_TOKEN', async () => {
		process.env.ML_ACCESS_TOKEN = 'APP_USR-short';
		process.env.MERCADOLIBRE_ACCESS_TOKEN = 'APP_USR-long';
		const result = await getMercadoLibreCredentials();
		expect(result.accessToken).toBe('APP_USR-short');
	});

	it('treats whitespace-only env values as unset', async () => {
		process.env.ML_ACCESS_TOKEN = '   ';
		process.env.MERCADOLIBRE_ACCESS_TOKEN = 'APP_USR-fallback';
		const result = await getMercadoLibreCredentials();
		expect(result.accessToken).toBe('APP_USR-fallback');
	});

	it('returns no token when neither env var is set and InsForge config is missing', async () => {
		// No NEXT_PUBLIC_INSFORGE_URL / ANON_KEY → helper short-circuits before
		// touching the DB, so we exercise the "nothing configured anywhere" path.
		const result = await getMercadoLibreCredentials();
		expect(result.accessToken).toBeUndefined();
		expect(result.sources.accessToken).toBeUndefined();
	});
});

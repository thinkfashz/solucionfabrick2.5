import { describe, expect, it } from 'vitest';
import {
	runOpenRouterChecks,
	runResendChecks,
	runSerpApiChecks,
	runSerperChecks,
	runWhatsAppChecks,
} from '@/lib/integrationsTestRunners';

type FakeFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function jsonResponse(body: unknown, init: ResponseInit & { headers?: Record<string, string> } = {}): Response {
	const headers = new Headers(init.headers ?? {});
	if (!headers.has('content-type')) headers.set('content-type', 'application/json');
	return new Response(JSON.stringify(body), { status: init.status ?? 200, headers });
}

function makeFetchSequence(responses: Array<Response | Error>): { fetch: FakeFetch; calls: Array<{ url: string; init?: RequestInit }> } {
	const calls: Array<{ url: string; init?: RequestInit }> = [];
	let i = 0;
	const fetchImpl: FakeFetch = async (input, init) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
		calls.push({ url, init });
		const next = responses[i++];
		if (!next) throw new Error(`Unexpected fetch #${i} to ${url}`);
		if (next instanceof Error) throw next;
		return next;
	};
	return { fetch: fetchImpl, calls };
}

// ---------------------------------------------------------------------------
// WhatsApp — Mejora 2
// ---------------------------------------------------------------------------

describe('runWhatsAppChecks', () => {
	it('happy path: phone OK + WABA template returns ok=true with quality + verification rows', async () => {
		const { fetch } = makeFetchSequence([
			jsonResponse({
				display_phone_number: '+56 9 1234 5678',
				verified_name: 'Soluciones Fabrick',
				quality_rating: 'GREEN',
				code_verification_status: 'VERIFIED',
			}),
			jsonResponse({ data: [{ name: 'order_confirmed', status: 'APPROVED' }] }),
		]);

		const result = await runWhatsAppChecks(
			{ access_token: 't', phone_number_id: 'p', business_account_id: 'w' },
			fetch,
		);

		expect(result.ok).toBe(true);
		expect(result.provider).toBe('whatsapp');
		const names = result.checks.map((c) => c.name);
		expect(names).toContain('WhatsApp phone number');
		expect(names).toContain('Quality rating');
		expect(names).toContain('Verificación de número');
		expect(names).toContain('Plantillas (WABA)');
		expect(result.checks.find((c) => c.name === 'Plantillas (WABA)')?.detail).toMatch(/order_confirmed/);
	});

	it('flags YELLOW quality rating as not-ok but keeps the line operational', async () => {
		const { fetch } = makeFetchSequence([
			jsonResponse({ display_phone_number: '+1', quality_rating: 'YELLOW', code_verification_status: 'VERIFIED' }),
			jsonResponse({ data: [] }),
		]);
		const result = await runWhatsAppChecks(
			{ access_token: 't', phone_number_id: 'p', business_account_id: 'w' },
			fetch,
		);
		const quality = result.checks.find((c) => c.name === 'Quality rating');
		expect(quality?.ok).toBe(false);
		expect(quality?.detail).toMatch(/YELLOW/);
		expect(result.ok).toBe(false); // any non-green flips overall
	});

	it('401 from phone-number endpoint produces the whatsapp_business_messaging hint', async () => {
		const { fetch } = makeFetchSequence([
			jsonResponse(
				{ error: { message: 'Application does not have permission for this action', code: 10 } },
				{ status: 401 },
			),
		]);
		const result = await runWhatsAppChecks(
			{ access_token: 't', phone_number_id: 'p', business_account_id: 'w' },
			fetch,
		);
		expect(result.ok).toBe(false);
		expect(result.checks[0].detail).toMatch(/whatsapp_business_messaging/);
		expect(result.error).toMatch(/permission/i);
	});

	it('warns when business_account_id is missing (cannot confirm permission)', async () => {
		const { fetch } = makeFetchSequence([
			jsonResponse({ display_phone_number: '+1', quality_rating: 'GREEN', code_verification_status: 'VERIFIED' }),
		]);
		const result = await runWhatsAppChecks({ access_token: 't', phone_number_id: 'p' }, fetch);
		const wabaCheck = result.checks.find((c) => c.name === 'business_account_id');
		expect(wabaCheck?.ok).toBe(false);
		expect(wabaCheck?.detail).toMatch(/whatsapp_business_messaging/);
	});

	it('network error returns ok=false with provider="whatsapp"', async () => {
		const { fetch } = makeFetchSequence([new Error('ECONNRESET')]);
		const result = await runWhatsAppChecks({ access_token: 't', phone_number_id: 'p' }, fetch);
		expect(result.ok).toBe(false);
		expect(result.provider).toBe('whatsapp');
		expect(result.error).toMatch(/ECONNRESET/);
	});
});

// ---------------------------------------------------------------------------
// Resend
// ---------------------------------------------------------------------------

describe('runResendChecks', () => {
	it('happy path: verified domain matches the from address → ok=true', async () => {
		const { fetch } = makeFetchSequence([
			jsonResponse({ data: [{ name: 'fabrick.cl', status: 'verified', region: 'us-east-1' }] }),
		]);
		const result = await runResendChecks(
			{ apiKey: 're_test', from: 'Hola <hola@fabrick.cl>', source: 'env' },
			fetch,
		);
		expect(result.ok).toBe(true);
		expect(result.checks.find((c) => c.name === 'Dominio del from')?.ok).toBe(true);
	});

	it('flags ok=false when the from-domain is not in the Resend account', async () => {
		const { fetch } = makeFetchSequence([
			jsonResponse({ data: [{ name: 'otro.com', status: 'verified' }] }),
		]);
		const result = await runResendChecks(
			{ apiKey: 're_test', from: 'hola@fabrick.cl', source: 'db' },
			fetch,
		);
		const domainCheck = result.checks.find((c) => c.name === 'Dominio del from');
		expect(domainCheck?.ok).toBe(false);
		expect(domainCheck?.detail).toMatch(/fabrick\.cl/);
		expect(result.ok).toBe(false);
	});

	it('flags ok=false when domain exists but is not yet verified', async () => {
		const { fetch } = makeFetchSequence([
			jsonResponse({ data: [{ name: 'fabrick.cl', status: 'pending' }] }),
		]);
		const result = await runResendChecks(
			{ apiKey: 're_test', from: 'hola@fabrick.cl', source: 'db' },
			fetch,
		);
		const domainCheck = result.checks.find((c) => c.name === 'Dominio del from');
		expect(domainCheck?.ok).toBe(false);
		expect(domainCheck?.detail).toMatch(/pending/);
	});

	it('rejects API keys that do not start with "re_"', async () => {
		// The /domains call still happens, but the key-format row already failed.
		const { fetch } = makeFetchSequence([jsonResponse({ data: [] })]);
		const result = await runResendChecks(
			{ apiKey: 'sk_wrong', from: 'hola@fabrick.cl', source: 'env' },
			fetch,
		);
		expect(result.checks.find((c) => c.name === 'api_key')?.ok).toBe(false);
		expect(result.ok).toBe(false);
	});

	it('401 from /domains surfaces the upstream message in error', async () => {
		const { fetch } = makeFetchSequence([
			jsonResponse({ message: 'Invalid API key' }, { status: 401 }),
		]);
		const result = await runResendChecks({ apiKey: 're_x', from: 'a@b.com', source: 'env' }, fetch);
		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/Invalid API key/);
	});

	it('network error returns ok=false', async () => {
		const { fetch } = makeFetchSequence([new Error('ETIMEDOUT')]);
		const result = await runResendChecks({ apiKey: 're_x', from: 'a@b.com', source: 'env' }, fetch);
		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/ETIMEDOUT/);
	});
});

// ---------------------------------------------------------------------------
// Serper
// ---------------------------------------------------------------------------

describe('runSerperChecks', () => {
	it('happy path: 200 with organic results and rate-limit credits in headers', async () => {
		const { fetch } = makeFetchSequence([
			jsonResponse({ organic: [{ title: 'x' }] }, { headers: { 'x-ratelimit-remaining': '2438' } }),
		]);
		const result = await runSerperChecks({ apiKey: 'a'.repeat(40), source: 'env' }, fetch);
		expect(result.ok).toBe(true);
		expect(result.extras?.credits_remaining).toBe('2438');
		expect(result.checks.find((c) => c.name === 'Serper /search')?.detail).toMatch(/2438/);
	});

	it('rejects malformed key but still calls upstream (ok=false overall)', async () => {
		const { fetch } = makeFetchSequence([jsonResponse({ organic: [] })]);
		const result = await runSerperChecks({ apiKey: 'short', source: 'env' }, fetch);
		expect(result.checks[0].ok).toBe(false);
		expect(result.ok).toBe(false);
	});

	it('401 from /search produces error and ok=false', async () => {
		const { fetch } = makeFetchSequence([
			jsonResponse({ message: 'Unauthorized' }, { status: 401 }),
		]);
		const result = await runSerperChecks({ apiKey: 'a'.repeat(40), source: 'env' }, fetch);
		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/Unauthorized/);
	});

	it('network failure returns ok=false', async () => {
		const { fetch } = makeFetchSequence([new Error('Network down')]);
		const result = await runSerperChecks({ apiKey: 'a'.repeat(40), source: 'env' }, fetch);
		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/Network down/);
	});
});

// ---------------------------------------------------------------------------
// SerpAPI
// ---------------------------------------------------------------------------

describe('runSerpApiChecks', () => {
	it('happy path: account info populates extras with searches_left + plan', async () => {
		const { fetch } = makeFetchSequence([
			jsonResponse({
				account_email: 'me@x.com',
				plan_name: 'Free',
				total_searches_left: 87,
				this_month_usage: 13,
			}),
		]);
		const result = await runSerpApiChecks({ apiKey: 'sa', source: 'db' }, fetch);
		expect(result.ok).toBe(true);
		expect(result.extras?.searches_left).toBe(87);
		expect(result.extras?.plan).toBe('Free');
	});

	it('error body returns ok=false even with HTTP 200', async () => {
		const { fetch } = makeFetchSequence([jsonResponse({ error: 'Invalid API key' })]);
		const result = await runSerpApiChecks({ apiKey: 'bad', source: 'env' }, fetch);
		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/Invalid API key/);
	});

	it('network failure returns ok=false', async () => {
		const { fetch } = makeFetchSequence([new Error('boom')]);
		const result = await runSerpApiChecks({ apiKey: 'sa', source: 'env' }, fetch);
		expect(result.ok).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// OpenRouter
// ---------------------------------------------------------------------------

describe('runOpenRouterChecks', () => {
	it('happy path: usage + limit are surfaced in extras and checks', async () => {
		const { fetch, calls } = makeFetchSequence([
			jsonResponse({ data: { label: 'fabrick', usage: 1.23, limit: 5, is_free_tier: false } }),
		]);
		const result = await runOpenRouterChecks(
			{ apiKey: 'sk-or-test', source: 'env', appName: 'Fabrick', siteUrl: 'https://fabrick.cl' },
			fetch,
		);
		expect(result.ok).toBe(true);
		expect(result.extras?.usage_usd).toBe(1.23);
		expect(result.extras?.limit_usd).toBe(5);
		// HTTP-Referer is set when siteUrl is provided
		const headers = (calls[0].init?.headers ?? {}) as Record<string, string>;
		expect(headers['HTTP-Referer']).toBe('https://fabrick.cl');
	});

	it('rejects keys not starting with sk-or-', async () => {
		const { fetch } = makeFetchSequence([jsonResponse({ data: {} })]);
		const result = await runOpenRouterChecks(
			{ apiKey: 'sk-bad', source: 'env', appName: 'X' },
			fetch,
		);
		expect(result.checks[0].ok).toBe(false);
	});

	it('401 returns ok=false with upstream message', async () => {
		const { fetch } = makeFetchSequence([
			jsonResponse({ error: { message: 'Invalid token' } }, { status: 401 }),
		]);
		const result = await runOpenRouterChecks(
			{ apiKey: 'sk-or-x', source: 'env', appName: 'X' },
			fetch,
		);
		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/Invalid token/);
	});

	it('network failure returns ok=false', async () => {
		const { fetch } = makeFetchSequence([new Error('TLS handshake failed')]);
		const result = await runOpenRouterChecks(
			{ apiKey: 'sk-or-x', source: 'env', appName: 'X' },
			fetch,
		);
		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/TLS/);
	});
});

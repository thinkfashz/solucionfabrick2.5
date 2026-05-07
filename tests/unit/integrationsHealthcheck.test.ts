import { describe, expect, it } from 'vitest';
import { normalizeQuota } from '@/lib/integrationsHealthcheck';
import type { CheckResult } from '@/lib/integrationsTestRunners';

function fixture(provider: string, extras: Record<string, unknown>): CheckResult {
	return { ok: true, provider, checks: [], extras };
}

describe('integrationsHealthcheck.normalizeQuota', () => {
	it('serper: surfaces credits_remaining as the limit (no used known)', () => {
		const row = normalizeQuota(fixture('serper', { credits_remaining: '2438' }));
		expect(row).toEqual({
			provider: 'serper',
			used: null,
			quota_limit: 2438,
			raw: { credits_remaining: '2438' },
		});
	});

	it('serpapi: combines searches_left + this_month_usage into a (used, limit) pair', () => {
		const row = normalizeQuota(
			fixture('serpapi', { searches_left: 87, this_month_usage: 13, plan: 'Free' }),
		);
		expect(row).toEqual({
			provider: 'serpapi',
			used: 13,
			quota_limit: 100,
			raw: { searches_left: 87, this_month_usage: 13, plan: 'Free' },
		});
	});

	it('serpapi: falls back to searches_left when monthly usage is unknown', () => {
		const row = normalizeQuota(fixture('serpapi', { searches_left: 87 }));
		expect(row?.used).toBeNull();
		expect(row?.quota_limit).toBe(87);
	});

	it('openrouter: passes usage_usd / limit_usd straight through', () => {
		const row = normalizeQuota(
			fixture('openrouter', { usage_usd: 1.23, limit_usd: 5, is_free_tier: false }),
		);
		expect(row?.used).toBe(1.23);
		expect(row?.quota_limit).toBe(5);
	});

	it('returns null for providers without a normaliser', () => {
		expect(normalizeQuota(fixture('whatsapp', {}))).toBeNull();
		expect(normalizeQuota(fixture('resend', { domains_verified: 1 }))).toBeNull();
	});
});

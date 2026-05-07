import 'server-only';
import { decryptCredentials } from '@/lib/integrationsCrypto';
import { insforgeAdmin } from '@/lib/insforge';
import { getResendCredentials } from '@/lib/resendCredentials';
import { getOpenRouterCredentials } from '@/lib/openrouter';
import {
	runOpenRouterChecks,
	runResendChecks,
	runSerpApiChecks,
	runSerperChecks,
	runWhatsAppChecks,
	type CheckResult,
} from '@/lib/integrationsTestRunners';

/**
 * Orchestrates the daily integrations health-check (Mejora 3).
 *
 * For every provider we have a pure runner for, resolves credentials and
 * invokes the runner. For providers without a runner but with token-based
 * expiry (MercadoLibre), we add a "token expiry" probe. Persists one row
 * per provider into `integration_health_log` (best-effort) and feeds the
 * quota snapshots used by the QuotaBar component (Mejora 5).
 *
 * Returned shape:
 *   {
 *     ranAt: ISO,
 *     results: [{ provider, ok, error?, checks[], extras? }],
 *     failures: number,
 *     persisted: boolean,
 *     persistError: string | null,
 *   }
 */

export interface HealthCheckResult extends CheckResult {
	/** True when the provider has no credentials configured — skipped, not a failure. */
	skipped?: boolean;
	/** ISO timestamp of when the credential expires (if known). */
	expiresAt?: string | null;
	/** True when expiry is ≤ 72h away. */
	expiringSoon?: boolean;
}

const TOKEN_EXPIRY_WARNING_MS = 72 * 60 * 60 * 1000;

async function readDbCredentials(provider: string): Promise<Record<string, string>> {
	try {
		const { data } = await insforgeAdmin.database
			.from('integrations')
			.select('credentials')
			.eq('provider', provider)
			.limit(1)
			.maybeSingle();
		if (!data) return {};
		const decoded = decryptCredentials(
			(data as { credentials?: Record<string, unknown> }).credentials ?? {},
		) as Record<string, string | undefined>;
		const out: Record<string, string> = {};
		for (const [k, v] of Object.entries(decoded)) {
			if (typeof v === 'string') out[k] = v.trim();
		}
		return out;
	} catch {
		return {};
	}
}

async function checkResend(): Promise<HealthCheckResult> {
	const creds = await getResendCredentials();
	if (!creds?.apiKey) {
		return { ok: false, provider: 'resend', checks: [], skipped: true, error: 'Sin credenciales.' };
	}
	const r = await runResendChecks({ apiKey: creds.apiKey, from: creds.from ?? undefined, source: creds.source });
	return r;
}

async function checkOpenRouter(): Promise<HealthCheckResult> {
	const creds = await getOpenRouterCredentials();
	if (!creds?.apiKey) {
		return { ok: false, provider: 'openrouter', checks: [], skipped: true, error: 'Sin credenciales.' };
	}
	return runOpenRouterChecks({
		apiKey: creds.apiKey,
		source: creds.source,
		appName: creds.appName,
		siteUrl: creds.siteUrl ?? undefined,
	});
}

async function checkSerper(): Promise<HealthCheckResult> {
	const envKey = (process.env.SERPER_API_KEY ?? process.env.SERPER_KEY ?? '').trim();
	const dbCreds = envKey ? {} : await readDbCredentials('serper');
	const apiKey = envKey || (dbCreds.api_key ?? '');
	if (!apiKey) {
		return { ok: false, provider: 'serper', checks: [], skipped: true, error: 'Sin credenciales.' };
	}
	return runSerperChecks({ apiKey, source: envKey ? 'env' : 'db' });
}

async function checkSerpApi(): Promise<HealthCheckResult> {
	const envKey = (process.env.SERPAPI_KEY ?? process.env.SERPAPI_API_KEY ?? '').trim();
	const dbCreds = envKey ? {} : await readDbCredentials('serpapi');
	const apiKey = envKey || (dbCreds.api_key ?? '');
	if (!apiKey) {
		return { ok: false, provider: 'serpapi', checks: [], skipped: true, error: 'Sin credenciales.' };
	}
	return runSerpApiChecks({ apiKey, source: envKey ? 'env' : 'db' });
}

async function checkWhatsApp(): Promise<HealthCheckResult> {
	const dbCreds = await readDbCredentials('whatsapp');
	const access_token =
		(process.env.WHATSAPP_ACCESS_TOKEN ?? process.env.META_WHATSAPP_TOKEN ?? process.env.WHATSAPP_TOKEN ?? '').trim() ||
		dbCreds.access_token ||
		'';
	const phone_number_id =
		(process.env.WHATSAPP_PHONE_NUMBER_ID ?? process.env.WA_PHONE_NUMBER_ID ?? '').trim() ||
		dbCreds.phone_number_id ||
		'';
	const business_account_id =
		(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? process.env.WA_BUSINESS_ACCOUNT_ID ?? '').trim() ||
		dbCreds.business_account_id ||
		'';
	if (!access_token || !phone_number_id) {
		return { ok: false, provider: 'whatsapp', checks: [], skipped: true, error: 'Sin credenciales.' };
	}
	return runWhatsAppChecks({ access_token, phone_number_id, business_account_id: business_account_id || undefined });
}

/**
 * Generic token-expiry check shared by every OAuth-based provider
 * (mercadolibre / google / meta). Returns a HealthCheckResult shaped just
 * like a "real" runner so the cron/UI treat all providers identically.
 *
 * @param provider     Provider key as stored in `integrations.provider`.
 * @param tokenLabel   Human-readable label for the token (e.g. "access_token", "long-lived token").
 * @param reconnectHint UI hint shown when the token has fully expired.
 */
async function checkTokenExpiry(args: {
	provider: string;
	tokenLabel?: string;
	reconnectHint: string;
	envAccessTokenVars?: string[];
	envExpiresAtVars?: string[];
}): Promise<HealthCheckResult> {
	const tokenLabel = args.tokenLabel ?? 'access_token';
	try {
		const creds = await readDbCredentials(args.provider);
		const envToken = (args.envAccessTokenVars ?? [])
			.map((v) => process.env[v])
			.find((v): v is string => typeof v === 'string' && v.trim().length > 0)
			?.trim();
		const accessToken = creds.access_token || envToken || '';
		if (!accessToken) {
			return { ok: false, provider: args.provider, checks: [], skipped: true, error: 'Sin credenciales.' };
		}
		const envExpiresAt = (args.envExpiresAtVars ?? [])
			.map((v) => process.env[v])
			.find((v): v is string => typeof v === 'string' && v.trim().length > 0)
			?.trim();
		const expiresAtStr = creds.expires_at || envExpiresAt || '';
		const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null;
		const expiresAtValid = expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null;
		const remainingMs = expiresAtValid ? expiresAtValid.getTime() - Date.now() : null;
		const expiringSoon = remainingMs != null && remainingMs <= TOKEN_EXPIRY_WARNING_MS && remainingMs > 0;
		const expired = remainingMs != null && remainingMs <= 0;

		const checks = [];
		if (expired) {
			checks.push({
				name: tokenLabel,
				ok: false,
				detail: `Token expirado el ${expiresAtValid?.toISOString()}. ${args.reconnectHint}`,
			});
		} else if (expiringSoon) {
			const hoursLeft = Math.round((remainingMs ?? 0) / (60 * 60 * 1000));
			checks.push({
				name: tokenLabel,
				ok: false,
				detail: `El token caduca en ~${hoursLeft}h (${expiresAtValid?.toISOString()}). El refresh automático debería renovarlo, pero conviene revisar.`,
			});
		} else {
			checks.push({
				name: tokenLabel,
				ok: true,
				detail: expiresAtValid
					? `Token válido. Expira el ${expiresAtValid.toISOString()}.`
					: 'Token válido (sin fecha de expiración registrada).',
			});
		}
		return {
			ok: !expired && !expiringSoon,
			provider: args.provider,
			checks,
			expiresAt: expiresAtValid?.toISOString() ?? null,
			expiringSoon,
		};
	} catch (err) {
		return {
			ok: false,
			provider: args.provider,
			checks: [{ name: tokenLabel, ok: false, detail: err instanceof Error ? err.message : String(err) }],
			error: err instanceof Error ? err.message : String(err),
		};
	}
}

async function checkMercadoLibreExpiry(): Promise<HealthCheckResult> {
	return checkTokenExpiry({
		provider: 'mercadolibre',
		reconnectHint: 'Reconecta MercadoLibre desde /admin/integraciones.',
		envAccessTokenVars: ['ML_ACCESS_TOKEN', 'MERCADOLIBRE_ACCESS_TOKEN'],
		envExpiresAtVars: ['ML_EXPIRES_AT'],
	});
}

async function checkGoogleExpiry(): Promise<HealthCheckResult> {
	return checkTokenExpiry({
		provider: 'google',
		reconnectHint: 'Reconecta Google desde /admin/integraciones.',
	});
}

async function checkMetaExpiry(): Promise<HealthCheckResult> {
	return checkTokenExpiry({
		provider: 'meta',
		tokenLabel: 'long_lived_token',
		reconnectHint:
			'Reconecta Meta desde /admin/integraciones (el token long-lived dura ~60d y debe renovarse antes de expirar).',
	});
}

interface NamedCheck {
	provider: string;
	run: () => Promise<HealthCheckResult>;
}

const PROVIDER_CHECKS: NamedCheck[] = [
	{ provider: 'resend', run: checkResend },
	{ provider: 'openrouter', run: checkOpenRouter },
	{ provider: 'serper', run: checkSerper },
	{ provider: 'serpapi', run: checkSerpApi },
	{ provider: 'whatsapp', run: checkWhatsApp },
	{ provider: 'mercadolibre', run: checkMercadoLibreExpiry },
	{ provider: 'google', run: checkGoogleExpiry },
	{ provider: 'meta', run: checkMetaExpiry },
];

export interface HealthCheckRunSummary {
	ranAt: string;
	results: HealthCheckResult[];
	failures: number;
	persisted: boolean;
	persistError: string | null;
	quotaRows: number;
}

/**
 * Persists the health-check results into `integration_health_log` and any
 * provider-specific quota into `integration_quota_snapshots`. Both writes
 * are best-effort: if the tables are missing we surface that in the
 * response (the cron returns 200 anyway so Vercel doesn't keep retrying).
 */
async function persistResults(results: HealthCheckResult[]): Promise<{ ok: boolean; error: string | null; quotaRows: number }> {
	let quotaRows = 0;
	try {
		const logRows = results
			.filter((r) => !r.skipped)
			.map((r) => ({
				provider: r.provider,
				ok: r.ok,
				checks: r.checks,
				error: r.error ?? null,
			}));
		if (logRows.length > 0) {
			const { error } = await insforgeAdmin.database.from('integration_health_log').insert(logRows);
			if (error) return { ok: false, error: error.message, quotaRows };
		}
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : String(err), quotaRows };
	}

	// Quota snapshots — only providers that returned `extras` with usage data.
	try {
		const quota = results
			.filter((r) => !r.skipped && r.extras && Object.keys(r.extras).length > 0)
			.map((r) => normalizeQuota(r))
			.filter((row): row is QuotaRow => row !== null);
		quotaRows = quota.length;
		if (quota.length > 0) {
			await insforgeAdmin.database.from('integration_quota_snapshots').insert(quota);
		}
	} catch {
		// Quota persistence is non-critical; swallow.
	}
	return { ok: true, error: null, quotaRows };
}

interface QuotaRow {
	provider: string;
	used: number | null;
	quota_limit: number | null;
	raw: Record<string, unknown>;
}

/**
 * Best-effort normalisation of provider-specific quota payloads into a
 * common (used, limit) pair the QuotaBar component can consume.
 *   - Serper: credits_remaining → only "remaining" known; we leave used=null and limit=null but keep raw.
 *   - SerpAPI: searches_left + this_month_usage → used=this_month_usage, limit=searches_left+this_month_usage
 *   - OpenRouter: usage_usd / limit_usd → straightforward.
 */
export function normalizeQuota(r: HealthCheckResult): QuotaRow | null {
	const extras = r.extras ?? {};
	if (r.provider === 'serper') {
		const remaining = typeof extras.credits_remaining === 'string' ? Number(extras.credits_remaining) : null;
		return {
			provider: 'serper',
			used: null,
			quota_limit: remaining != null && Number.isFinite(remaining) ? remaining : null,
			raw: extras,
		};
	}
	if (r.provider === 'serpapi') {
		const left = typeof extras.searches_left === 'number' ? extras.searches_left : null;
		const used = typeof extras.this_month_usage === 'number' ? extras.this_month_usage : null;
		const limit = left != null && used != null ? left + used : left;
		return { provider: 'serpapi', used, quota_limit: limit, raw: extras };
	}
	if (r.provider === 'openrouter') {
		const usage = typeof extras.usage_usd === 'number' ? extras.usage_usd : null;
		const limit = typeof extras.limit_usd === 'number' ? extras.limit_usd : null;
		return { provider: 'openrouter', used: usage, quota_limit: limit, raw: extras };
	}
	return null;
}

export async function runIntegrationsHealthcheck(): Promise<HealthCheckRunSummary> {
	const ranAt = new Date().toISOString();
	const results = await Promise.all(
		PROVIDER_CHECKS.map(({ provider, run }) =>
			run().catch((err): HealthCheckResult => ({
				ok: false,
				provider,
				checks: [{ name: 'runner', ok: false, detail: err instanceof Error ? err.message : String(err) }],
				error: err instanceof Error ? err.message : String(err),
			})),
		),
	);
	const persistRes = await persistResults(results);
	const failures = results.filter((r) => !r.skipped && !r.ok).length;
	return {
		ranAt,
		results,
		failures,
		persisted: persistRes.ok,
		persistError: persistRes.error,
		quotaRows: persistRes.quotaRows,
	};
}

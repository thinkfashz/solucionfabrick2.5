import { NextResponse, type NextRequest } from 'next/server';
import { Resend } from 'resend';
import { getAdminSession } from '@/lib/adminApi';
import { getResendCredentials } from '@/lib/resendCredentials';
import { runIntegrationsHealthcheck } from '@/lib/integrationsHealthcheck';
import IntegrationHealthEmail from '@/emails/IntegrationHealthEmail';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/cron/integrations-healthcheck
 *
 * Daily cron (Vercel Hobby allows once a day — `0 9 * * *` UTC). For each
 * configured provider runs the same `runXxxChecks()` helpers used by
 * `/api/admin/integrations/test`, persists `integration_health_log` and
 * `integration_quota_snapshots`, and (only if there is at least one
 * failure) sends a single consolidated email to `ADMIN_ALERT_EMAIL`
 * via Resend so we never spam.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this when
 * `CRON_SECRET` is configured) OR a valid admin session cookie (so an
 * admin can trigger the run manually for diagnostics).
 */
function isCronAuthorized(request: NextRequest): boolean {
	const secret = process.env.CRON_SECRET;
	if (!secret) return false;
	const header = request.headers.get('authorization') ?? '';
	return header === `Bearer ${secret}`;
}

function pickAlertEmail(): string | null {
	const email = (process.env.ADMIN_ALERT_EMAIL ?? '').trim();
	if (!email) return null;
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
	return email;
}

function pickDashboardUrl(): string | undefined {
	const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim();
	if (!site) return undefined;
	return `${site.replace(/\/+$/, '')}/admin/integraciones`;
}

export async function GET(request: NextRequest) {
	if (!isCronAuthorized(request)) {
		const session = await getAdminSession(request);
		if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
	}

	const summary = await runIntegrationsHealthcheck();

	let emailSent = false;
	let emailError: string | null = null;

	if (summary.failures > 0) {
		const alertTo = pickAlertEmail();
		if (!alertTo) {
			emailError = 'ADMIN_ALERT_EMAIL no configurado: no se envió alerta.';
		} else {
			try {
				const creds = await getResendCredentials();
				if (!creds?.apiKey) {
					emailError = 'Resend no configurado: no se envió alerta.';
				} else {
					const resend = new Resend(creds.apiKey);
					const from = creds.from ?? 'Soluciones Fabrick <onboarding@resend.dev>';
					const failures = summary.results
						.filter((r) => !r.skipped && !r.ok)
						.map((r) => ({
							provider: r.provider,
							error: r.error,
							checks: r.checks,
							expiringSoon: r.expiringSoon,
							expiresAt: r.expiresAt ?? null,
						}));
					const { error } = await resend.emails.send({
						from,
						to: alertTo,
						subject: `[Fabrick] ${failures.length} integración(es) con problemas`,
						react: IntegrationHealthEmail({
							ranAt: summary.ranAt,
							failures,
							dashboardUrl: pickDashboardUrl(),
						}),
					});
					if (error) {
						emailError = error.message ?? String(error);
					} else {
						emailSent = true;
					}
				}
			} catch (err) {
				emailError = err instanceof Error ? err.message : String(err);
			}
		}
	}

	return NextResponse.json({
		ok: true,
		ranAt: summary.ranAt,
		failures: summary.failures,
		// Only return per-provider booleans + names — full check details already
		// live in the `integration_health_log` table for forensics.
		results: summary.results.map((r) => ({
			provider: r.provider,
			ok: r.ok,
			skipped: Boolean(r.skipped),
			error: r.error ?? null,
			expiringSoon: r.expiringSoon ?? false,
		})),
		persisted: summary.persisted,
		persistError: summary.persistError,
		quotaRows: summary.quotaRows,
		emailSent,
		emailError,
	});
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { adminUnauthorized, getAdminSession } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Hidden admin-only endpoint to verify that Sentry is correctly wired up in
 * production. Trigger by `GET /api/admin/test-sentry` with a valid admin
 * session cookie. The thrown error propagates to the Next.js runtime so
 * Sentry's automatic instrumentation captures it and forwards it to the
 * dashboard. Anonymous (or non-admin) callers receive 401 and never reach
 * the throw.
 *
 * Sentry only sends events in production (`NODE_ENV === 'production'`),
 * so calling this endpoint locally is a no-op for the dashboard.
 */
export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  // In production, surface a deliberate error so it shows up in Sentry.
  if (process.env.NODE_ENV === 'production') {
    // Capture explicitly as well, so the test works even if the framework
    // catches the throw before the Sentry handler runs.
    const error = new Error(
      `Sentry test error triggered by admin ${session.email} at ${new Date().toISOString()}`,
    );
    Sentry.captureException(error);
    throw error;
  }

  // Outside production we don't pollute the dashboard – just confirm the
  // endpoint is reachable and that Sentry is wired up.
  return NextResponse.json({
    ok: true,
    env: process.env.NODE_ENV,
    sentryDsnConfigured: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
    note:
      'Sentry only reports errors in production. Deploy to production and call this endpoint to verify the dashboard.',
  });
}

/**
 * GET /api/cron/expire-trials
 *
 * Suspends tenants whose trial has expired without an active subscription.
 * Should be called daily via Vercel Cron (vercel.json):
 *
 *   { "path": "/api/cron/expire-trials", "schedule": "0 8 * * *" }
 *
 * Auth: Bearer $CRON_SECRET  (same env var used by other cron jobs)
 */

import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { invalidateTenantCache } from '@/lib/tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const now = new Date().toISOString();

  // Find tenants in 'trial' status whose trial_ends_at has passed and
  // don't have an authorized subscription.
  const { data: expiredTrials, error: queryErr } = await insforge.database
    .from('tenants')
    .select('id, slug, owner_email, name, trial_ends_at')
    .eq('status', 'trial')
    .lt('trial_ends_at', now)
    .neq('id', '00000000-0000-0000-0000-000000000001'); // never expire the default tenant

  if (queryErr) {
    return NextResponse.json({ error: queryErr.message }, { status: 500 });
  }

  const trials = (expiredTrials ?? []) as Array<{
    id: string; slug: string; owner_email: string; name: string; trial_ends_at: string;
  }>;

  if (trials.length === 0) {
    return NextResponse.json({ ok: true, suspended: 0, message: 'No hay trials vencidos.' });
  }

  const suspended: string[] = [];
  const skipped: string[] = [];

  for (const tenant of trials) {
    // Check if tenant has an active subscription (user may have paid but webhook was delayed)
    const { data: subRows } = await insforge.database
      .from('platform_subscriptions')
      .select('id, status')
      .eq('tenant_id', tenant.id)
      .eq('status', 'authorized')
      .limit(1);

    if (subRows && subRows.length > 0) {
      // Has active subscription → activate instead of suspending
      await insforge.database
        .from('tenants')
        .update({ status: 'active', updated_at: now })
        .eq('id', tenant.id);
      invalidateTenantCache(tenant.id, tenant.slug);
      skipped.push(tenant.slug);
      continue;
    }

    // Suspend tenant
    await insforge.database
      .from('tenants')
      .update({ status: 'suspended', updated_at: now })
      .eq('id', tenant.id);
    invalidateTenantCache(tenant.id, tenant.slug);
    suspended.push(tenant.slug);

    // Fire-and-forget suspension notification
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    fetch(`${baseUrl}/api/platform/notify-suspension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-platform-secret': process.env.PLATFORM_ADMIN_SECRET ?? '',
      },
      body: JSON.stringify({ tenant_id: tenant.id }),
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    suspended: suspended.length,
    activated: skipped.length,
    suspended_slugs: suspended,
    activated_slugs: skipped,
    checked_at: now,
  });
}

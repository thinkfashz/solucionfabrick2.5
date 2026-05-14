/**
 * GET /api/platform/revenue
 *
 * Returns real-time MRR, ARR, churn rate and per-plan breakdown.
 * Protected: requires Authorization: Bearer $PLATFORM_ADMIN_SECRET
 *
 * Response shape:
 *   {
 *     mrr_clp, arr_clp, mrr_usd,
 *     active_tenants, trial_tenants, churned_tenants,
 *     churn_rate_30d,
 *     by_plan: [{ plan_id, plan_name, count, mrr_clp }],
 *     recent_payments: [...],
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { isPlatformAdmin } from '@/lib/tenant';

const CLP_TO_USD = 0.0011; // approx, for display only

export async function GET(request: NextRequest) {
  if (!isPlatformAdmin(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    // ── Tenant counts by status ──────────────────────────────────────────────
    const { data: tenantStats } = await insforge.database
      .from('tenants')
      .select('status');

    const statusCounts = (tenantStats ?? []).reduce<Record<string, number>>((acc, row) => {
      const r = row as { status: string };
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});

    const activeTenants = statusCounts['active'] ?? 0;
    const trialTenants = statusCounts['trial'] ?? 0;
    const cancelledTenants = statusCounts['cancelled'] ?? 0;

    // ── Active subscriptions with plan prices ────────────────────────────────
    const { data: subRows } = await insforge.database
      .from('platform_subscriptions')
      .select('plan_id, amount_clp, status, tenant_id');

    const activeSubRows = ((subRows ?? []) as Array<{ plan_id: string; amount_clp: number; status: string }>)
      .filter((r) => r.status === 'authorized');

    const mrrClp = activeSubRows.reduce((sum, r) => sum + (r.amount_clp ?? 0), 0);

    // ── Per-plan breakdown ───────────────────────────────────────────────────
    const { data: planRows } = await insforge.database
      .from('platform_plans')
      .select('id, name, price_clp');

    const planMap = new Map<string, { name: string; price_clp: number }>(
      ((planRows ?? []) as Array<{ id: string; name: string; price_clp: number }>)
        .map((p) => [p.id, { name: p.name, price_clp: p.price_clp }]),
    );

    const byPlanMap = new Map<string, { plan_id: string; plan_name: string; count: number; mrr_clp: number }>();
    for (const row of activeSubRows) {
      const plan = planMap.get(row.plan_id);
      if (!plan) continue;
      const existing = byPlanMap.get(row.plan_id) ?? { plan_id: row.plan_id, plan_name: plan.name, count: 0, mrr_clp: 0 };
      existing.count += 1;
      existing.mrr_clp += row.amount_clp ?? plan.price_clp;
      byPlanMap.set(row.plan_id, existing);
    }

    // ── Churn: cancelled in last 30 days ─────────────────────────────────────
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: churnRows } = await insforge.database
      .from('platform_subscriptions')
      .select('id')
      .eq('status', 'cancelled')
      .gte('updated_at', thirtyDaysAgo);

    const churned30d = (churnRows ?? []).length;
    const totalAtRisk = activeTenants + churned30d;
    const churnRate30d = totalAtRisk > 0 ? Math.round((churned30d / totalAtRisk) * 1000) / 10 : 0;

    // ── Recent payments ───────────────────────────────────────────────────────
    const { data: recentPayments } = await insforge.database
      .from('platform_payment_log')
      .select('tenant_id, amount_clp, status, event_type, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Enrich with tenant name
    const paymentTenantIds = [...new Set(
      ((recentPayments ?? []) as Array<{ tenant_id: string }>).map((r) => r.tenant_id).filter(Boolean),
    )];

    let tenantNameMap = new Map<string, string>();
    if (paymentTenantIds.length > 0) {
      const { data: tenantNames } = await insforge.database
        .from('tenants')
        .select('id, name, slug')
        .in('id', paymentTenantIds);
      tenantNameMap = new Map(
        ((tenantNames ?? []) as Array<{ id: string; name: string; slug: string }>)
          .map((t) => [t.id, `${t.name} (${t.slug})`]),
      );
    }

    const enrichedPayments = ((recentPayments ?? []) as Array<{
      tenant_id: string; amount_clp: number; status: string; event_type: string; created_at: string;
    }>).map((p) => ({
      ...p,
      tenant_name: tenantNameMap.get(p.tenant_id) ?? p.tenant_id,
    }));

    // ── Growth: MoM new tenants ───────────────────────────────────────────────
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);

    const { data: newThisMonth } = await insforge.database
      .from('tenants')
      .select('id')
      .gte('created_at', firstOfMonth.toISOString())
      .neq('id', '00000000-0000-0000-0000-000000000001');

    return NextResponse.json({
      ok: true,
      // Revenue
      mrr_clp: mrrClp,
      arr_clp: mrrClp * 12,
      mrr_usd: Math.round(mrrClp * CLP_TO_USD),
      arr_usd: Math.round(mrrClp * 12 * CLP_TO_USD),
      // Tenants
      active_tenants: activeTenants,
      trial_tenants: trialTenants,
      churned_tenants: cancelledTenants,
      new_tenants_this_month: (newThisMonth ?? []).length,
      // Churn
      churned_last_30d: churned30d,
      churn_rate_30d: churnRate30d,
      // Breakdown
      by_plan: Array.from(byPlanMap.values()),
      // Payments
      recent_payments: enrichedPayments,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error obteniendo métricas.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

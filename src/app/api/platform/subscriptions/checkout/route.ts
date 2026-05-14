/**
 * POST /api/platform/subscriptions/checkout
 *
 * Creates or retrieves a MercadoPago subscription (preapproval) for a tenant.
 * Called from the /registro onboarding page after the user fills in their
 * business info and selects a plan.
 *
 * Flow:
 *   1. Validate body (plan, business info)
 *   2. Upsert the tenant row (status=trial)
 *   3. Create/fetch the MP preapproval_plan for the chosen plan
 *   4. Create an MP preapproval (subscription) pointing to that plan
 *   5. Insert a platform_subscriptions row (status=pending)
 *   6. Return { init_point } so the frontend can redirect to MP checkout
 *
 * The tenant's status is updated to 'active' by the webhook handler once
 * MercadoPago reports the first authorized payment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { toSlug, RESERVED_SLUGS } from '@/lib/tenant';
import { getMercadoPagoAccessToken, getAppBaseUrl } from '@/lib/mercadopago';

const MP_API = 'https://api.mercadopago.com';

interface CheckoutBody {
  plan_id: 'starter' | 'pro' | 'enterprise';
  business_name: string;
  owner_email: string;
  owner_name?: string;
  phone?: string;
  slug?: string;            // optional: pre-chosen subdomain
}

async function mpFetch<T>(path: string, init: RequestInit): Promise<T> {
  const token = getMercadoPagoAccessToken();
  if (!token) throw new Error('MERCADO_PAGO_ACCESS_TOKEN no configurado.');
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg = (data as { message?: string }).message ?? `MP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

/** Get or create an MP preapproval_plan for the given Fabrick plan. */
async function ensureMpPlan(planId: string, planName: string, amountClp: number): Promise<string> {
  // Check if we already have a plan ID stored in DB
  const { data: rows } = await insforge.database
    .from('platform_plans')
    .select('mp_plan_id')
    .eq('id', planId)
    .limit(1);

  const existing = rows?.[0] as { mp_plan_id: string | null } | undefined;
  if (existing?.mp_plan_id) return existing.mp_plan_id;

  // Create a new plan in MP
  const body = {
    reason: `${planName} — Fabrick Platform`,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: amountClp,
      currency_id: 'CLP',
    },
    payment_methods_allowed: {
      payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }],
    },
    back_url: `${getAppBaseUrl()}/registro?plan=${planId}&payment=success`,
    status: 'active',
  };

  const result = await mpFetch<{ id: string }>('/preapproval_plan', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  // Persist so future checkouts reuse the same plan
  await insforge.database
    .from('platform_plans')
    .update({ mp_plan_id: result.id })
    .eq('id', planId);

  return result.id;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const { plan_id, business_name, owner_email, owner_name, phone } = body;

    if (!plan_id || !business_name || !owner_email) {
      return NextResponse.json({ error: 'plan_id, business_name y owner_email son requeridos.' }, { status: 400 });
    }

    // Resolve plan from DB
    const { data: planRows, error: planErr } = await insforge.database
      .from('platform_plans')
      .select('id, name, price_clp, mp_plan_id')
      .eq('id', plan_id)
      .eq('active', true)
      .limit(1);

    if (planErr || !planRows || planRows.length === 0) {
      return NextResponse.json({ error: 'Plan no encontrado.' }, { status: 404 });
    }
    const plan = planRows[0] as { id: string; name: string; price_clp: number; mp_plan_id: string | null };

    // Build slug
    const rawSlug = body.slug?.trim().toLowerCase() || toSlug(business_name);
    if (RESERVED_SLUGS.has(rawSlug)) {
      return NextResponse.json({ error: `El subdominio "${rawSlug}" está reservado.` }, { status: 409 });
    }
    if (!/^[a-z0-9-]{3,40}$/.test(rawSlug)) {
      return NextResponse.json({ error: 'El subdominio solo puede contener letras, números y guiones (3-40 caracteres).' }, { status: 400 });
    }

    // Upsert tenant
    const { data: existingTenants } = await insforge.database
      .from('tenants')
      .select('id, status')
      .eq('slug', rawSlug)
      .limit(1);

    let tenantId: string;

    if (existingTenants && existingTenants.length > 0) {
      const existing = existingTenants[0] as { id: string; status: string };
      if (existing.status === 'active') {
        return NextResponse.json({ error: `El subdominio "${rawSlug}" ya está en uso.` }, { status: 409 });
      }
      tenantId = existing.id;
      await insforge.database
        .from('tenants')
        .update({ name: business_name, owner_email, owner_name, phone, plan_id, updated_at: new Date().toISOString() })
        .eq('id', tenantId);
    } else {
      const { data: inserted, error: insertErr } = await insforge.database
        .from('tenants')
        .insert([{
          slug: rawSlug,
          name: business_name,
          owner_email,
          owner_name: owner_name ?? null,
          phone: phone ?? null,
          plan_id,
          status: 'trial',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        }])
        .select('id')
        .limit(1);

      if (insertErr || !inserted || inserted.length === 0) {
        return NextResponse.json({ error: 'No se pudo crear el tenant.' }, { status: 500 });
      }
      tenantId = (inserted[0] as { id: string }).id;
    }

    // Idempotency: return the existing pending preapproval if one exists,
    // to avoid creating orphaned MP preapprovals on repeated POST calls.
    const { data: existingSub } = await insforge.database
      .from('platform_subscriptions')
      .select('id, mp_preapproval_id, status')
      .eq('tenant_id', tenantId)
      .limit(1);

    const existingRow = existingSub?.[0] as
      | { id: string; mp_preapproval_id: string | null; status: string }
      | undefined;

    if (existingRow?.mp_preapproval_id && existingRow.status === 'pending') {
      // Try to recover the init_point from MP instead of creating a new preapproval.
      try {
        const existing = await mpFetch<{ id: string; init_point?: string; status: string }>(
          `/preapproval/${existingRow.mp_preapproval_id}`,
          { method: 'GET' },
        );
        if (existing.status === 'pending' && existing.init_point) {
          return NextResponse.json({
            ok: true,
            tenant_id: tenantId,
            slug: rawSlug,
            plan: plan.name,
            amount_clp: plan.price_clp,
            mp_preapproval_id: existing.id,
            init_point: existing.init_point,
            reused: true,
          });
        }
      } catch {
        // If fetch fails, fall through and create a new preapproval.
      }
    }

    // Ensure MP subscription plan exists
    const mpPlanId = await ensureMpPlan(plan.id, plan.name, plan.price_clp);

    // Create MP preapproval (subscription instance for this customer)
    const baseUrl = getAppBaseUrl();
    const preapprovalBody = {
      preapproval_plan_id: mpPlanId,
      reason: `${plan.name} — Fabrick Platform — ${rawSlug}`,
      payer_email: owner_email,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: plan.price_clp,
        currency_id: 'CLP',
      },
      back_url: `${baseUrl}/registro?plan=${plan_id}&tenant=${rawSlug}&payment=success`,
      status: 'pending',
      external_reference: tenantId,
    };

    const preapproval = await mpFetch<{ id: string; init_point: string }>(
      '/preapproval',
      { method: 'POST', body: JSON.stringify(preapprovalBody) },
    );

    // Upsert subscription row
    if (existingRow) {
      await insforge.database
        .from('platform_subscriptions')
        .update({
          plan_id,
          mp_preapproval_id: preapproval.id,
          mp_plan_id: mpPlanId,
          amount_clp: plan.price_clp,
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);
    } else {
      await insforge.database.from('platform_subscriptions').insert([{
        tenant_id: tenantId,
        plan_id,
        mp_preapproval_id: preapproval.id,
        mp_plan_id: mpPlanId,
        amount_clp: plan.price_clp,
        status: 'pending',
      }]);
    }

    return NextResponse.json({
      ok: true,
      tenant_id: tenantId,
      slug: rawSlug,
      plan: plan.name,
      amount_clp: plan.price_clp,
      mp_preapproval_id: preapproval.id,
      init_point: preapproval.init_point,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error creando suscripción.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/platform/subscriptions/webhook
 *
 * Receives MercadoPago subscription (preapproval) webhook events.
 * Configure in MP dashboard: topic=subscription_preapproval
 *
 * Env var required: PLATFORM_MP_WEBHOOK_SECRET  (set in Vercel, same value as
 * the "signature" field in the MP webhook config for this URL)
 *
 * On 'authorized': activates the tenant and logs the payment.
 * On 'cancelled' / 'paused': suspends the tenant accordingly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { insforge } from '@/lib/insforge';
import { invalidateTenantCache } from '@/lib/tenant';
import { provisionTenant } from '@/lib/tenantProvisioning';

const MP_API = 'https://api.mercadopago.com';

function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.PLATFORM_MP_WEBHOOK_SECRET;
  // Fail closed: if the secret is not configured, reject ALL requests.
  // An absent env var is a misconfiguration, not a dev shortcut.
  if (!secret) return false;
  if (!header) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === header;
}

async function fetchPreapproval(id: string) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? process.env.MP_ACCESS_TOKEN ?? '';
  if (!token) return null;
  const res = await fetch(`${MP_API}/preapproval/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json() as Promise<{
    id: string;
    status: string;
    external_reference?: string;
    payer_email?: string;
    preapproval_plan_id?: string;
    auto_recurring?: { transaction_amount: number; currency_id: string };
    next_payment_date?: string;
    last_modified?: string;
  }>;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const sigHeader = request.headers.get('x-signature');

  if (!verifySignature(rawBody, sigHeader)) {
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
  }

  let payload: { type?: string; data?: { id?: string }; action?: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  // MP sends: { type: 'subscription_preapproval', action: 'updated', data: { id } }
  const isSubscriptionEvent =
    payload.type === 'subscription_preapproval' || payload.action?.includes('preapproval');

  if (!isSubscriptionEvent || !payload.data?.id) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const preapprovalId = payload.data.id;
  const preapproval = await fetchPreapproval(preapprovalId);

  if (!preapproval) {
    return NextResponse.json({ error: 'No se pudo obtener el preapproval de MP.' }, { status: 502 });
  }

  // Map MP status → platform subscription status
  const statusMap: Record<string, string> = {
    authorized: 'authorized',
    paused: 'paused',
    cancelled: 'cancelled',
    pending: 'pending',
  };
  const subscriptionStatus = statusMap[preapproval.status] ?? 'pending';

  // Resolve the tenant from external_reference (tenant UUID)
  const tenantId = preapproval.external_reference;
  if (!tenantId) {
    return NextResponse.json({ error: 'Preapproval sin external_reference.' }, { status: 400 });
  }

  // Update platform_subscriptions
  const { error: subErr } = await insforge.database
    .from('platform_subscriptions')
    .update({
      status: subscriptionStatus,
      next_payment_date: preapproval.next_payment_date ?? null,
      last_payment_date: subscriptionStatus === 'authorized' ? new Date().toISOString() : undefined,
      last_payment_status: preapproval.status,
      updated_at: new Date().toISOString(),
    })
    .eq('mp_preapproval_id', preapprovalId);

  if (subErr) {
    console.error('[platform-webhook] update subscription error', subErr.message);
  }

  // Update tenant status
  const tenantStatus =
    subscriptionStatus === 'authorized' ? 'active' :
    subscriptionStatus === 'paused'     ? 'suspended' :
    subscriptionStatus === 'cancelled'  ? 'cancelled' : undefined;

  if (tenantStatus) {
    const { data: tenantRows } = await insforge.database
      .from('tenants')
      .update({ status: tenantStatus, updated_at: new Date().toISOString() })
      .eq('id', tenantId)
      .select('slug')
      .limit(1);

    // Bust in-process cache
    const slug = (tenantRows?.[0] as { slug?: string } | undefined)?.slug;
    invalidateTenantCache(tenantId, slug);

    // On first activation: provision admin user + send welcome email
    if (tenantStatus === 'active') {
      provisionTenant(tenantId)
        .then((result) => {
          if (!result.ok) {
            console.warn('[platform-webhook] provisioning failed', result.error);
            return;
          }

          // Notify via internal route (non-blocking)
          fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/platform/notify-activation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-platform-secret': process.env.PLATFORM_ADMIN_SECRET ?? '',
            },
            body: JSON.stringify({
              tenant_id: tenantId,
              temp_password: result.temp_password,
              already_existed: result.already_existed,
            }),
          }).catch(() => {});
        })
        .catch((err) => console.warn('[platform-webhook] provision error', err));
    }
  }

  // Log payment event
  await insforge.database.from('platform_payment_log').insert([{
    subscription_id: null,
    tenant_id: tenantId,
    mp_payment_id: preapprovalId,
    amount_clp: preapproval.auto_recurring?.transaction_amount ?? null,
    status: preapproval.status,
    event_type: `preapproval.${preapproval.status}`,
    raw: preapproval as unknown as Record<string, unknown>,
  }]);

  return NextResponse.json({
    ok: true,
    tenant_id: tenantId,
    subscription_status: subscriptionStatus,
    tenant_status: tenantStatus ?? 'unchanged',
  });
}

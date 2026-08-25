import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { readTenantIntegration } from '@/lib/tenantIntegrations';
import { getMercadoPagoCredentials } from '@/lib/mercadoPagoCredentials';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type NativeState = 'approved' | 'pending' | 'failed';
type CredentialSource = 'tenant-encrypted' | 'vercel-env' | 'encrypted-db';

type MercadoPagoPayment = {
  id?: string | number | null;
  status?: string | null;
  status_detail?: string | null;
  transaction_amount?: number | null;
  currency_id?: string | null;
  description?: string | null;
  external_reference?: string | null;
  date_created?: string | null;
  date_approved?: string | null;
  date_last_updated?: string | null;
  money_release_date?: string | null;
  payment_method_id?: string | null;
  payment_type_id?: string | null;
  live_mode?: boolean | null;
  transaction_details?: {
    net_received_amount?: number | null;
    total_paid_amount?: number | null;
  } | null;
};

type MercadoPagoSearchResponse = {
  paging?: { total?: number; limit?: number; offset?: number };
  results?: MercadoPagoPayment[];
};

type ResolvedCredential = {
  accessToken: string;
  source: CredentialSource;
  webhookSignatureConfigured: boolean;
};

function text(value: unknown) {
  return String(value ?? '').trim();
}

function amount(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function classify(statusValue: unknown): NativeState {
  const status = text(statusValue).toLowerCase();
  if (status === 'approved') return 'approved';
  if (['pending', 'in_process', 'authorized'].includes(status)) return 'pending';
  return 'failed';
}

function isTransfer(payment: MercadoPagoPayment) {
  const type = text(payment.payment_type_id).toLowerCase();
  const method = text(payment.payment_method_id).toLowerCase();
  return type === 'bank_transfer' || /bank|transfer/.test(type) || /bank|transfer/.test(method);
}

function isOlderThan(value: string | null | undefined, hours: number) {
  if (!value) return false;
  const ts = Date.parse(value);
  return Number.isFinite(ts) && Date.now() - ts > hours * 60 * 60 * 1000;
}

function sameDay(value: string | null | undefined, target = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === target.getFullYear()
    && date.getMonth() === target.getMonth()
    && date.getDate() === target.getDate();
}

async function resolveCredential(tenantId: string): Promise<ResolvedCredential | null> {
  // The canonical Fabrick tenant must prefer server-side Vercel environment
  // credentials. They never cross the client boundary or appear in the repo.
  if (tenantId === 'default') {
    const global = await getMercadoPagoCredentials();
    if (global.accessToken) {
      return {
        accessToken: global.accessToken,
        source: global.sources.accessToken === 'env' ? 'vercel-env' : 'encrypted-db',
        webhookSignatureConfigured: Boolean(global.webhookSecret),
      };
    }
  }

  // SaaS tenants use isolated encrypted credentials; never reuse the canonical
  // merchant token across companies.
  const tenant = await readTenantIntegration(tenantId, 'mercadopago', ['access_token']);
  if (tenant.ready && tenant.values.access_token) {
    return {
      accessToken: tenant.values.access_token,
      source: 'tenant-encrypted',
      webhookSignatureConfigured: Boolean(tenant.values.webhook_secret),
    };
  }

  return null;
}

async function searchMercadoPagoPayments(accessToken: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9_000);
  try {
    const url = new URL('https://api.mercadopago.com/v1/payments/search');
    url.searchParams.set('sort', 'date_created');
    url.searchParams.set('criteria', 'desc');
    url.searchParams.set('limit', '50');
    url.searchParams.set('offset', '0');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    const json = await response.json().catch(() => ({})) as MercadoPagoSearchResponse & { message?: string; error?: string };
    if (response.status === 401 || response.status === 403) {
      throw new Error('Mercado Pago rechazó la credencial del servidor. Revisa el Access Token protegido.');
    }
    if (!response.ok) {
      throw new Error(json.message || json.error || `Mercado Pago respondió HTTP ${response.status}.`);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'orders', action: 'read' });
  if (!auth.ok) return auth.response;

  const credential = await resolveCredential(auth.ctx.tenantId);
  if (!credential) {
    return NextResponse.json({
      error: 'Mercado Pago no está configurado para este tenant. El panel financiero no puede inventar estados locales.',
      code: 'MERCADOPAGO_NOT_CONFIGURED',
      providerRequired: true,
    }, { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }

  try {
    const search = await searchMercadoPagoPayments(credential.accessToken);
    const payments = Array.isArray(search.results) ? search.results : [];
    let approved = 0;
    let pending = 0;
    let failed = 0;
    let transfers = 0;
    let approvedVolume = 0;
    let netReceivedVolume = 0;
    let approvedToday = 0;
    let stalePending = 0;
    let failedRecent = 0;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const rows = payments.map((payment) => {
      const nativeState = classify(payment.status);
      const transactionAmount = amount(payment.transaction_amount);
      const netAmount = amount(payment.transaction_details?.net_received_amount);
      const transfer = isTransfer(payment);

      if (nativeState === 'approved') {
        approved += 1;
        approvedVolume += transactionAmount;
        netReceivedVolume += netAmount > 0 ? netAmount : transactionAmount;
        if (sameDay(payment.date_approved || payment.date_last_updated || payment.date_created)) approvedToday += 1;
      } else if (nativeState === 'pending') {
        pending += 1;
        if (isOlderThan(payment.date_last_updated || payment.date_created, 24)) stalePending += 1;
      } else {
        failed += 1;
        const ts = Date.parse(payment.date_last_updated || payment.date_created || '');
        if (Number.isFinite(ts) && ts >= sevenDaysAgo) failedRecent += 1;
      }
      if (transfer) transfers += 1;

      return {
        id: payment.id != null ? String(payment.id) : '',
        externalReference: payment.external_reference || null,
        amount: transactionAmount,
        netAmount: netAmount > 0 ? netAmount : null,
        currency: payment.currency_id || 'CLP',
        status: payment.status || 'unknown',
        statusDetail: payment.status_detail || null,
        description: payment.description || null,
        paymentMethod: payment.payment_method_id || null,
        paymentType: payment.payment_type_id || null,
        dateCreated: payment.date_created || null,
        dateApproved: payment.date_approved || null,
        dateLastUpdated: payment.date_last_updated || null,
        moneyReleaseDate: payment.money_release_date || null,
        nativeState,
        isTransfer: transfer,
        liveMode: payment.live_mode !== false,
      };
    });

    const novedades = [
      approvedToday > 0 ? {
        type: 'success',
        title: `${approvedToday} pago${approvedToday === 1 ? '' : 's'} aprobado${approvedToday === 1 ? '' : 's'} hoy`,
        detail: 'Estado confirmado directamente por Mercado Pago.',
      } : null,
      stalePending > 0 ? {
        type: 'warning',
        title: `${stalePending} pago${stalePending === 1 ? '' : 's'} lleva${stalePending === 1 ? '' : 'n'} más de 24 h en proceso`,
        detail: 'El estado continúa pendiente en Mercado Pago; Fabrick no lo modifica.',
      } : null,
      failedRecent > 0 ? {
        type: 'danger',
        title: `${failedRecent} pago${failedRecent === 1 ? '' : 's'} fallido${failedRecent === 1 ? '' : 's'} en 7 días`,
        detail: 'Consulta status_detail para conocer el motivo reportado por Mercado Pago.',
      } : null,
      transfers > 0 ? {
        type: 'info',
        title: `${transfers} pago${transfers === 1 ? '' : 's'} por transferencia en la ventana actual`,
        detail: 'La clasificación proviene del tipo de pago informado por Mercado Pago.',
      } : null,
    ].filter(Boolean);

    const mode = rows.length === 0 ? 'unknown' : rows.some((row) => row.liveMode) ? 'production' : 'test';

    return NextResponse.json({
      ok: true,
      engine: 'mercadopago-readonly-mirror',
      provider: 'mercadopago',
      providerRequired: true,
      sourceOfTruth: 'mercadopago-api',
      credentialSource: credential.source,
      webhookSignatureConfigured: credential.webhookSignatureConfigured,
      mode,
      tenantId: auth.ctx.tenantId,
      paging: search.paging || { total: rows.length, limit: 50, offset: 0 },
      kpis: {
        approved,
        pending,
        failed,
        transfers,
        approvedVolume,
        netReceivedVolume,
        total: Number(search.paging?.total ?? rows.length),
      },
      novedades,
      payments: rows,
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    const message = error instanceof Error
      ? error.name === 'AbortError' ? 'Mercado Pago no respondió dentro del tiempo de seguridad.' : error.message
      : 'No se pudo consultar Mercado Pago.';
    return NextResponse.json({ error: message, code: 'MERCADOPAGO_READ_FAILED' }, { status: 502, headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }
}

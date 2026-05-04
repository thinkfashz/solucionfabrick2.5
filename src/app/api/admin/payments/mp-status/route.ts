import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import {
  fetchMercadoPagoAccount,
  getMercadoPagoAccessToken,
  probeMercadoPago,
  type MercadoPagoAccountInfo,
  type MercadoPagoStatusResult,
} from '@/lib/mercadopago';
import { getMercadoPagoCredentials } from '@/lib/mercadoPagoCredentials';
import { insforge } from '@/lib/insforge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface OrderRow {
  id: string;
  total: number | string | null;
  status: string | null;
  payment_status: string | null;
  payment_id: string | null;
  cliente_email: string | null;
  created_at: string | null;
}

interface AdminMpStatusResponse extends MercadoPagoStatusResult {
  account: MercadoPagoAccountInfo | null;
  /** Heuristic verdict from BOTH the token prefix AND the API tags. */
  verifiedMode: 'production' | 'sandbox' | 'unknown';
  kpis: {
    approved: number;
    pending: number;
    rejected: number;
    volume: number;
    sinceIso: string;
    currency: 'CLP';
  };
  recentOrders: OrderRow[];
}

/**
 * Admin-only Mercado Pago status. Includes merchant identity (email, id),
 * verified production/sandbox mode (cross-checked against `/users/me` tags)
 * and recent payment KPIs from the `orders` table.
 *
 * The public `/api/payments/mp-status` never returns this — it would leak
 * the merchant identity to anonymous shoppers.
 */
export async function GET(request: NextRequest) {
  try {
    const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
    if (!cookie?.value) {
      return NextResponse.json(
        { error: 'No autenticado.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const session = await decodeSession(cookie.value);
    if (!session) {
      return NextResponse.json(
        { error: 'Sesión inválida.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const probe = await probeMercadoPago();
    const resolved = await getMercadoPagoCredentials();
    const accessToken = resolved.accessToken ?? getMercadoPagoAccessToken();
    const account = accessToken ? await fetchMercadoPagoAccount(accessToken) : null;

    // Cross-check mode: the token prefix is one signal, but MP also tags test
    // accounts on /users/me. If either says sandbox, treat as sandbox.
    let verifiedMode: 'production' | 'sandbox' | 'unknown' = probe.mode;
    if (account?.isTestUser) verifiedMode = 'sandbox';

    // KPIs from orders in the last 7 days. Wrap in safe try/catch so MP
    // status still renders if the DB is unreachable.
    //
    // We deliberately do NOT cap the result set here: a small `.limit(N)`
    // would silently underreport approved/pending/rejected counters as soon
    // as 7-day volume crosses N, making the admin dashboard lie about real
    // payment activity. The list is also bounded by the 7-day `since`
    // filter, which is the only cap we want.
    const sinceIso = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
    const kpis = { approved: 0, pending: 0, rejected: 0, volume: 0, sinceIso, currency: 'CLP' as const };
    let recentOrders: OrderRow[] = [];
    try {
      const { data: rows } = (await insforge.database
        .from('orders')
        .select('id,total,status,payment_status,payment_id,cliente_email,created_at')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })) as { data: OrderRow[] | null };
      const all = Array.isArray(rows) ? rows : [];
      for (const o of all) {
        const ps = (o.payment_status ?? '').toLowerCase();
        if (ps === 'approved') {
          kpis.approved += 1;
          kpis.volume += Number(o.total ?? 0) || 0;
        } else if (ps === 'pending' || ps === 'in_process' || ps === 'authorized') {
          kpis.pending += 1;
        } else if (ps === 'rejected' || ps === 'cancelled' || ps === 'refunded' || ps === 'charged_back') {
          kpis.rejected += 1;
        }
      }
      recentOrders = all.slice(0, 20);
    } catch {
      // ignore — KPIs default to zero, UI will still render the gateway probe.
    }

    const body: AdminMpStatusResponse = {
      ...probe,
      account,
      verifiedMode,
      kpis,
      recentOrders,
    };

    return NextResponse.json(body, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'mp_status_error';
    return NextResponse.json(
      { error: message, code: 'mp_admin_status_failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

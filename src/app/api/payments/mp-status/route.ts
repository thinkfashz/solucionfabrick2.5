import { NextResponse } from 'next/server';
import { probeMercadoPago } from '@/lib/mercadopago';

/**
 * Real-time health probe for the Mercado Pago gateway used by the checkout
 * "secure connection" indicator (Fabrick → Mercado Pago → Banco). Returns a
 * sanitized status object derived from `probeMercadoPago()` — never the access
 * token. Only the **public** key is echoed back, since that value is meant to
 * ship to the browser anyway (it's used by the JS SDK for card tokenization).
 *
 * Behaviour:
 *   - `status: "ok"`            → token validated and gateway reachable.
 *   - `status: "unconfigured"`  → env vars missing.
 *   - `status: "invalid_token"` → MP returned 401/403 to our authenticated probe.
 *   - `status: "unreachable"`   → network/timeout error talking to MP.
 *
 * The endpoint is `force-dynamic` (we never want a cached "ok" served while
 * the upstream is down) and `Cache-Control: no-store` to keep CDNs out of it.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const result = await probeMercadoPago();
    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'mp_status_error';
    return NextResponse.json(
      {
        status: 'unreachable',
        publicKey: '',
        hasAccessToken: false,
        reachable: false,
        latencyMs: null,
        mode: 'unknown',
        tokenPrefix: '',
        message,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}

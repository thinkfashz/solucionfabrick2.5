import { NextResponse } from 'next/server';
import { probeMercadoPago } from '@/lib/mercadopago';

/**
 * Health probe for the Mercado Pago gateway used by the checkout "secure
 * connection" indicator. Returns a sanitized status object derived from
 * `probeMercadoPago()` — never the access token. Only the public key is echoed
 * back, since that value is meant to ship to the browser anyway.
 *
 * The result is cached briefly at the CDN so 100k visitors do not create 100k
 * upstream Mercado Pago probes. A 30s window is enough to protect the gateway
 * while still showing changes quickly in the checkout UI.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 30;

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' };

export async function GET() {
  try {
    const result = await probeMercadoPago();
    return NextResponse.json(result, {
      status: 200,
      headers: CACHE_HEADERS,
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
      { status: 200, headers: CACHE_HEADERS },
    );
  }
}

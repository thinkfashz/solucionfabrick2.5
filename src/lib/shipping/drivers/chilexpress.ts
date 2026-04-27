import type {
  CarrierDriver,
  CarrierQuote,
  CreateShipmentRequest,
  CreateShipmentResult,
  QuoteRequest,
  TrackingResult,
} from '../carrier';

/**
 * Chilexpress driver (epic 2).
 *
 * Reference docs:
 *   https://developers.chilexpress.cl/
 *   - rating/api/v1.0/rates/courier
 *   - geodata/api/v1.0/coverage-areas
 *   - transport-orders/api/v1.0/transport-orders
 *
 * Required env vars:
 *   CHILEXPRESS_API_KEY      — Azure APIM subscription key
 *   CHILEXPRESS_BASE_URL     — defaults to https://testservices.wschilexpress.com
 *   CHILEXPRESS_ACCOUNT      — código contractual del cliente Chilexpress
 *
 * The driver is intentionally a thin shim today: payload mapping is left as
 * TODO so that a developer with valid credentials can wire it without
 * fighting an over-specified contract. When unconfigured, it short-circuits
 * via `isConfigured()` and the `mock` driver fills the gap.
 */
const DEFAULT_BASE = 'https://testservices.wschilexpress.com';

function getApiKey(): string | undefined {
  return process.env.CHILEXPRESS_API_KEY || process.env.NEXT_PUBLIC_CHILEXPRESS_API_KEY;
}

async function chxFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('CHILEXPRESS_API_KEY no configurada');
  const base = process.env.CHILEXPRESS_BASE_URL || DEFAULT_BASE;
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Chilexpress ${path} ${res.status}: ${await res.text().catch(() => '')}`);
  return res.json();
}

export const chilexpressDriver: CarrierDriver = {
  code: 'chilexpress',
  name: 'Chilexpress',
  isConfigured: () => Boolean(getApiKey()),
  async quote(req: QuoteRequest): Promise<CarrierQuote[]> {
    if (!getApiKey()) return [];
    // TODO: map req.origin/destination to Chilexpress comuna codes (geodata API)
    // and call /rating/api/v1.0/rates/courier with the cubic weight payload.
    // For now we throw so quoteAll() records the wiring TODO without polluting
    // the merged quote list.
    void chxFetch;
    void req;
    throw new Error('chilexpress driver: rate mapping not implemented');
  },
  async createShipment(req: CreateShipmentRequest): Promise<CreateShipmentResult> {
    if (!getApiKey()) throw new Error('CHILEXPRESS_API_KEY no configurada');
    void req;
    throw new Error('chilexpress driver: createShipment not implemented');
  },
  async getTracking(trackingCode: string): Promise<TrackingResult> {
    if (!getApiKey()) {
      return { carrier: 'chilexpress', tracking_code: trackingCode, status: 'unknown', events: [] };
    }
    // TODO: GET /tracking/api/v1.0/tracking/{trackingCode}
    return { carrier: 'chilexpress', tracking_code: trackingCode, status: 'unknown', events: [] };
  },
};

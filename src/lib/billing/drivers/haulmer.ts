import {
  computeDteTotals,
  type BillingDriver,
  type DteType,
  type EmitDteRequest,
  type EmitDteResult,
  type VoidDteRequest,
} from '../provider';

/**
 * Haulmer / OpenFactura billing driver (epic 1).
 *
 * Reference: https://developers.haulmer.com/docs/openfactura
 *
 * Required env vars (production):
 *   BILLING_PROVIDER=haulmer
 *   BILLING_API_KEY            — `apikey` header for OpenFactura
 *   BILLING_RUT_EMISOR         — RUT del emisor (sin puntos, con guión)
 *   BILLING_RAZON_SOCIAL       — razón social registrada en SII
 *   BILLING_GIRO               — giro principal
 *   BILLING_DIRECCION          — dirección casa matriz
 *   BILLING_COMUNA             — comuna casa matriz
 *   BILLING_BASE_URL           — defaults to https://api.haulmer.com
 *
 * Mapping notes (left as TODO until credentials are in place):
 *   - emit DTE → POST /v2/dte/document
 *   - void → POST a credit-note (DTE 61) referring to the original folio.
 *   - PDF → GET https://libredte.cl/dte/dte_pdf/{rut}/{dte_type}/{folio}
 *
 * The driver is intentionally a thin shim that fails fast with a clear
 * message until the bodies are wired. `isConfigured()` keeps it inert when
 * the env vars are missing, so the system stays on the mock driver.
 */
function isReady(): boolean {
  return Boolean(
    process.env.BILLING_API_KEY &&
      process.env.BILLING_RUT_EMISOR &&
      process.env.BILLING_RAZON_SOCIAL,
  );
}

const DEFAULT_BASE = 'https://api.haulmer.com';

async function haulmerFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const apiKey = process.env.BILLING_API_KEY;
  if (!apiKey) throw new Error('BILLING_API_KEY no configurada');
  const base = process.env.BILLING_BASE_URL || DEFAULT_BASE;
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      apikey: apiKey,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Haulmer ${path} ${res.status}: ${await res.text().catch(() => '')}`);
  }
  return res.json();
}

export const haulmerDriver: BillingDriver = {
  code: 'haulmer',
  name: 'Haulmer (OpenFactura)',
  isConfigured: () => isReady(),
  async emitDte(req: EmitDteRequest): Promise<EmitDteResult> {
    if (!isReady()) throw new Error('Haulmer no configurado');
    void haulmerFetch;
    // TODO: build the OpenFactura `Encabezado` + `Detalle` payload from `req`
    // and POST it to /v2/dte/document. For now we throw with a clear message
    // so the route returns 503 instead of pretending to emit.
    void computeDteTotals(req);
    throw new Error('haulmer driver: emitDte payload mapping not implemented');
  },
  async voidDte(req: VoidDteRequest): Promise<EmitDteResult> {
    if (!isReady()) throw new Error('Haulmer no configurado');
    void req;
    throw new Error('haulmer driver: voidDte not implemented');
  },
  async getDtePdfUrl(folio: string, dteType: DteType): Promise<string | null> {
    if (!isReady()) return null;
    void folio;
    void dteType;
    return null;
  },
};

/**
 * Billing adapter (epic 1) — facturación electrónica SII.
 *
 * Strategy: never integrate directly with `webservices.sii.cl`. Always go
 * through a certified provider (Haulmer/OpenFactura, Bsale, Nubox, LibreDTE,
 * SimpleAPI). Each provider implements this interface; the active one is
 * picked via `BILLING_PROVIDER` env var. When unset, the `mock` driver is
 * used and emissions are simulated (no SII calls).
 *
 * DTE codes per SII:
 *   33 → Factura electrónica
 *   34 → Factura exenta
 *   39 → Boleta electrónica
 *   41 → Boleta exenta
 *   56 → Nota de débito
 *   61 → Nota de crédito
 */

export type DteType = 33 | 34 | 39 | 41 | 56 | 61;

export interface DteLineItem {
  description: string;
  quantity: number;
  unit_price: number;       // CLP, neto if affecting IVA
  exempt?: boolean;
  sku?: string;
}

export interface EmitDteRequest {
  dte_type: DteType;
  order_id: string;
  rut_receptor?: string;       // required for facturas, optional for boletas
  razon_social_receptor?: string;
  giro_receptor?: string;
  direccion_receptor?: string;
  comuna_receptor?: string;
  email_receptor?: string;
  items: DteLineItem[];
  /** Discount applied to the subtotal (CLP). Reduces neto+iva proportionally. */
  discount_clp?: number;
  /** Reference DTE for credit/debit notes (61 / 56). */
  reference?: { dte_type: DteType; folio: string; reason: string };
  metadata?: Record<string, unknown>;
}

export interface EmitDteResult {
  ok: boolean;
  provider: string;
  folio?: string;
  sii_track_id?: string;
  sii_status?: string;
  pdf_url?: string;
  xml_url?: string;
  neto: number;
  iva: number;
  exento: number;
  total: number;
  raw?: Record<string, unknown>;
  error?: string;
}

export interface VoidDteRequest {
  invoice_id: string;
  folio: string;
  dte_type: DteType;
  reason: string;
}

export interface BillingDriver {
  readonly code: string;
  readonly name: string;
  isConfigured(): boolean;
  emitDte(req: EmitDteRequest): Promise<EmitDteResult>;
  voidDte(req: VoidDteRequest): Promise<EmitDteResult>;
  getDtePdfUrl(folio: string, dteType: DteType): Promise<string | null>;
}

import { mockBillingDriver } from './drivers/mock';
import { haulmerDriver } from './drivers/haulmer';

const ALL_DRIVERS: BillingDriver[] = [haulmerDriver, mockBillingDriver];

/**
 * Pick the configured driver. Order:
 *   1. Driver matching `BILLING_PROVIDER` env var (if configured).
 *   2. First driver whose `isConfigured()` returns true.
 *   3. Mock driver (always available).
 */
export function getBillingDriver(): BillingDriver {
  const wanted = process.env.BILLING_PROVIDER?.toLowerCase();
  if (wanted) {
    const explicit = ALL_DRIVERS.find((d) => d.code === wanted);
    if (explicit && explicit.isConfigured()) return explicit;
  }
  const auto = ALL_DRIVERS.find((d) => d.code !== 'mock' && d.isConfigured());
  return auto ?? mockBillingDriver;
}

export function isBillingConfigured(): boolean {
  return getBillingDriver().code !== 'mock';
}

// ─── Pricing math (Chile: IVA 19%) ───────────────────────────────────────────

const IVA = 0.19;

export interface DteTotals {
  neto: number;
  iva: number;
  exento: number;
  total: number;
}

/**
 * Compute the line totals for a DTE. Treats `unit_price` as gross (incl. IVA)
 * for boletas (39/41) and as neto for facturas (33/34). This is the SII
 * convention used by every Chilean provider.
 */
export function computeDteTotals(req: EmitDteRequest): DteTotals {
  const isBoleta = req.dte_type === 39 || req.dte_type === 41;
  let exento = 0;
  let neto = 0;

  for (const item of req.items) {
    const lineGross = item.quantity * item.unit_price;
    if (item.exempt) {
      exento += lineGross;
      continue;
    }
    if (isBoleta) {
      // unit_price brings IVA included; back it out.
      neto += lineGross / (1 + IVA);
    } else {
      neto += lineGross;
    }
  }

  if (req.discount_clp && req.discount_clp > 0) {
    const ratio = neto > 0 ? Math.min(1, req.discount_clp / (neto * (1 + IVA) + exento)) : 0;
    neto = neto * (1 - ratio);
    exento = exento * (1 - ratio);
  }

  const ivaAmount = Math.round(neto * IVA);
  const netoR = Math.round(neto);
  const exentoR = Math.round(exento);
  return {
    neto: netoR,
    iva: ivaAmount,
    exento: exentoR,
    total: netoR + ivaAmount + exentoR,
  };
}

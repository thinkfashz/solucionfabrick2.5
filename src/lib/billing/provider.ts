/** Billing adapter for Chilean electronic tax documents (DTE). */
export type DteType = 33 | 34 | 39 | 41 | 56 | 61;

export interface DteLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  exempt?: boolean;
  sku?: string;
}

export interface EmitDteRequest {
  dte_type: DteType;
  order_id: string;
  rut_receptor?: string;
  razon_social_receptor?: string;
  giro_receptor?: string;
  direccion_receptor?: string;
  comuna_receptor?: string;
  email_receptor?: string;
  items: DteLineItem[];
  discount_clp?: number;
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
  neto_clp?: number;
  iva_clp?: number;
  exento_clp?: number;
  total_clp?: number;
  rut_receptor?: string;
  razon_social_receptor?: string;
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
import { createHaulmerDriver, haulmerDriver } from './drivers/haulmer';
import { resolveBillingCredentials } from './credentials';

const ALL_DRIVERS: BillingDriver[] = [haulmerDriver, mockBillingDriver];

/** Legacy synchronous resolver for env-only installations. */
export function getBillingDriver(): BillingDriver {
  const wanted = process.env.BILLING_PROVIDER?.toLowerCase();
  if (wanted) {
    const explicit = ALL_DRIVERS.find((d) => d.code === wanted);
    if (explicit && explicit.isConfigured()) return explicit;
  }
  const auto = ALL_DRIVERS.find((d) => d.code !== 'mock' && d.isConfigured());
  return auto ?? mockBillingDriver;
}

/**
 * Runtime resolver used by production routes. It supports encrypted Insforge
 * credentials, with env as backwards-compatible fallback.
 */
export async function getBillingDriverResolved(): Promise<BillingDriver> {
  try {
    const credentials = await resolveBillingCredentials();
    if (credentials.ready) {
      return createHaulmerDriver({
        apiKey: credentials.apiKey,
        rutEmisor: credentials.rutEmisor,
        razonSocial: credentials.razonSocial,
        giro: credentials.giro,
        direccion: credentials.direccion,
        comuna: credentials.comuna,
        baseUrl: credentials.baseUrl,
      });
    }
  } catch {
    // Fall through to the legacy/env resolver, then mock.
  }
  return getBillingDriver();
}

export function isBillingConfigured(): boolean {
  return getBillingDriver().code !== 'mock';
}

const IVA = 0.19;

export interface DteTotals {
  neto: number;
  iva: number;
  exento: number;
  total: number;
}

/**
 * Boletas receive gross prices (IVA included). Facturas receive net prices.
 * Exempt items are always represented by their final amount.
 */
export function computeDteTotals(req: EmitDteRequest): DteTotals {
  const isBoleta = req.dte_type === 39 || req.dte_type === 41;
  let exento = 0;
  let neto = 0;

  for (const item of req.items) {
    const lineAmount = item.quantity * item.unit_price;
    if (item.exempt) {
      exento += lineAmount;
      continue;
    }
    neto += isBoleta ? lineAmount / (1 + IVA) : lineAmount;
  }

  if (req.discount_clp && req.discount_clp > 0) {
    const ratio = neto > 0 ? Math.min(1, req.discount_clp / (neto * (1 + IVA) + exento)) : 0;
    neto *= 1 - ratio;
    exento *= 1 - ratio;
  }

  const netoR = Math.round(neto);
  const ivaAmount = Math.round(neto * IVA);
  const exentoR = Math.round(exento);
  return { neto: netoR, iva: ivaAmount, exento: exentoR, total: netoR + ivaAmount + exentoR };
}

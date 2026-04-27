/**
 * Shipping adapter (epic 2).
 *
 * Defines the interface that every carrier driver must implement. Drivers
 * ship under `src/lib/shipping/drivers/<carrier>.ts`. Each driver is
 * feature-flagged on its own env var; if no driver is configured the system
 * falls back to the `mock` driver so the checkout still works during local
 * development and on previews without third-party credentials.
 */

export type CarrierCode = 'chilexpress' | 'starken' | 'correoschile' | 'mock';

export interface ShippingItem {
  sku?: string;
  variant_id?: string;
  qty: number;
  weight_g?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  declared_value_clp?: number;
}

export interface ShippingAddressInput {
  region: string;
  comuna: string;
  calle?: string;
  numero?: string;
  /** Optional postal code; some carriers require it. */
  zip?: string;
}

export interface QuoteRequest {
  origin: ShippingAddressInput;
  destination: ShippingAddressInput;
  items: ShippingItem[];
}

export interface CarrierQuote {
  carrier: CarrierCode;
  service_code: string;
  service_label: string;
  cost_clp: number;
  eta_days_min: number;
  eta_days_max: number;
  /** Free-form metadata from the carrier; useful for booking the same offer later. */
  meta?: Record<string, unknown>;
}

export interface CreateShipmentRequest {
  order_id: string;
  carrier: CarrierCode;
  service_code: string;
  origin: ShippingAddressInput;
  destination: ShippingAddressInput;
  items: ShippingItem[];
  recipient_name: string;
  phone?: string;
  email?: string;
}

export interface CreateShipmentResult {
  carrier: CarrierCode;
  tracking_code: string;
  label_url?: string;
  cost_clp: number;
  eta_days?: number;
  meta?: Record<string, unknown>;
}

export interface TrackingEvent {
  status: string;
  description: string;
  occurred_at: string;
  location?: string;
}

export interface TrackingResult {
  carrier: CarrierCode;
  tracking_code: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'returned' | 'unknown';
  events: TrackingEvent[];
}

export interface CarrierDriver {
  readonly code: CarrierCode;
  readonly name: string;
  /** Returns true when the driver has all the env vars / credentials it needs. */
  isConfigured(): boolean;
  quote(req: QuoteRequest): Promise<CarrierQuote[]>;
  createShipment(req: CreateShipmentRequest): Promise<CreateShipmentResult>;
  getTracking(trackingCode: string): Promise<TrackingResult>;
}

// ─── Driver registry ─────────────────────────────────────────────────────────

import { mockDriver } from './drivers/mock';
import { chilexpressDriver } from './drivers/chilexpress';
import { starkenDriver } from './drivers/starken';
import { correoschileDriver } from './drivers/correoschile';

const ALL_DRIVERS: CarrierDriver[] = [
  chilexpressDriver,
  starkenDriver,
  correoschileDriver,
  mockDriver,
];

/** Drivers actually usable right now (configured by env or always-on mock). */
export function getActiveDrivers(): CarrierDriver[] {
  const configured = ALL_DRIVERS.filter((d) => d.code !== 'mock' && d.isConfigured());
  if (configured.length > 0) return configured;
  return [mockDriver];
}

export function getDriver(code: CarrierCode): CarrierDriver | null {
  return ALL_DRIVERS.find((d) => d.code === code) ?? null;
}

/**
 * Run `quote` against every active carrier in parallel with a per-carrier
 * timeout. Failures are swallowed and logged so a slow carrier never blocks
 * the checkout.
 */
export async function quoteAll(
  req: QuoteRequest,
  timeoutMs = 4000,
): Promise<{ quotes: CarrierQuote[]; errors: Array<{ carrier: CarrierCode; error: string }> }> {
  const drivers = getActiveDrivers();
  const errors: Array<{ carrier: CarrierCode; error: string }> = [];

  const settled = await Promise.allSettled(
    drivers.map((driver) =>
      Promise.race<CarrierQuote[]>([
        driver.quote(req),
        new Promise<CarrierQuote[]>((_, reject) =>
          setTimeout(() => reject(new Error(`timeout ${timeoutMs}ms`)), timeoutMs),
        ),
      ]).catch((err) => {
        errors.push({
          carrier: driver.code,
          error: err instanceof Error ? err.message : String(err),
        });
        return [] as CarrierQuote[];
      }),
    ),
  );

  const quotes = settled
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .sort((a, b) => a.cost_clp - b.cost_clp);

  return { quotes, errors };
}

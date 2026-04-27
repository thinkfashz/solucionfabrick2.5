import type {
  CarrierDriver,
  CreateShipmentRequest,
  CreateShipmentResult,
  QuoteRequest,
  CarrierQuote,
  TrackingResult,
} from '../carrier';

/**
 * Mock carrier driver — used as fallback when no real carrier is configured.
 *
 * Calculates a deterministic CLP cost from total weight and destination
 * region so quotes are stable across requests (good for E2E tests).
 *
 * NEVER use as a production carrier — bookings here are not real and the
 * `tracking_code` is not registered with anyone.
 */
const REGION_MULTIPLIERS: Record<string, number> = {
  // Metropolitan area cheaper, extreme regions ~2x.
  RM: 1.0,
  V: 1.1,
  VI: 1.1,
  VII: 1.15,
  VIII: 1.2,
  IX: 1.3,
  X: 1.4,
  XIV: 1.4,
  XV: 1.8,
  I: 1.6,
  II: 1.5,
  III: 1.4,
  IV: 1.2,
  XI: 2.0,
  XII: 2.0,
};

function totalWeightKg(req: QuoteRequest): number {
  const grams = req.items.reduce((acc, it) => acc + (it.weight_g ?? 1500) * (it.qty ?? 1), 0);
  return Math.max(1, grams / 1000);
}

function regionKey(region: string): string {
  return (region || '').toUpperCase().replace(/\s/g, '').slice(0, 4);
}

export const mockDriver: CarrierDriver = {
  code: 'mock',
  name: 'Estimación local (mock)',
  isConfigured: () => true,
  async quote(req: QuoteRequest): Promise<CarrierQuote[]> {
    const weight = totalWeightKg(req);
    const mult = REGION_MULTIPLIERS[regionKey(req.destination.region)] ?? 1.4;
    const baseStandard = 4500 + weight * 800;
    const baseExpress = baseStandard * 1.6;
    return [
      {
        carrier: 'mock',
        service_code: 'standard',
        service_label: 'Estándar (3-5 días)',
        cost_clp: Math.round(baseStandard * mult),
        eta_days_min: 3,
        eta_days_max: 5,
        meta: { source: 'mock', weight_kg: weight, mult },
      },
      {
        carrier: 'mock',
        service_code: 'express',
        service_label: 'Express (1-2 días)',
        cost_clp: Math.round(baseExpress * mult),
        eta_days_min: 1,
        eta_days_max: 2,
        meta: { source: 'mock', weight_kg: weight, mult },
      },
    ];
  },
  async createShipment(req: CreateShipmentRequest): Promise<CreateShipmentResult> {
    const code = `MOCK${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1e4)
      .toString(36)
      .toUpperCase()}`;
    return {
      carrier: 'mock',
      tracking_code: code,
      cost_clp: 0,
      eta_days: 4,
      meta: { warning: 'mock_driver', service_code: req.service_code, order_id: req.order_id },
    };
  },
  async getTracking(trackingCode: string): Promise<TrackingResult> {
    return {
      carrier: 'mock',
      tracking_code: trackingCode,
      status: 'in_transit',
      events: [
        {
          status: 'pickup',
          description: 'Retirado en bodega (mock)',
          occurred_at: new Date(Date.now() - 86_400_000).toISOString(),
        },
        {
          status: 'in_transit',
          description: 'En tránsito (mock)',
          occurred_at: new Date().toISOString(),
        },
      ],
    };
  },
};

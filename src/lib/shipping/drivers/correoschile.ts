import type {
  CarrierDriver,
  CarrierQuote,
  CreateShipmentRequest,
  CreateShipmentResult,
  QuoteRequest,
  TrackingResult,
} from '../carrier';

/**
 * Correos de Chile driver (epic 2). Limited public API; intended for low-cost
 * national shipments. Requires `CORREOSCHILE_USER`, `CORREOSCHILE_PASS`,
 * `CORREOSCHILE_CONTRATO`.
 */
function isReady(): boolean {
  return Boolean(process.env.CORREOSCHILE_USER && process.env.CORREOSCHILE_PASS);
}

export const correoschileDriver: CarrierDriver = {
  code: 'correoschile',
  name: 'Correos de Chile',
  isConfigured: () => isReady(),
  async quote(req: QuoteRequest): Promise<CarrierQuote[]> {
    if (!isReady()) return [];
    void req;
    throw new Error('correoschile driver: rate mapping not implemented');
  },
  async createShipment(req: CreateShipmentRequest): Promise<CreateShipmentResult> {
    if (!isReady()) throw new Error('Correos de Chile no configurado');
    void req;
    throw new Error('correoschile driver: createShipment not implemented');
  },
  async getTracking(trackingCode: string): Promise<TrackingResult> {
    return { carrier: 'correoschile', tracking_code: trackingCode, status: 'unknown', events: [] };
  },
};

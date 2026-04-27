import type {
  CarrierDriver,
  CarrierQuote,
  CreateShipmentRequest,
  CreateShipmentResult,
  QuoteRequest,
  TrackingResult,
} from '../carrier';

/**
 * Starken driver (epic 2). Uses Starken's REST API with basic auth.
 *
 * Required env vars:
 *   STARKEN_USER, STARKEN_PASS
 *   STARKEN_BASE_URL (defaults to production)
 *   STARKEN_RUT_EMISOR
 */
function isReady(): boolean {
  return Boolean(process.env.STARKEN_USER && process.env.STARKEN_PASS);
}

export const starkenDriver: CarrierDriver = {
  code: 'starken',
  name: 'Starken',
  isConfigured: () => isReady(),
  async quote(req: QuoteRequest): Promise<CarrierQuote[]> {
    if (!isReady()) return [];
    void req;
    throw new Error('starken driver: rate mapping not implemented');
  },
  async createShipment(req: CreateShipmentRequest): Promise<CreateShipmentResult> {
    if (!isReady()) throw new Error('Starken no configurado');
    void req;
    throw new Error('starken driver: createShipment not implemented');
  },
  async getTracking(trackingCode: string): Promise<TrackingResult> {
    return { carrier: 'starken', tracking_code: trackingCode, status: 'unknown', events: [] };
  },
};

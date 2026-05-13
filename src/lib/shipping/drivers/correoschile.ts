import type {
  CarrierDriver,
  CarrierQuote,
  CreateShipmentRequest,
  CreateShipmentResult,
  QuoteRequest,
  TrackingEvent,
  TrackingResult,
} from '../carrier';

/**
 * Correos de Chile driver.
 *
 * Correos exposes a limited business API for contracted clients.
 * Quotation uses their published 2024 tariff table since the rate
 * endpoint is contract-gated and changes rarely.
 * Tracking uses their public seguimiento REST endpoint.
 *
 * Required env vars:
 *   CORREOSCHILE_USER      — usuario de acceso (correos business portal)
 *   CORREOSCHILE_PASS      — contraseña
 *   CORREOSCHILE_CONTRATO  — número de contrato
 *   CORREOSCHILE_BASE_URL  — defaults to https://api.correoschile.cl
 */

const DEFAULT_BASE = 'https://api.correoschile.cl';
const TRACKING_BASE = 'https://seguimiento.correoschile.cl';

function isReady(): boolean {
  return Boolean(process.env.CORREOSCHILE_USER && process.env.CORREOSCHILE_PASS);
}
function getBase(): string {
  return (process.env.CORREOSCHILE_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, '');
}

// ─── Token management ─────────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const creds = Buffer.from(
    `${process.env.CORREOSCHILE_USER}:${process.env.CORREOSCHILE_PASS}`,
  ).toString('base64');

  const res = await fetch(`${getBase()}/auth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Correos de Chile auth ${res.status}`);

  const json = (await res.json()) as { access_token?: string; token?: string; expires_in?: number };
  const token = json.access_token ?? json.token;
  if (!token) throw new Error('Correos de Chile: no token en respuesta');

  cachedToken = token;
  tokenExpiry = Date.now() + ((json.expires_in ?? 3600) - 60) * 1000;
  return token;
}

// ─── Published tariff table (Correos de Chile 2024, CLP, domestic) ───────────
// Source: https://www.correoschile.cl/empresas/tarifas/
// Service: Carta Certificada + Encomienda
// Zones: 1=RM+V, 2=Resto, 3=Extremas (XI,XII,XV)

const ZONE_BY_REGION: Record<string, 1 | 2 | 3> = {
  RM: 1, Metropolitana: 1, V: 1, Valparaíso: 1, Valparaiso: 1,
  VI: 2, "O'Higgins": 2, VII: 2, Maule: 2, VIII: 2, Biobío: 2, Biobio: 2,
  XVI: 2, Ñuble: 2, Nuble: 2, IV: 2, Coquimbo: 2, IX: 2, Araucanía: 2,
  Araucania: 2, XIV: 2, 'Los Ríos': 2, 'Los Rios': 2, X: 2, 'Los Lagos': 2,
  III: 2, Atacama: 2, II: 2, Antofagasta: 2, I: 2, Tarapacá: 2, Tarapaca: 2,
  XV: 3, Arica: 3, 'Arica y Parinacota': 3,
  XI: 3, Aysén: 3, Aysen: 3,
  XII: 3, Magallanes: 3,
};

// [zone1, zone2, zone3] CLP per weight bracket
const WEIGHT_BRACKETS: Array<{ maxG: number; rates: [number, number, number] }> = [
  { maxG: 100,   rates: [  890, 1_050, 1_490] },
  { maxG: 250,   rates: [1_390, 1_650, 2_350] },
  { maxG: 500,   rates: [1_980, 2_350, 3_340] },
  { maxG: 1_000, rates: [2_890, 3_430, 4_870] },
  { maxG: 2_000, rates: [4_390, 5_210, 7_400] },
  { maxG: 5_000, rates: [6_890, 8_170, 11_610] },
  { maxG: 10_000, rates: [10_590, 12_560, 17_840] },
  { maxG: 20_000, rates: [15_890, 18_840, 26_770] },
  { maxG: 30_000, rates: [20_890, 24_760, 35_180] },
];

function calcRate(weightG: number, zone: 1 | 2 | 3): number {
  const bracket = WEIGHT_BRACKETS.find((b) => weightG <= b.maxG) ?? WEIGHT_BRACKETS.at(-1)!;
  return bracket.rates[zone - 1];
}

function getZone(region: string): 1 | 2 | 3 {
  return ZONE_BY_REGION[region] ?? ZONE_BY_REGION[region.trim()] ?? 2;
}

// ─── Tracking status mapping ──────────────────────────────────────────────────

function mapStatus(s: string): TrackingResult['status'] {
  const v = (s ?? '').toLowerCase();
  if (v.includes('entregado') || v.includes('delivered'))    return 'delivered';
  if (v.includes('devuelto')  || v.includes('no reclamado')) return 'returned';
  if (v.includes('recibido')  || v.includes('ingresado'))    return 'pending';
  return 'in_transit';
}

// ─── Driver ───────────────────────────────────────────────────────────────────

export const correoschileDriver: CarrierDriver = {
  code: 'correoschile',
  name: 'Correos de Chile',
  isConfigured: isReady,

  async quote(req: QuoteRequest): Promise<CarrierQuote[]> {
    if (!isReady()) return [];

    const totalG = Math.max(
      50,
      req.items.reduce((a, i) => a + (i.weight_g ?? 1500) * (i.qty ?? 1), 0),
    );
    const zone = getZone(req.destination.region);

    // Try live API first; fall through to static tariff on any error.
    try {
      const token = await getToken();
      const contrato = process.env.CORREOSCHILE_CONTRATO ?? '';
      const res = await fetch(`${getBase()}/v1/cotizacion`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contrato,
          comunaOrigen: req.origin.comuna,
          comunaDestino: req.destination.comuna,
          peso: totalG,
          largo: Math.max(10, ...req.items.map((i) => i.length_cm ?? 15)),
          ancho: Math.max(10, ...req.items.map((i) => i.width_cm ?? 15)),
          alto: Math.max(10, ...req.items.map((i) => i.height_cm ?? 15)),
        }),
        cache: 'no-store',
      });

      if (res.ok) {
        const data = (await res.json()) as {
          servicios?: Array<{ codigo: string; descripcion: string; tarifa: number; diasHabiles: number }>;
        };
        if (data.servicios?.length) {
          return data.servicios.map((s) => ({
            carrier: 'correoschile' as const,
            service_code: s.codigo,
            service_label: s.descripcion,
            cost_clp: s.tarifa,
            eta_days_min: Math.max(1, s.diasHabiles - 1),
            eta_days_max: s.diasHabiles + 1,
            meta: { source: 'api', zone },
          }));
        }
      }
    } catch {
      // Credential issue or API down — use published tariff
    }

    // Static tariff fallback
    const stdCost = calcRate(totalG, zone);
    const expCost = Math.round(stdCost * 1.5);
    const etaByZone: Record<1 | 2 | 3, [number, number]> = { 1: [3, 5], 2: [4, 7], 3: [6, 10] };
    const [etaMin, etaMax] = etaByZone[zone];

    return [
      {
        carrier: 'correoschile',
        service_code: 'CRT',
        service_label: 'Carta Certificada (Estándar)',
        cost_clp: stdCost,
        eta_days_min: etaMin,
        eta_days_max: etaMax,
        meta: { source: 'tariff_table', zone, weight_g: totalG },
      },
      {
        carrier: 'correoschile',
        service_code: 'EMS',
        service_label: 'EMS Express',
        cost_clp: expCost,
        eta_days_min: Math.max(2, etaMin - 1),
        eta_days_max: Math.max(4, etaMax - 2),
        meta: { source: 'tariff_table', zone, weight_g: totalG },
      },
    ];
  },

  async createShipment(req: CreateShipmentRequest): Promise<CreateShipmentResult> {
    if (!isReady()) throw new Error('Correos de Chile no configurado');

    const token = await getToken();
    const totalG = Math.max(50, req.items.reduce((a, i) => a + (i.weight_g ?? 1500) * (i.qty ?? 1), 0));

    const res = await fetch(`${getBase()}/v1/envio`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contrato: process.env.CORREOSCHILE_CONTRATO ?? '',
        tipoServicio: req.service_code,
        remitente: {
          comuna: req.origin.comuna,
          region: req.origin.region,
        },
        destinatario: {
          nombre: req.recipient_name,
          telefono: (req.phone ?? '').replace(/\D/g, '').slice(-9),
          email: req.email ?? '',
          direccion: `${req.destination.calle ?? 'Sin calle'} ${req.destination.numero ?? 'S/N'}`.trim(),
          comuna: req.destination.comuna,
          region: req.destination.region,
          codigoPostal: req.destination.zip ?? '',
        },
        paquete: {
          peso: totalG,
          largo: req.items[0]?.length_cm ?? 15,
          ancho: req.items[0]?.width_cm ?? 15,
          alto: req.items[0]?.height_cm ?? 15,
        },
        referencia: req.order_id,
      }),
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`Correos de Chile createShipment ${res.status}`);

    const data = (await res.json()) as {
      numeroEnvio?: string;
      codigoOT?: string;
      tarifa?: number;
    };

    const trackingCode = data.numeroEnvio ?? data.codigoOT;
    if (!trackingCode) throw new Error('Correos de Chile: sin número de envío en respuesta');

    const zone = getZone(req.destination.region);
    return {
      carrier: 'correoschile',
      tracking_code: trackingCode,
      cost_clp: data.tarifa ?? calcRate(totalG, zone),
      eta_days: 5,
    };
  },

  async getTracking(trackingCode: string): Promise<TrackingResult> {
    const base: TrackingResult = { carrier: 'correoschile', tracking_code: trackingCode, status: 'unknown', events: [] };

    try {
      // Public seguimiento endpoint (no auth required)
      const res = await fetch(
        `${TRACKING_BASE}/api/v1/seguimiento?numero=${encodeURIComponent(trackingCode)}`,
        { cache: 'no-store' },
      );
      if (!res.ok) return base;

      const data = (await res.json()) as {
        estado?: string;
        eventos?: Array<{ estado: string; descripcion: string; fecha: string; oficina?: string }>;
      };

      if (!data.eventos?.length) return base;

      const events: TrackingEvent[] = data.eventos.map((e) => ({
        status: e.estado,
        description: e.descripcion,
        occurred_at: e.fecha,
        location: e.oficina,
      }));

      return {
        carrier: 'correoschile',
        tracking_code: trackingCode,
        status: mapStatus(data.estado ?? data.eventos.at(-1)?.estado ?? ''),
        events,
      };
    } catch {
      return base;
    }
  },
};

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
 * Chilexpress driver — Chilexpress REST API (Azure APIM).
 *
 * Reference: https://developers.chilexpress.cl/
 *   GET  /geodata/api/v1.0/coverage-areas?regionCode={n}&type=DEST
 *   POST /rating/api/v1.0/rates/courier
 *   POST /transport-orders/api/v1.0/transport-orders
 *   GET  /tracking/api/v1.0/tracking/{code}
 *
 * Required env vars:
 *   CHILEXPRESS_API_KEY   — Azure APIM subscription key
 *   CHILEXPRESS_ACCOUNT   — código contractual del cliente
 *   CHILEXPRESS_BASE_URL  — defaults to production services URL
 */

const PROD_BASE = 'https://services.wschilexpress.com';
const TEST_BASE = 'https://testservices.wschilexpress.com';

function getApiKey(): string | undefined {
  return process.env.CHILEXPRESS_API_KEY;
}
function getBase(): string {
  return process.env.CHILEXPRESS_BASE_URL ?? (process.env.NODE_ENV === 'production' ? PROD_BASE : TEST_BASE);
}

async function chxFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('CHILEXPRESS_API_KEY no configurada');
  const res = await fetch(`${getBase()}${path}`, {
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

// ─── Region mapping ───────────────────────────────────────────────────────────

// Human-readable Chilean region name/roman numeral → Chilexpress regionCode (1–16).
const CHX_REGION: Record<string, string> = {
  'I': '1', 'Tarapacá': '1', 'Tarapaca': '1',
  'II': '2', 'Antofagasta': '2',
  'III': '3', 'Atacama': '3',
  'IV': '4', 'Coquimbo': '4',
  'V': '5', 'Valparaíso': '5', 'Valparaiso': '5',
  'VI': '6', "O'Higgins": '6', 'OHiggins': '6', 'Ohiggins': '6', 'Libertador': '6',
  'VII': '7', 'Maule': '7',
  'VIII': '8', 'Biobío': '8', 'Biobio': '8',
  'IX': '9', 'Araucanía': '9', 'Araucania': '9', 'La Araucanía': '9',
  'X': '10', 'Los Lagos': '10',
  'XI': '11', 'Aysén': '11', 'Aysen': '11', 'Aisen': '11',
  'XII': '12', 'Magallanes': '12',
  'RM': '13', 'Metropolitana': '13', 'Región Metropolitana': '13',
  'XIV': '14', 'Los Ríos': '14', 'Los Rios': '14',
  'XV': '15', 'Arica': '15', 'Arica y Parinacota': '15',
  '16': '16', 'XVI': '16', 'Ñuble': '16', 'Nuble': '16',
};

// Service type code → {label, etaMin, etaMax} for display purposes.
const CHX_SERVICE_META: Record<string, { label: string; etaMin: number; etaMax: number }> = {
  PSD: { label: 'Entrega mismo día',        etaMin: 0, etaMax: 1 },
  PDN: { label: 'Próximo día hábil',         etaMin: 1, etaMax: 2 },
  CER: { label: 'Estándar (2–3 días)',       etaMin: 2, etaMax: 3 },
  SDF: { label: 'Económico (3–5 días)',      etaMin: 3, etaMax: 5 },
  // Catch-all for codes not in this map
};

// Tracking status code → canonical status
function mapTrackingStatus(code: string): TrackingResult['status'] {
  const c = String(code).toLowerCase();
  if (c === '8'  || c.includes('entregado') || c.includes('delivered')) return 'delivered';
  if (c === '12' || c.includes('devuelto')  || c.includes('returned'))  return 'returned';
  if (c === '1'  || c.includes('recibido')  || c.includes('ingresado')) return 'pending';
  return 'in_transit';
}

// ─── County code resolution with in-memory cache ─────────────────────────────

type CoverageArea = { countyCode: string; countyName: string };
// keyed by Chilexpress regionCode ("13", "5", …)
const countyCache = new Map<string, CoverageArea[]>();

function normalize(s: string): string {
  return s.trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function toRegionCode(region: string): string {
  const key = normalize(region);
  for (const [k, v] of Object.entries(CHX_REGION)) {
    if (normalize(k) === key) return v;
  }
  for (const [k, v] of Object.entries(CHX_REGION)) {
    if (key.includes(normalize(k)) || normalize(k).includes(key)) return v;
  }
  return '13'; // Default RM
}

async function fetchCounties(regionCode: string): Promise<CoverageArea[]> {
  if (countyCache.has(regionCode)) return countyCache.get(regionCode)!;
  try {
    const data = await chxFetch(
      `/geodata/api/v1.0/coverage-areas?regionCode=${regionCode}&type=DEST`,
    ) as { data?: { coverageAreas?: CoverageArea[] } };
    const areas = data?.data?.coverageAreas ?? [];
    countyCache.set(regionCode, areas);
    return areas;
  } catch {
    return [];
  }
}

async function resolveCountyCode(region: string, commune: string): Promise<string> {
  const regionCode = toRegionCode(region);
  const counties = await fetchCounties(regionCode);
  const norm = normalize(commune);
  const match = counties.find((c) => {
    const name = normalize(c.countyName);
    return name === norm || name.startsWith(norm) || norm.startsWith(name.slice(0, 4));
  });
  if (match) return match.countyCode;
  // Graceful degradation: use normalized prefix (Chilexpress codes are typically 5 chars)
  return norm.replace(/\s/g, '').slice(0, 5);
}

// ─── Package helpers ──────────────────────────────────────────────────────────

function totalWeightG(req: QuoteRequest): number {
  return Math.max(
    500,
    req.items.reduce((acc, it) => acc + (it.weight_g ?? 1500) * (it.qty ?? 1), 0),
  );
}

function totalDeclaredValue(req: QuoteRequest): number {
  return Math.max(
    1000,
    req.items.reduce((acc, it) => acc + (it.declared_value_clp ?? 0) * (it.qty ?? 1), 0),
  );
}

function maxDimension(req: QuoteRequest, field: 'length_cm' | 'width_cm' | 'height_cm'): number {
  return Math.max(10, ...req.items.map((it) => it[field] ?? 15));
}

// ─── Driver ───────────────────────────────────────────────────────────────────

export const chilexpressDriver: CarrierDriver = {
  code: 'chilexpress',
  name: 'Chilexpress',
  isConfigured: () => Boolean(getApiKey()),

  async quote(req: QuoteRequest): Promise<CarrierQuote[]> {
    if (!getApiKey()) return [];

    const [originCode, destCode] = await Promise.all([
      resolveCountyCode(req.origin.region, req.origin.comuna),
      resolveCountyCode(req.destination.region, req.destination.comuna),
    ]);

    const body = {
      originCountyCode: originCode,
      destinationCountyCode: destCode,
      package: {
        serviceTypeCode: '3',
        declaredValue: totalDeclaredValue(req),
        declaredUnit: 'CLP',
        physicalWeight: totalWeightG(req),
        height: maxDimension(req, 'height_cm'),
        width: maxDimension(req, 'width_cm'),
        length: maxDimension(req, 'length_cm'),
      },
    };

    const data = await chxFetch('/rating/api/v1.0/rates/courier', {
      method: 'POST',
      body: JSON.stringify(body),
    }) as {
      statusCode: number;
      data?: {
        courierServiceOptions?: Array<{
          serviceTypeCode: string;
          serviceDescription: string;
          serviceValue: number;
          promisedDelivery?: string;
        }>;
      };
    };

    if (data.statusCode !== 0 || !data.data?.courierServiceOptions?.length) return [];

    return data.data.courierServiceOptions.map((opt) => {
      const meta = CHX_SERVICE_META[opt.serviceTypeCode] ?? { label: opt.serviceDescription, etaMin: 2, etaMax: 5 };
      return {
        carrier: 'chilexpress' as const,
        service_code: opt.serviceTypeCode,
        service_label: opt.serviceDescription || meta.label,
        cost_clp: opt.serviceValue,
        eta_days_min: meta.etaMin,
        eta_days_max: meta.etaMax,
        meta: { originCountyCode: originCode, destCountyCode: destCode, promisedDelivery: opt.promisedDelivery ?? null },
      };
    });
  },

  async createShipment(req: CreateShipmentRequest): Promise<CreateShipmentResult> {
    const account = process.env.CHILEXPRESS_ACCOUNT;
    if (!account) throw new Error('CHILEXPRESS_ACCOUNT no configurada');

    const [originCode, destCode] = await Promise.all([
      resolveCountyCode(req.origin.region, req.origin.comuna),
      resolveCountyCode(req.destination.region, req.destination.comuna),
    ]);

    const wg = Math.max(
      500,
      req.items.reduce((acc, it) => acc + (it.weight_g ?? 1500) * (it.qty ?? 1), 0),
    );

    const body = {
      header: {
        certificateNumber: 0,
        customerCardNumber: account,
        countyOfOriginCoverageCode: originCode,
        labelType: 2,
      },
      details: [
        {
          addresses: [
            {
              addressType: 'DEST',
              countyCoverageCode: destCode,
              streetName: req.destination.calle || 'Sin calle',
              streetNumber: req.destination.numero || 'S/N',
              supplement: '',
              addressee: req.recipient_name,
              phone: (req.phone ?? '').replace(/\D/g, '').slice(-9),
              email: req.email ?? '',
              isPrimary: true,
            },
          ],
          serviceTypeCode: req.service_code,
          serviceDescription: CHX_SERVICE_META[req.service_code]?.label ?? req.service_code,
          weight: String(wg),
          height: req.items[0]?.height_cm ?? 15,
          width: req.items[0]?.width_cm ?? 15,
          length: req.items[0]?.length_cm ?? 15,
          groupReference: req.order_id,
        },
      ],
    };

    const data = await chxFetch('/transport-orders/api/v1.0/transport-orders', {
      method: 'POST',
      body: JSON.stringify(body),
    }) as {
      statusCode: number;
      data?: { operationNumbers?: Array<{ id: number; externalNumber: string }> };
    };

    if (data.statusCode !== 0 || !data.data?.operationNumbers?.length) {
      throw new Error(`Chilexpress createShipment error statusCode=${data.statusCode}`);
    }

    const op = data.data.operationNumbers[0];
    return {
      carrier: 'chilexpress',
      tracking_code: op.externalNumber,
      cost_clp: 0,
      eta_days: CHX_SERVICE_META[req.service_code]?.etaMax ?? 3,
      meta: { operationId: op.id },
    };
  },

  async getTracking(trackingCode: string): Promise<TrackingResult> {
    const base: TrackingResult = { carrier: 'chilexpress', tracking_code: trackingCode, status: 'unknown', events: [] };
    if (!getApiKey()) return base;

    try {
      const data = await chxFetch(
        `/tracking/api/v1.0/tracking/${encodeURIComponent(trackingCode)}`,
      ) as {
        statusCode: number;
        data?: {
          trackingData?: Array<{
            status: string;
            statusDescription: string;
            eventDateTime: string;
            office?: string;
          }>;
        };
      };

      if (data.statusCode !== 0 || !data.data?.trackingData?.length) return base;

      const events: TrackingEvent[] = data.data.trackingData.map((e) => ({
        status: e.status,
        description: e.statusDescription,
        occurred_at: e.eventDateTime,
        location: e.office,
      }));

      const last = data.data.trackingData.at(-1)!;
      return {
        carrier: 'chilexpress',
        tracking_code: trackingCode,
        status: mapTrackingStatus(last.status),
        events,
      };
    } catch {
      return base;
    }
  },
};

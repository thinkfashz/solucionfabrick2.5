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
 * Starken driver — Starken REST API (Basic Auth + Bearer token).
 *
 * Required env vars:
 *   STARKEN_USER         — usuario de acceso API
 *   STARKEN_PASS         — contraseña de acceso API
 *   STARKEN_RUT_EMISOR   — RUT de la empresa emisora (sin puntos, con guión)
 *   STARKEN_BASE_URL     — defaults to https://api.starken.cl
 *
 * When credentials are missing or the API is unreachable, the driver returns
 * empty quotes (quoteAll falls back to mock).
 */

const DEFAULT_BASE = 'https://api.starken.cl';

function isReady(): boolean {
  return Boolean(process.env.STARKEN_USER && process.env.STARKEN_PASS);
}
function getBase(): string {
  return (process.env.STARKEN_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, '');
}

// ─── Token management ─────────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(`${getBase()}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.STARKEN_USER,
      password: process.env.STARKEN_PASS,
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Starken auth ${res.status}: ${await res.text().catch(() => '')}`);

  const json = (await res.json()) as { token?: string; access_token?: string; expires_in?: number };
  const token = json.token ?? json.access_token;
  if (!token) throw new Error('Starken auth: no token in response');

  cachedToken = token;
  tokenExpiry = Date.now() + ((json.expires_in ?? 3600) - 60) * 1000;
  return token;
}

async function starkenFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const token = await getToken();
  const res = await fetch(`${getBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Starken ${path} ${res.status}: ${await res.text().catch(() => '')}`);
  return res.json();
}

// ─── Static tariff fallback ───────────────────────────────────────────────────
// Used when the API is reachable but returns no options, or as a sanity floor.
// Rates approximate Starken's published 2024 tariff (CLP, standard service).

const REGION_ZONE: Record<string, number> = {
  RM: 1, Metropolitana: 1,
  V: 2, Valparaíso: 2, Valparaiso: 2,
  VI: 2, "O'Higgins": 2, Ohiggins: 2,
  VII: 2, Maule: 2,
  VIII: 2, Biobío: 2, Biobio: 2,
  XVI: 2, Ñuble: 2, Nuble: 2,
  IV: 3, Coquimbo: 3,
  IX: 3, Araucanía: 3, Araucania: 3,
  XIV: 3, 'Los Ríos': 3, 'Los Rios': 3,
  X: 3, 'Los Lagos': 3,
  III: 4, Atacama: 4,
  II: 4, Antofagasta: 4,
  I: 4, Tarapacá: 4, Tarapaca: 4,
  XV: 4, Arica: 4, 'Arica y Parinacota': 4,
  XI: 5, Aysén: 5, Aysen: 5,
  XII: 5, Magallanes: 5,
};

function staticQuote(req: QuoteRequest): CarrierQuote[] {
  const weightKg = Math.max(0.5, req.items.reduce((a, i) => a + (i.weight_g ?? 1500) * (i.qty ?? 1), 0) / 1000);
  const zone = REGION_ZONE[req.destination.region] ?? 3;
  // Base: 3500 CLP + 400/kg, multiplied by zone factor
  const zoneMulti = [1, 1.0, 1.2, 1.4, 1.7, 2.2][zone] ?? 1.4;
  const base = Math.round((3500 + weightKg * 400) * zoneMulti);
  const etaByZone: Record<number, [number, number]> = { 1: [1, 2], 2: [2, 3], 3: [3, 4], 4: [4, 5], 5: [6, 8] };
  const [etaMin, etaMax] = etaByZone[zone] ?? [3, 5];
  return [
    {
      carrier: 'starken',
      service_code: 'STK-STD',
      service_label: 'Starken Estándar',
      cost_clp: base,
      eta_days_min: etaMin,
      eta_days_max: etaMax,
      meta: { source: 'tariff_table', zone, weight_kg: weightKg },
    },
    {
      carrier: 'starken',
      service_code: 'STK-EXP',
      service_label: 'Starken Express',
      cost_clp: Math.round(base * 1.55),
      eta_days_min: Math.max(1, etaMin - 1),
      eta_days_max: Math.max(2, etaMax - 1),
      meta: { source: 'tariff_table', zone, weight_kg: weightKg },
    },
  ];
}

// ─── Tracking status mapping ──────────────────────────────────────────────────

function mapStatus(s: string): TrackingResult['status'] {
  const v = (s ?? '').toLowerCase();
  if (v.includes('entregado') || v.includes('delivered')) return 'delivered';
  if (v.includes('devuelto') || v.includes('returned'))   return 'returned';
  if (v.includes('recibido') || v.includes('ingresado'))  return 'pending';
  return 'in_transit';
}

// ─── Driver ───────────────────────────────────────────────────────────────────

export const starkenDriver: CarrierDriver = {
  code: 'starken',
  name: 'Starken',
  isConfigured: isReady,

  async quote(req: QuoteRequest): Promise<CarrierQuote[]> {
    if (!isReady()) return [];

    try {
      const data = await starkenFetch('/v1/cotizacion', {
        method: 'POST',
        body: JSON.stringify({
          origen: req.origin.comuna,
          destino: req.destination.comuna,
          peso: Math.max(0.5, req.items.reduce((a, i) => a + (i.weight_g ?? 1500) * (i.qty ?? 1), 0) / 1000),
          largo: Math.max(10, ...req.items.map((i) => i.length_cm ?? 15)),
          ancho: Math.max(10, ...req.items.map((i) => i.width_cm ?? 15)),
          alto: Math.max(10, ...req.items.map((i) => i.height_cm ?? 15)),
          valorDeclarado: req.items.reduce((a, i) => a + (i.declared_value_clp ?? 0) * (i.qty ?? 1), 0),
        }),
      }) as {
        servicios?: Array<{
          codigo: string;
          descripcion: string;
          tarifa: number;
          diasHabiles: number;
        }>;
      };

      if (data.servicios?.length) {
        return data.servicios.map((s) => ({
          carrier: 'starken' as const,
          service_code: s.codigo,
          service_label: s.descripcion,
          cost_clp: s.tarifa,
          eta_days_min: Math.max(1, s.diasHabiles - 1),
          eta_days_max: s.diasHabiles + 1,
          meta: { source: 'api' },
        }));
      }
    } catch {
      // API unavailable or credentials wrong — fall through to static tariff
    }

    return staticQuote(req);
  },

  async createShipment(req: CreateShipmentRequest): Promise<CreateShipmentResult> {
    if (!isReady()) throw new Error('Starken no configurado');

    const wKg = Math.max(0.5, req.items.reduce((a, i) => a + (i.weight_g ?? 1500) * (i.qty ?? 1), 0) / 1000);

    const data = await starkenFetch('/v1/envio', {
      method: 'POST',
      body: JSON.stringify({
        rutEmisor: process.env.STARKEN_RUT_EMISOR ?? '',
        servicio: req.service_code,
        remitente: {
          comuna: req.origin.comuna,
          region: req.origin.region,
        },
        destinatario: {
          nombre: req.recipient_name,
          telefono: (req.phone ?? '').replace(/\D/g, '').slice(-9),
          email: req.email ?? '',
          calle: req.destination.calle ?? 'Sin calle',
          numero: req.destination.numero ?? 'S/N',
          comuna: req.destination.comuna,
          region: req.destination.region,
        },
        bultos: [
          {
            peso: wKg,
            largo: req.items[0]?.length_cm ?? 15,
            ancho: req.items[0]?.width_cm ?? 15,
            alto: req.items[0]?.height_cm ?? 15,
          },
        ],
        referenciaCliente: req.order_id,
      }),
    }) as { numeroEnvio?: string; codigoSeguimiento?: string; tarifa?: number };

    const trackingCode = data.numeroEnvio ?? data.codigoSeguimiento;
    if (!trackingCode) throw new Error('Starken createShipment: sin número de envío en respuesta');

    return {
      carrier: 'starken',
      tracking_code: trackingCode,
      cost_clp: data.tarifa ?? 0,
      eta_days: 3,
    };
  },

  async getTracking(trackingCode: string): Promise<TrackingResult> {
    const base: TrackingResult = { carrier: 'starken', tracking_code: trackingCode, status: 'unknown', events: [] };
    if (!isReady()) return base;

    try {
      const data = await starkenFetch(
        `/v1/seguimiento/${encodeURIComponent(trackingCode)}`,
      ) as {
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
        carrier: 'starken',
        tracking_code: trackingCode,
        status: mapStatus(data.estado ?? data.eventos.at(-1)?.estado ?? ''),
        events,
      };
    } catch {
      return base;
    }
  },
};

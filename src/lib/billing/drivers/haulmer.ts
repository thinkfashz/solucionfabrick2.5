import {
  computeDteTotals,
  type BillingDriver,
  type DteType,
  type EmitDteRequest,
  type EmitDteResult,
  type VoidDteRequest,
} from '../provider';

export interface HaulmerDriverConfig {
  apiKey: string;
  rutEmisor: string;
  razonSocial: string;
  giro?: string;
  direccion?: string;
  comuna?: string;
  baseUrl?: string;
}

const DEFAULT_BASE = 'https://api.haulmer.com';

function fromEnv(): HaulmerDriverConfig {
  return {
    apiKey: process.env.BILLING_API_KEY ?? '',
    rutEmisor: process.env.BILLING_RUT_EMISOR ?? '',
    razonSocial: process.env.BILLING_RAZON_SOCIAL ?? '',
    giro: process.env.BILLING_GIRO ?? '',
    direccion: process.env.BILLING_DIRECCION ?? '',
    comuna: process.env.BILLING_COMUNA ?? '',
    baseUrl: process.env.BILLING_BASE_URL ?? DEFAULT_BASE,
  };
}

function isReady(config: HaulmerDriverConfig): boolean {
  return Boolean(config.apiKey.trim() && config.rutEmisor.trim() && config.razonSocial.trim());
}

function baseUrl(config: HaulmerDriverConfig): string {
  return (config.baseUrl || DEFAULT_BASE).replace(/\/$/, '');
}

async function haulmerFetch(config: HaulmerDriverConfig, path: string, init: RequestInit = {}): Promise<unknown> {
  if (!config.apiKey) throw new Error('BILLING_API_KEY no configurada');
  const res = await fetch(`${baseUrl(config)}${path}`, {
    ...init,
    headers: {
      apikey: config.apiKey,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Haulmer ${path} HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

type OpenFacturaPayload = {
  response: string[];
  dte: {
    Encabezado: Record<string, unknown>;
    Detalle: Record<string, unknown>[];
    Referencia?: Record<string, unknown>[];
  };
};

function buildPayload(config: HaulmerDriverConfig, req: EmitDteRequest): OpenFacturaPayload {
  const totals = computeDteTotals(req);
  const isBoleta = req.dte_type === 39 || req.dte_type === 41;
  const isExenta = req.dte_type === 34 || req.dte_type === 41;
  const today = new Date().toISOString().slice(0, 10);

  const detalle = req.items.map((item, idx) => {
    const lineAmount = item.quantity * item.unit_price;
    const lineNeto = item.exempt
      ? lineAmount
      : isBoleta
        ? lineAmount / 1.19
        : lineAmount;
    const unitNeto = Math.round(lineNeto / Math.max(1, item.quantity));
    return {
      NroLinDet: idx + 1,
      NmbItem: item.description,
      ...(item.sku ? { CodItem: item.sku } : {}),
      QtyItem: item.quantity,
      PrcItem: unitNeto,
      MontoItem: Math.round(lineNeto),
      ...(item.exempt ? { IndExe: 1 } : {}),
    };
  });

  const totalesSection: Record<string, number> = {};
  if (totals.neto > 0 && !isExenta) {
    totalesSection.MntNeto = totals.neto;
    totalesSection.TasaIVA = 19;
    totalesSection.IVA = totals.iva;
  }
  if (totals.exento > 0) totalesSection.MntExe = totals.exento;
  if (isExenta && totals.neto === 0 && totals.exento === 0) totalesSection.MntExe = totals.total;
  totalesSection.MntTotal = totals.total;

  const emisor: Record<string, string> = {
    RUTEmisor: config.rutEmisor,
    RznSoc: config.razonSocial,
  };
  if (config.giro) emisor.GiroEmis = config.giro;
  if (config.direccion) emisor.DirOrigen = config.direccion;
  if (config.comuna) emisor.CmnaOrigen = config.comuna;

  const receptor: Record<string, string> = {
    RUTRecep: req.rut_receptor ?? '66666666-6',
    RznSocRecep: req.razon_social_receptor ?? 'Consumidor Final',
  };
  if (req.giro_receptor) receptor.GiroRecep = req.giro_receptor;
  if (req.direccion_receptor) receptor.DirRecep = req.direccion_receptor;
  if (req.comuna_receptor) receptor.CmnaRecep = req.comuna_receptor;
  if (req.email_receptor) receptor.CorreoRecep = req.email_receptor;

  const encabezado: Record<string, unknown> = {
    IdDoc: {
      TipoDTE: req.dte_type,
      FchEmis: today,
      ...(!isBoleta ? { FmaPago: 1 } : {}),
    },
    Emisor: emisor,
    Receptor: receptor,
    Totales: totalesSection,
  };

  const dte: OpenFacturaPayload['dte'] = { Encabezado: encabezado, Detalle: detalle };
  if (req.reference) {
    dte.Referencia = [{
      NroLinRef: 1,
      TpoDocRef: req.reference.dte_type,
      FolioRef: req.reference.folio,
      RazonRef: req.reference.reason,
    }];
  }
  return { response: ['PDF', 'XML'], dte };
}

type HaulmerRawResponse = {
  folio?: string | number;
  pdf?: string;
  xml?: string;
  track_id?: string;
  trackid?: string;
  estado_sii?: string;
  status?: string;
  links?: { pdf?: string; xml?: string };
  [k: string]: unknown;
};

function mapSiiStatus(raw: string | undefined): string {
  const s = (raw ?? '').toUpperCase();
  if (['DOK', 'VOF', 'ACCEPTED', 'OK', 'ACEPTADO'].includes(s)) return 'accepted';
  if (['RCH', 'REJECTED', 'ERROR', 'RECHAZADO'].includes(s)) return 'rejected';
  return 'pending';
}

function normalizeResponse(raw: HaulmerRawResponse, totals: ReturnType<typeof computeDteTotals>): EmitDteResult {
  return {
    ok: true,
    provider: 'haulmer',
    folio: raw.folio !== undefined ? String(raw.folio) : undefined,
    sii_track_id: raw.track_id ?? raw.trackid ?? undefined,
    sii_status: mapSiiStatus(raw.estado_sii ?? (raw.status as string | undefined)),
    pdf_url: raw.pdf ?? raw.links?.pdf,
    xml_url: raw.xml ?? raw.links?.xml,
    neto: totals.neto,
    iva: totals.iva,
    exento: totals.exento,
    total: totals.total,
    raw: raw as Record<string, unknown>,
  };
}

export function createHaulmerDriver(config: HaulmerDriverConfig): BillingDriver {
  return {
    code: 'haulmer',
    name: 'Haulmer / OpenFactura · SII',
    isConfigured: () => isReady(config),

    async emitDte(req: EmitDteRequest): Promise<EmitDteResult> {
      if (!isReady(config)) throw new Error('Haulmer no configurado');
      const totals = computeDteTotals(req);
      const payload = buildPayload(config, req);
      const raw = await haulmerFetch(config, '/v2/dte/document', {
        method: 'POST',
        body: JSON.stringify(payload),
      }) as HaulmerRawResponse;
      return normalizeResponse(raw, totals);
    },

    async voidDte(req: VoidDteRequest): Promise<EmitDteResult> {
      if (!isReady(config)) throw new Error('Haulmer no configurado');
      const creditItems = (req.neto_clp ?? 0) > 0
        ? [{ description: `Anulación: ${req.reason}`, quantity: 1, unit_price: req.neto_clp!, exempt: false }]
        : [{ description: `Anulación: ${req.reason}`, quantity: 1, unit_price: 0 }];
      const creditReq: EmitDteRequest = {
        dte_type: 61,
        order_id: req.invoice_id,
        rut_receptor: req.rut_receptor,
        razon_social_receptor: req.razon_social_receptor,
        items: creditItems,
        reference: { dte_type: req.dte_type, folio: req.folio, reason: req.reason },
      };
      const totals = computeDteTotals(creditReq);
      const raw = await haulmerFetch(config, '/v2/dte/document', {
        method: 'POST',
        body: JSON.stringify(buildPayload(config, creditReq)),
      }) as HaulmerRawResponse;
      return normalizeResponse(raw, totals);
    },

    async getDtePdfUrl(folio: string, dteType: DteType): Promise<string | null> {
      if (!isReady(config)) return null;
      return `${baseUrl(config)}/v2/dte/document/${encodeURIComponent(config.rutEmisor)}/${dteType}/${encodeURIComponent(folio)}/pdf`;
    },
  };
}

/** Legacy env-backed driver kept for tests and backwards compatibility. */
export const haulmerDriver: BillingDriver = {
  code: 'haulmer',
  name: 'Haulmer / OpenFactura · SII',
  isConfigured: () => isReady(fromEnv()),
  emitDte: (req) => createHaulmerDriver(fromEnv()).emitDte(req),
  voidDte: (req) => createHaulmerDriver(fromEnv()).voidDte(req),
  getDtePdfUrl: (folio, dteType) => createHaulmerDriver(fromEnv()).getDtePdfUrl(folio, dteType),
};

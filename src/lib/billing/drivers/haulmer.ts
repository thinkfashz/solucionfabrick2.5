import {
  computeDteTotals,
  type BillingDriver,
  type DteType,
  type EmitDteRequest,
  type EmitDteResult,
  type VoidDteRequest,
} from '../provider';

/**
 * Haulmer / OpenFactura billing driver.
 *
 * Reference: https://developers.haulmer.com/docs/openfactura
 *
 * Required env vars:
 *   BILLING_PROVIDER=haulmer
 *   BILLING_API_KEY         — `apikey` header for OpenFactura
 *   BILLING_RUT_EMISOR      — RUT del emisor (sin puntos, con guión: 12345678-9)
 *   BILLING_RAZON_SOCIAL    — razón social registrada en SII
 *
 * Optional env vars:
 *   BILLING_GIRO            — giro principal
 *   BILLING_DIRECCION       — dirección casa matriz
 *   BILLING_COMUNA          — comuna casa matriz
 *   BILLING_BASE_URL        — defaults to https://api.haulmer.com
 */

const DEFAULT_BASE = 'https://api.haulmer.com';

function isReady(): boolean {
  return Boolean(
    process.env.BILLING_API_KEY &&
    process.env.BILLING_RUT_EMISOR &&
    process.env.BILLING_RAZON_SOCIAL,
  );
}

function getBase(): string {
  return (process.env.BILLING_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, '');
}

async function haulmerFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const apiKey = process.env.BILLING_API_KEY;
  if (!apiKey) throw new Error('BILLING_API_KEY no configurada');
  const res = await fetch(`${getBase()}${path}`, {
    ...init,
    headers: {
      apikey: apiKey,
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

// ── OpenFactura payload builder ───────────────────────────────────────────────

type OpenFacturaPayload = {
  response: string[];
  dte: {
    Encabezado: Record<string, unknown>;
    Detalle: Record<string, unknown>[];
    Referencia?: Record<string, unknown>[];
  };
};

function buildPayload(req: EmitDteRequest): OpenFacturaPayload {
  const totals = computeDteTotals(req);
  const isBoleta = req.dte_type === 39 || req.dte_type === 41;
  const isExenta = req.dte_type === 34 || req.dte_type === 41;
  const today = new Date().toISOString().slice(0, 10);

  // ── Detalle: prices always in neto per SII DTE spec ──────────────────────
  const detalle = req.items.map((item, idx) => {
    const lineGross = item.quantity * item.unit_price;
    const lineNeto = item.exempt
      ? lineGross
      : isBoleta
        ? lineGross / 1.19
        : lineGross;
    const unitNeto = Math.round(lineNeto / item.quantity);
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

  // ── Totales ───────────────────────────────────────────────────────────────
  const totalesSection: Record<string, number> = {};
  if (totals.neto > 0 && !isExenta) {
    totalesSection.MntNeto = totals.neto;
    totalesSection.TasaIVA = 19;
    totalesSection.IVA = totals.iva;
  }
  if (totals.exento > 0) totalesSection.MntExe = totals.exento;
  if (isExenta && totals.neto === 0 && totals.exento === 0) {
    totalesSection.MntExe = totals.total;
  }
  totalesSection.MntTotal = totals.total;

  // ── Emisor ────────────────────────────────────────────────────────────────
  const emisor: Record<string, string> = {
    RUTEmisor: process.env.BILLING_RUT_EMISOR ?? '',
    RznSoc: process.env.BILLING_RAZON_SOCIAL ?? '',
  };
  if (process.env.BILLING_GIRO) emisor.GiroEmis = process.env.BILLING_GIRO;
  if (process.env.BILLING_DIRECCION) emisor.DirOrigen = process.env.BILLING_DIRECCION;
  if (process.env.BILLING_COMUNA) emisor.CmnaOrigen = process.env.BILLING_COMUNA;

  // ── Receptor ──────────────────────────────────────────────────────────────
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

  const dte: OpenFacturaPayload['dte'] = {
    Encabezado: encabezado,
    Detalle: detalle,
  };

  if (req.reference) {
    dte.Referencia = [
      {
        NroLinRef: 1,
        TpoDocRef: req.reference.dte_type,
        FolioRef: req.reference.folio,
        RazonRef: req.reference.reason,
      },
    ];
  }

  return { response: ['PDF'], dte };
}

// ── Response normalization ────────────────────────────────────────────────────
// OpenFactura may return different field shapes depending on version.

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

function normalizeResponse(
  raw: HaulmerRawResponse,
  totals: ReturnType<typeof computeDteTotals>,
): EmitDteResult {
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

// ── Driver ────────────────────────────────────────────────────────────────────

export const haulmerDriver: BillingDriver = {
  code: 'haulmer',
  name: 'Haulmer (OpenFactura)',
  isConfigured: isReady,

  async emitDte(req: EmitDteRequest): Promise<EmitDteResult> {
    if (!isReady()) throw new Error('Haulmer no configurado');
    const totals = computeDteTotals(req);
    const payload = buildPayload(req);
    const raw = await haulmerFetch('/v2/dte/document', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as HaulmerRawResponse;
    return normalizeResponse(raw, totals);
  },

  async voidDte(req: VoidDteRequest): Promise<EmitDteResult> {
    if (!isReady()) throw new Error('Haulmer no configurado');

    // Void = emit DTE 61 (Nota de Crédito) referencing the original folio.
    // If the caller provides amounts, include them so the credit is complete.
    const creditItems = (req.neto_clp ?? 0) > 0
      ? [{
          description: `Anulación: ${req.reason}`,
          quantity: 1,
          unit_price: req.neto_clp!,   // net amount; factura pricing
          exempt: false,
        }]
      : [{ description: `Anulación: ${req.reason}`, quantity: 1, unit_price: 0 }];

    const creditReq: EmitDteRequest = {
      dte_type: 61,
      order_id: req.invoice_id,
      rut_receptor: req.rut_receptor,
      razon_social_receptor: req.razon_social_receptor,
      items: creditItems,
      reference: {
        dte_type: req.dte_type,
        folio: req.folio,
        reason: req.reason,
      },
    };

    const totals = computeDteTotals(creditReq);
    const payload = buildPayload(creditReq);
    const raw = await haulmerFetch('/v2/dte/document', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as HaulmerRawResponse;
    return normalizeResponse(raw, totals);
  },

  async getDtePdfUrl(folio: string, dteType: DteType): Promise<string | null> {
    if (!isReady()) return null;
    const rut = process.env.BILLING_RUT_EMISOR;
    if (!rut) return null;
    return `${getBase()}/v2/dte/document/${encodeURIComponent(rut)}/${dteType}/${encodeURIComponent(folio)}/pdf`;
  },
};

import { computeDteTotals, type BillingDriver, type EmitDteRequest, type EmitDteResult, type VoidDteRequest } from '../provider';

/**
 * Local receipt fallback. It deliberately does NOT pretend to be an SII DTE.
 * This lets paid-order flows be tested or acknowledged while the real Chilean
 * billing provider is not configured, without inventing a tax folio/track id.
 */
let counter = 0;

export const mockBillingDriver: BillingDriver = {
  code: 'mock',
  name: 'Comprobante local (sin DTE SII)',
  isConfigured: () => true,
  async emitDte(req: EmitDteRequest): Promise<EmitDteResult> {
    counter++;
    const totals = computeDteTotals(req);
    return {
      ok: true,
      provider: 'mock',
      folio: `COMPROBANTE-${req.order_id}-${counter}`,
      sii_track_id: undefined,
      sii_status: 'not_issued',
      pdf_url: undefined,
      xml_url: undefined,
      neto: totals.neto,
      iva: totals.iva,
      exento: totals.exento,
      total: totals.total,
      raw: {
        warning: 'dte_not_issued',
        document: 'comprobante_compra',
        dte_requested: req.dte_type,
        legal_note: 'No corresponde a una boleta o factura electrónica emitida ante SII.',
      },
    };
  },
  async voidDte(req: VoidDteRequest): Promise<EmitDteResult> {
    return {
      ok: false,
      provider: 'mock',
      sii_status: 'not_issued',
      neto: 0,
      iva: 0,
      exento: 0,
      total: 0,
      raw: { warning: 'no_real_dte_to_void', reference: req.folio, reason: req.reason },
      error: 'No existe un DTE real que anular: el proveedor tributario no está configurado.',
    };
  },
  async getDtePdfUrl() {
    return null;
  },
};

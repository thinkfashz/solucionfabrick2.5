import { computeDteTotals, type BillingDriver, type EmitDteRequest, type EmitDteResult, type VoidDteRequest } from '../provider';

/**
 * Mock billing driver — used when `BILLING_PROVIDER` is unset or the
 * configured provider has no credentials. Generates a deterministic local
 * folio so the rest of the system (admin UI, PDFs, links to /api/invoices)
 * can be built and end-to-end tested without paying a real provider.
 *
 * The "PDF" returned is a `data:` URL pointing at a tiny placeholder so the
 * frontend can still link to "Descargar boleta" without 404s.
 */
const PDF_PLACEHOLDER =
  'data:application/pdf;base64,JVBERi0xLjEKJcKlwrHDqwoxIDAgb2JqCjw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+CmVuZG9iagoyIDAgb2JqCjw8L1R5cGUvUGFnZXMvS2lkc1szIDAgUl0vQ291bnQgMT4+CmVuZG9iagozIDAgb2JqCjw8L1R5cGUvUGFnZS9QYXJlbnQgMiAwIFIvUmVzb3VyY2VzPDwvRm9udDw8L0YxIDQgMCBSPj4+Pi9NZWRpYUJveFswIDAgNTk1IDg0Ml0vQ29udGVudHMgNSAwIFI+PgplbmRvYmoKNCAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKNSAwIG9iago8PC9MZW5ndGggNTQ+PnN0cmVhbQpCVAovRjEgMjAgVGYKNzIgNzgwIFRkCihGYWN0dXJhIE1PQ0sgU0lJKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZgowMDAwMDAwMDA5IDAwMDAwIG4KMDAwMDAwMDA1OCAwMDAwMCBuCjAwMDAwMDAxMTEgMDAwMDAgbgowMDAwMDAwMjEyIDAwMDAwIG4KMDAwMDAwMDI3MyAwMDAwMCBuCnRyYWlsZXIKPDwvU2l6ZSA2L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMzc1CiUlRU9G';

let counter = 0;

export const mockBillingDriver: BillingDriver = {
  code: 'mock',
  name: 'Mock SII (sin emisión real)',
  isConfigured: () => true,
  async emitDte(req: EmitDteRequest): Promise<EmitDteResult> {
    counter++;
    const folio = `MOCK-${req.dte_type}-${Date.now().toString(36).toUpperCase()}-${counter}`;
    const totals = computeDteTotals(req);
    return {
      ok: true,
      provider: 'mock',
      folio,
      sii_track_id: `MOCKTRACK-${counter}`,
      sii_status: 'accepted_mock',
      pdf_url: PDF_PLACEHOLDER,
      xml_url: undefined,
      neto: totals.neto,
      iva: totals.iva,
      exento: totals.exento,
      total: totals.total,
      raw: { warning: 'mock_driver', dte_type: req.dte_type },
    };
  },
  async voidDte(req: VoidDteRequest): Promise<EmitDteResult> {
    return {
      ok: true,
      provider: 'mock',
      folio: `MOCK-NC-${Date.now().toString(36).toUpperCase()}`,
      sii_status: 'voided_mock',
      pdf_url: PDF_PLACEHOLDER,
      neto: 0,
      iva: 0,
      exento: 0,
      total: 0,
      raw: { warning: 'mock_driver', voided_folio: req.folio, reason: req.reason },
    };
  },
  async getDtePdfUrl() {
    return PDF_PLACEHOLDER;
  },
};

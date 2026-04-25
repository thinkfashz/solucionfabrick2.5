import { describe, it, expect } from 'vitest';
import { mapMercadoPagoStatusDetail, MP_STATUS_DETAIL_FALLBACK } from '@/lib/mercadopagoStatus';

describe('mapMercadoPagoStatusDetail', () => {
  it('returns the fallback message for null/undefined/empty', () => {
    expect(mapMercadoPagoStatusDetail(null)).toBe(MP_STATUS_DETAIL_FALLBACK);
    expect(mapMercadoPagoStatusDetail(undefined)).toBe(MP_STATUS_DETAIL_FALLBACK);
    expect(mapMercadoPagoStatusDetail('')).toBe(MP_STATUS_DETAIL_FALLBACK);
  });

  it('returns the fallback for unknown status_detail values', () => {
    expect(mapMercadoPagoStatusDetail('something_we_dont_handle')).toBe(MP_STATUS_DETAIL_FALLBACK);
  });

  it('returns user-friendly Spanish copy for common rejection codes', () => {
    expect(mapMercadoPagoStatusDetail('cc_rejected_bad_filled_card_number')).toMatch(/número de la tarjeta/i);
    expect(mapMercadoPagoStatusDetail('cc_rejected_bad_filled_security_code')).toMatch(/código de seguridad/i);
    expect(mapMercadoPagoStatusDetail('cc_rejected_insufficient_amount')).toMatch(/saldo/i);
    expect(mapMercadoPagoStatusDetail('cc_rejected_high_risk')).toMatch(/seguridad/i);
    expect(mapMercadoPagoStatusDetail('cc_rejected_call_for_authorize')).toMatch(/banco/i);
    expect(mapMercadoPagoStatusDetail('cc_rejected_other_reason')).toMatch(/banco/i);
  });

  it('returns approval/pending copy for non-rejection details', () => {
    expect(mapMercadoPagoStatusDetail('accredited')).toMatch(/aprobado/i);
    expect(mapMercadoPagoStatusDetail('pending_contingency')).toMatch(/procesando/i);
    expect(mapMercadoPagoStatusDetail('pending_review_manual')).toMatch(/revisando/i);
  });

  it('never throws on unexpected input', () => {
    expect(() => mapMercadoPagoStatusDetail(undefined)).not.toThrow();
    expect(() => mapMercadoPagoStatusDetail('')).not.toThrow();
  });
});

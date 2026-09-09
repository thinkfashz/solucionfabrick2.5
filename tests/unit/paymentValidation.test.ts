import { describe, expect, it } from 'vitest';
import { isTerminalPaymentFailure, validateMercadoPagoPaymentForOrder } from '@/lib/paymentValidation';

const order = { id: 'FBK-100', total: 199990, currency: 'CLP' };

function payment(overrides: Record<string, unknown> = {}) {
  return {
    status: 'approved',
    external_reference: 'FBK-100',
    transaction_amount: 199990,
    currency_id: 'CLP',
    collector_id: 12345,
    ...overrides,
  };
}

describe('validateMercadoPagoPaymentForOrder', () => {
  it('acepta únicamente un pago aprobado que coincide con pedido, monto, moneda y merchant conocido', () => {
    const result = validateMercadoPagoPaymentForOrder(order, payment(), 12345);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.checks).toEqual({ externalReference: true, amount: true, currency: true, approved: true, merchant: true });
  });

  it('rechaza monto manipulado', () => {
    const result = validateMercadoPagoPaymentForOrder(order, payment({ transaction_amount: 1 }), 12345);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('amount_mismatch');
  });

  it('rechaza moneda distinta', () => {
    const result = validateMercadoPagoPaymentForOrder(order, payment({ currency_id: 'USD' }), 12345);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('currency_mismatch');
  });

  it('rechaza external_reference distinta', () => {
    const result = validateMercadoPagoPaymentForOrder(order, payment({ external_reference: 'FBK-OTHER' }), 12345);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('external_reference_mismatch');
  });

  it('no confirma un estado que no sea approved', () => {
    const result = validateMercadoPagoPaymentForOrder(order, payment({ status: 'pending' }), 12345);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('payment_not_approved');
  });

  it('rechaza merchant diferente cuando ambos IDs están disponibles', () => {
    const result = validateMercadoPagoPaymentForOrder(order, payment({ collector_id: 999 }), 12345);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('merchant_mismatch');
  });

  it('marca merchant como no comprobable sin inventar una discrepancia cuando MP no entrega collector_id', () => {
    const result = validateMercadoPagoPaymentForOrder(order, payment({ collector_id: undefined }), 12345);
    expect(result.checks.merchant).toBeNull();
    expect(result.valid).toBe(true);
  });
});

describe('isTerminalPaymentFailure', () => {
  it.each(['rejected', 'cancelled', 'refunded', 'charged_back'])('reconoce %s como terminal', (status) => {
    expect(isTerminalPaymentFailure(status)).toBe(true);
  });
  it.each(['approved', 'pending', 'in_process', 'authorized'])('no considera %s terminal', (status) => {
    expect(isTerminalPaymentFailure(status)).toBe(false);
  });
});

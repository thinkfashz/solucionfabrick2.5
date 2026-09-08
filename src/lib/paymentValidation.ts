export type PaymentOrderSnapshot = {
  id: string;
  total: number | string | null | undefined;
  currency: string | null | undefined;
};

export type PaymentSnapshot = {
  status?: string;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
  collector_id?: string | number;
};

export type PaymentValidationResult = {
  valid: boolean;
  checks: {
    externalReference: boolean;
    amount: boolean;
    currency: boolean;
    approved: boolean;
    merchant: boolean | null;
  };
  errors: string[];
  expectedAmount: number;
  receivedAmount: number | null;
  expectedCurrency: string;
  receivedCurrency: string;
  expectedMerchantId: string | null;
  receivedMerchantId: string | null;
};

function normalizedCurrency(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

function finiteNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function validateMercadoPagoPaymentForOrder(
  order: PaymentOrderSnapshot,
  payment: PaymentSnapshot,
  expectedMerchantId?: string | number | null,
): PaymentValidationResult {
  const expectedAmount = finiteNumber(order.total) ?? 0;
  const receivedAmount = finiteNumber(payment.transaction_amount);
  const expectedCurrency = normalizedCurrency(order.currency || 'CLP');
  const receivedCurrency = normalizedCurrency(payment.currency_id);
  const expectedMerchant = expectedMerchantId == null ? null : String(expectedMerchantId);
  const receivedMerchant = payment.collector_id == null ? null : String(payment.collector_id);

  const checks = {
    externalReference: String(payment.external_reference ?? '') === String(order.id),
    amount: receivedAmount !== null && receivedAmount === expectedAmount,
    currency: Boolean(receivedCurrency) && receivedCurrency === expectedCurrency,
    approved: String(payment.status ?? '').toLowerCase() === 'approved',
    merchant: expectedMerchant && receivedMerchant ? expectedMerchant === receivedMerchant : null,
  } as const;

  const errors: string[] = [];
  if (!checks.externalReference) errors.push('external_reference_mismatch');
  if (!checks.amount) errors.push('amount_mismatch');
  if (!checks.currency) errors.push('currency_mismatch');
  if (!checks.approved) errors.push('payment_not_approved');
  if (checks.merchant === false) errors.push('merchant_mismatch');

  return {
    valid: errors.length === 0,
    checks: { ...checks },
    errors,
    expectedAmount,
    receivedAmount,
    expectedCurrency,
    receivedCurrency,
    expectedMerchantId: expectedMerchant,
    receivedMerchantId: receivedMerchant,
  };
}

export function isTerminalPaymentFailure(status?: string) {
  return ['rejected', 'cancelled', 'refunded', 'charged_back'].includes(String(status ?? '').toLowerCase());
}

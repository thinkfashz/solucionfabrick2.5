import { describe, expect, it } from 'vitest';
import { deriveCheckoutCustomerState, RESERVATION_TTL_FALLBACK_MS } from '@/lib/orders/checkoutStatus';

const NOW = Date.parse('2026-09-08T23:00:00Z');

describe('deriveCheckoutCustomerState', () => {
  it('no confirma al cliente solo porque Mercado Pago diga approved', () => {
    const result = deriveCheckoutCustomerState({ status: 'pendiente_pago', paymentStatus: 'approved', now: NOW, createdAt: NOW - 60_000 });
    expect(result.state).toBe('pending');
    expect(result.approved).toBe(false);
  });

  it('payment_review_required siempre prevalece sobre payment_status approved', () => {
    const result = deriveCheckoutCustomerState({ status: 'payment_review_required', paymentStatus: 'approved', now: NOW, createdAt: NOW - 60_000 });
    expect(result.state).toBe('review');
    expect(result.reviewRequired).toBe(true);
    expect(result.approved).toBe(false);
    expect(result.terminal).toBe(true);
  });

  it('solo confirma después de conciliación y commit de stock', () => {
    const result = deriveCheckoutCustomerState({ status: 'en_preparacion', paymentStatus: 'approved', now: NOW, createdAt: NOW - 60_000 });
    expect(result.state).toBe('approved');
    expect(result.approved).toBe(true);
  });

  it('usa el vencimiento real de reserva para marcar abandono', () => {
    const result = deriveCheckoutCustomerState({
      status: 'pendiente_pago',
      paymentStatus: 'pending',
      now: NOW,
      createdAt: NOW - 5 * 60_000,
      reservationExpiresAt: new Date(NOW - 1).toISOString(),
    });
    expect(result.state).toBe('abandoned');
    expect(result.stale).toBe(true);
  });

  it('sin expires_at usa el mismo TTL de 15 minutos que la reserva', () => {
    const createdAt = NOW - RESERVATION_TTL_FALLBACK_MS + 1_000;
    const pending = deriveCheckoutCustomerState({ status: 'pendiente_pago', paymentStatus: 'pending', now: NOW, createdAt });
    expect(pending.state).toBe('pending');

    const stale = deriveCheckoutCustomerState({ status: 'pendiente_pago', paymentStatus: 'pending', now: NOW, createdAt: NOW - RESERVATION_TTL_FALLBACK_MS - 1 });
    expect(stale.state).toBe('abandoned');
  });

  it('conserva estados terminales de rechazo y reembolso', () => {
    expect(deriveCheckoutCustomerState({ status: 'cancelada', paymentStatus: 'rejected', now: NOW }).state).toBe('failed');
    expect(deriveCheckoutCustomerState({ status: 'reembolsada', paymentStatus: 'refunded', now: NOW }).state).toBe('refunded');
  });
});

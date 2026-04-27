import { describe, it, expect } from 'vitest';
import { evaluateCoupon, pointsForOrder, maxRedeemablePoints, tierForLifetimeSpend, generateReferralCode, type CouponRow } from '../src/lib/loyalty';

const baseCoupon: CouponRow = {
  id: 'c1',
  code: 'WELCOME10',
  kind: 'percent',
  value: 10,
  min_amount: 0,
  starts_at: null,
  ends_at: null,
  max_uses: null,
  max_uses_per_user: null,
  uses_count: 0,
  active: true,
};

describe('loyalty helpers', () => {
  describe('evaluateCoupon', () => {
    it('applies a percent discount', () => {
      const r = evaluateCoupon(baseCoupon, { subtotalClp: 10_000, shippingClp: 0, userRedemptionsCount: 0 });
      expect(r.ok).toBe(true);
      expect(r.discount).toBe(1_000);
      expect(r.newTotal).toBe(9_000);
      expect(r.appliesTo).toBe('subtotal');
    });

    it('applies a fixed amount discount but never more than the subtotal', () => {
      const r = evaluateCoupon(
        { ...baseCoupon, kind: 'amount', value: 99_999 },
        { subtotalClp: 5_000, shippingClp: 0, userRedemptionsCount: 0 },
      );
      expect(r.ok).toBe(true);
      expect(r.discount).toBe(5_000);
      expect(r.newTotal).toBe(0);
    });

    it('applies free shipping to the shipping line only', () => {
      const r = evaluateCoupon(
        { ...baseCoupon, kind: 'free_shipping', value: 0 },
        { subtotalClp: 10_000, shippingClp: 4_500, userRedemptionsCount: 0 },
      );
      expect(r.ok).toBe(true);
      expect(r.discount).toBe(4_500);
      expect(r.appliesTo).toBe('shipping');
      expect(r.newTotal).toBe(10_000);
    });

    it('rejects when min_amount not met', () => {
      const r = evaluateCoupon(
        { ...baseCoupon, min_amount: 20_000 },
        { subtotalClp: 5_000, shippingClp: 0, userRedemptionsCount: 0 },
      );
      expect(r.ok).toBe(false);
      expect(r.reason).toMatch(/mínimo/);
    });

    it('rejects expired coupons', () => {
      const r = evaluateCoupon(
        { ...baseCoupon, ends_at: '2020-01-01T00:00:00Z' },
        { subtotalClp: 10_000, shippingClp: 0, userRedemptionsCount: 0 },
      );
      expect(r.ok).toBe(false);
      expect(r.reason).toMatch(/expirado/);
    });

    it('caps percent discount at 50% as a safety net', () => {
      const r = evaluateCoupon(
        { ...baseCoupon, value: 90 },
        { subtotalClp: 10_000, shippingClp: 0, userRedemptionsCount: 0 },
      );
      expect(r.ok).toBe(true);
      expect(r.discount).toBe(5_000); // 50% cap, not 90%
    });

    it('rejects when per-user max already reached', () => {
      const r = evaluateCoupon(
        { ...baseCoupon, max_uses_per_user: 1 },
        { subtotalClp: 10_000, shippingClp: 0, userRedemptionsCount: 1, userEmail: 'a@b.cl' },
      );
      expect(r.ok).toBe(false);
    });
  });

  describe('points math', () => {
    it('awards 1 point per $1.000 by default', () => {
      expect(pointsForOrder(0)).toBe(0);
      expect(pointsForOrder(999)).toBe(0);
      expect(pointsForOrder(1_000)).toBe(1);
      expect(pointsForOrder(50_500)).toBe(50);
    });

    it('caps redeemable points to 30% of subtotal', () => {
      // 50_000 subtotal × 30% = 15_000 max CLP / 10 CLP-per-point = 1_500 points cap.
      expect(maxRedeemablePoints(50_000, 9_999)).toBe(1_500);
      expect(maxRedeemablePoints(50_000, 100)).toBe(100);
    });

    it('assigns tiers from lifetime spend', () => {
      expect(tierForLifetimeSpend(0)).toBe('bronze');
      expect(tierForLifetimeSpend(500_000)).toBe('silver');
      expect(tierForLifetimeSpend(2_500_000)).toBe('gold');
    });
  });

  describe('referral codes', () => {
    it('generates an 8-char code without ambiguous chars', () => {
      const code = generateReferralCode('user@example.com');
      expect(code).toMatch(/^[A-Z2-9]{8}$/);
      expect(code).not.toMatch(/[01ILO]/);
    });

    it('is deterministic for the same seed', () => {
      const a = generateReferralCode('seed');
      const b = generateReferralCode('seed');
      expect(a).toBe(b);
    });
  });
});

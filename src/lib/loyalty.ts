/**
 * Loyalty / coupons / referrals helpers (epic 5).
 *
 * Pure functions only — no DB access here. The route handlers in
 * `src/app/api/coupons/*` and the MP webhook do the I/O and rely on these
 * helpers to keep business rules in one place.
 */

export interface CouponRow {
  id: string;
  code: string;
  kind: 'percent' | 'amount' | 'free_shipping';
  value: number;
  min_amount: number;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  max_uses_per_user: number | null;
  uses_count: number;
  active: boolean;
}

export interface CouponContext {
  subtotalClp: number;
  shippingClp: number;
  userEmail?: string | null;
  userRedemptionsCount: number;
  now?: Date;
}

export interface CouponResult {
  ok: boolean;
  reason?: string;
  /** Discount in CLP applied to the subtotal (or shipping for free_shipping). */
  discount: number;
  /** New total once the discount is applied (subtotal + shipping - discount). */
  newTotal: number;
  appliesTo: 'subtotal' | 'shipping';
}

/**
 * Pure validation + amount calculation for a coupon. Does NOT mutate any
 * counters. Caller (`/api/coupons/validate`) returns the result and is
 * responsible for inserting `coupon_redemptions` when an order is finalized.
 */
export function evaluateCoupon(coupon: CouponRow, ctx: CouponContext): CouponResult {
  const now = ctx.now ?? new Date();
  const fail = (reason: string): CouponResult => ({
    ok: false,
    reason,
    discount: 0,
    newTotal: ctx.subtotalClp + ctx.shippingClp,
    appliesTo: 'subtotal',
  });

  if (!coupon.active) return fail('cupón inactivo');
  if (coupon.starts_at && new Date(coupon.starts_at) > now) return fail('cupón aún no vigente');
  if (coupon.ends_at && new Date(coupon.ends_at) < now) return fail('cupón expirado');
  if (coupon.max_uses != null && coupon.uses_count >= coupon.max_uses) return fail('cupón agotado');
  if (
    coupon.max_uses_per_user != null &&
    ctx.userRedemptionsCount >= coupon.max_uses_per_user
  ) {
    return fail('máximo de usos por usuario alcanzado');
  }
  if (ctx.subtotalClp < coupon.min_amount) {
    return fail(`monto mínimo no alcanzado (CLP ${coupon.min_amount})`);
  }

  const REDEEM_MAX_PCT = 0.5; // hard cap to avoid 100%-discount mistakes.
  let discount = 0;
  let appliesTo: 'subtotal' | 'shipping' = 'subtotal';

  switch (coupon.kind) {
    case 'percent': {
      const pct = Math.max(0, Math.min(coupon.value, 100)) / 100;
      discount = Math.round(ctx.subtotalClp * Math.min(pct, REDEEM_MAX_PCT));
      break;
    }
    case 'amount': {
      discount = Math.min(Math.max(0, Math.round(coupon.value)), Math.round(ctx.subtotalClp));
      break;
    }
    case 'free_shipping': {
      discount = Math.round(ctx.shippingClp);
      appliesTo = 'shipping';
      break;
    }
    default:
      return fail('tipo de cupón desconocido');
  }

  if (discount <= 0) return fail('cupón sin descuento aplicable');

  const newTotal =
    appliesTo === 'shipping'
      ? ctx.subtotalClp
      : Math.max(0, ctx.subtotalClp - discount) + ctx.shippingClp;

  return { ok: true, discount, newTotal, appliesTo };
}

// ─── Loyalty points ───────────────────────────────────────────────────────────

export interface LoyaltyConfig {
  pointsPerClp: number;     // e.g. 0.001 → 1 point per $1.000
  redeemClpPerPoint: number; // e.g. 10  → 1 point = $10 descuento
  redeemMaxPct: number;     // e.g. 0.30 → up to 30% del subtotal
  pointsExpiryMonths: number;
  referralMinAmountClp: number;
  referralRewardPoints: number;
}

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  pointsPerClp: 0.001,
  redeemClpPerPoint: 10,
  redeemMaxPct: 0.3,
  pointsExpiryMonths: 12,
  referralMinAmountClp: 20_000,
  referralRewardPoints: 500,
};

/** Points earned from a paid order. Rounded down to the nearest integer. */
export function pointsForOrder(subtotalClp: number, cfg: LoyaltyConfig = DEFAULT_LOYALTY_CONFIG): number {
  if (!Number.isFinite(subtotalClp) || subtotalClp <= 0) return 0;
  return Math.max(0, Math.floor(subtotalClp * cfg.pointsPerClp));
}

/** Cap how many points the user can spend on a given order. */
export function maxRedeemablePoints(
  subtotalClp: number,
  pointsBalance: number,
  cfg: LoyaltyConfig = DEFAULT_LOYALTY_CONFIG,
): number {
  const maxClp = Math.floor(subtotalClp * cfg.redeemMaxPct);
  const maxPointsByClp = Math.floor(maxClp / cfg.redeemClpPerPoint);
  return Math.max(0, Math.min(pointsBalance, maxPointsByClp));
}

export type Tier = 'bronze' | 'silver' | 'gold';

const TIER_THRESHOLDS: Array<[number, Tier]> = [
  [2_000_000, 'gold'],
  [500_000, 'silver'],
  [0, 'bronze'],
];

export function tierForLifetimeSpend(lifetimeSpendClp: number): Tier {
  for (const [threshold, tier] of TIER_THRESHOLDS) {
    if (lifetimeSpendClp >= threshold) return tier;
  }
  return 'bronze';
}

/**
 * Generate a short, alphanumeric referral code. Avoids ambiguous chars
 * (0/O, 1/I/L) so it survives being read out loud over the phone.
 */
export function generateReferralCode(seed: string): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += alphabet[hash % alphabet.length];
    // Keep `hash` strictly within uint32 range. Bitwise XOR in JS yields a
    // signed int32 which would make subsequent `% length` produce negative
    // indices (→ alphabet[-n] = undefined). The trailing `>>> 0` coerces
    // back to uint32 so the next modulus is always non-negative.
    hash = (Math.floor(hash / alphabet.length) ^ ((hash << 1) >>> 0)) >>> 0;
    if (hash === 0) hash = (i + 1) * 2654435761; // avalanche to avoid stuck-zero loops
  }
  return code;
}

import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import { evaluateCoupon, type CouponRow } from '@/lib/loyalty';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/coupons/validate
 *
 * Validates a coupon code without consuming it. Body:
 *   { code, subtotal, shipping?, user_email? }
 *
 * Returns:
 *   200 { ok:true, discount, newTotal, appliesTo }
 *   200 { ok:false, reason } when the cupón existe pero no aplica.
 *   404 cuando el código no existe.
 *
 * The actual `coupon_redemptions` insert happens later, in the MP webhook,
 * once the order is paid. That keeps the validation idempotent.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      code?: string;
      subtotal?: number;
      shipping?: number;
      user_email?: string | null;
    };

    const code = (body.code ?? '').trim().toUpperCase();
    const subtotalClp = Number(body.subtotal);
    const shippingClp = Number(body.shipping ?? 0);

    if (!code || code.length > 32) {
      return NextResponse.json({ ok: false, error: 'code_required' }, { status: 400 });
    }
    if (!Number.isFinite(subtotalClp) || subtotalClp < 0) {
      return NextResponse.json({ ok: false, error: 'invalid_subtotal' }, { status: 400 });
    }

    const { data } = await insforge.database
      .from('coupons')
      .select(
        'id, code, kind, value, min_amount, starts_at, ends_at, max_uses, max_uses_per_user, uses_count, active',
      )
      .eq('code', code)
      .limit(1);

    const coupon = ((data ?? [])[0] ?? null) as CouponRow | null;
    if (!coupon) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    let userRedemptionsCount = 0;
    if (body.user_email && coupon.max_uses_per_user) {
      const { data: redemptions } = await insforge.database
        .from('coupon_redemptions')
        .select('id')
        .eq('coupon_id', coupon.id)
        .eq('user_email', body.user_email);
      userRedemptionsCount = (redemptions ?? []).length;
    }

    const result = evaluateCoupon(coupon, {
      subtotalClp,
      shippingClp,
      userEmail: body.user_email ?? null,
      userRedemptionsCount,
    });

    return NextResponse.json({
      ...result,
      coupon: {
        code: coupon.code,
        kind: coupon.kind,
        value: coupon.value,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'validate_failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { saveBudget, BudgetError } from '@/lib/budget';
import { getInsforgeUserFromRequest } from '@/lib/insforgeAuth';
import { v, parse, validationError } from '@/lib/validate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/quotes — persist a quote (cotización) and return its id.
 *
 * - Anonymous customers can save a quote (we capture name/email/phone in the
 *   payload). The DB row's `user_id` stays null.
 * - Logged-in customers can pass `Authorization: Bearer <accessToken>`; we
 *   validate the token server-side and use the resulting `user.id` for the
 *   row's `user_id`. Any client-supplied `userId` in the body is ignored to
 *   prevent customers from attributing quotes to other users.
 *
 * Totals are recomputed server-side from the line items.
 */
const quotesSchema = {
  lines:            v.array({ required: true, maxItems: 200 }),
  shippingCost:     v.number({ min: 0 }),
  installationCost: v.number({ min: 0 }),
  ivaRate:          v.number({ min: 0, max: 1 }),
  customer: v.object({
    shape: {
      name:   v.string({ max: 200 }),
      email:  v.email({ max: 255 }),
      phone:  v.string({ max: 30 }),
      region: v.string({ max: 100 }),
      notes:  v.string({ max: 1000 }),
    },
  }),
};

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json().catch(() => ({}));
    const result = parse(quotesSchema, raw);
    if (!result.ok) return validationError(result.errors);

    const body = result.data as {
      lines: unknown[];
      customer?: Record<string, string>;
      shippingCost?: number;
      installationCost?: number;
      ivaRate?: number;
    };

    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      return NextResponse.json(
        { error: 'El presupuesto está vacío.', code: 'EMPTY_CART' },
        { status: 400 },
      );
    }

    // Server-validated user id (never trust client-provided values).
    const user = await getInsforgeUserFromRequest(request);

    const quote = await saveBudget({
      lines: body.lines as never,
      customer: body.customer,
      shippingCost: body.shippingCost,
      installationCost: body.installationCost,
      ivaRate: body.ivaRate,
      userId: user?.id ?? null,
    });

    return NextResponse.json({ quote }, { status: 201 });
  } catch (err) {
    if (err instanceof BudgetError) {
      return NextResponse.json(
        { error: err.message, code: err.code, hint: err.hint },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : 'Error inesperado';
    return NextResponse.json(
      { error: message, code: 'QUOTE_SAVE_FAILED' },
      { status: 500 },
    );
  }
}

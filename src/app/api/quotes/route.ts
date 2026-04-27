import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { saveBudget, BudgetError } from '@/lib/budget';
import { getInsforgeUserFromRequest } from '@/lib/insforgeAuth';

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
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      lines?: unknown;
      customer?: {
        name?: string;
        email?: string;
        phone?: string;
        region?: string;
        notes?: string;
      };
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

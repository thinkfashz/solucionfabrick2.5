import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { saveBudget, BudgetError } from '@/lib/budget';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/quotes — persist a quote (cotización) and return its id.
 *
 * Anonymous customers can save a quote (we capture name/email/phone in the
 * payload). Logged-in customers can pass `userId` so it shows up in their
 * `/presupuesto/historial`. Totals are recomputed server-side.
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
      userId?: string | null;
    };

    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      return NextResponse.json(
        { error: 'El presupuesto está vacío.', code: 'EMPTY_CART' },
        { status: 400 },
      );
    }

    const quote = await saveBudget({
      lines: body.lines as never,
      customer: body.customer,
      shippingCost: body.shippingCost,
      installationCost: body.installationCost,
      ivaRate: body.ivaRate,
      userId: body.userId ?? null,
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

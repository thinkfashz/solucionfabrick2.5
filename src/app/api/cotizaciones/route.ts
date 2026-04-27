import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { saveBudget, BudgetError } from '@/lib/budget';
import { getInsforgeUserFromRequest } from '@/lib/insforgeAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/cotizaciones — Persist a service-cart quote.
 *
 * Receives the QuoteCart items (services + 3D-designer panels + materials)
 * plus the customer info, normalizes them to QuoteLine[] and reuses the
 * existing /quotes layer (saveBudget) so they end up in the `quotes` table.
 *
 * Anonymous customers (no auth header) get user_id=null. Authed customers
 * use their server-validated InsForge user id.
 */

interface IncomingItem {
  id?: string;
  kind?: string;
  title?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  refPrice?: number;
  notes?: string;
  image?: string;
  meta?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      items?: IncomingItem[];
      customer?: {
        name?: string;
        email?: string;
        phone?: string;
        region?: string;
        notes?: string;
      };
    };

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json(
        { error: 'Tu cotización está vacía.', code: 'EMPTY_CART' },
        { status: 400 },
      );
    }

    // Map QuoteCart items → QuoteLine[] expected by saveBudget.
    const lines = items.map((it) => {
      const kind = String(it.kind ?? 'service');
      const meta = (it.meta && typeof it.meta === 'object') ? it.meta : {};
      const noteParts: string[] = [];
      if (it.notes) noteParts.push(String(it.notes));
      if (Object.keys(meta).length > 0) {
        noteParts.push(
          Object.entries(meta)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(' · '),
        );
      }

      return {
        materialId: String(it.id ?? ''),
        name: String(it.title ?? 'Ítem'),
        category: kind,
        unit: typeof it.unit === 'string' ? it.unit : 'un',
        unitPrice: typeof it.refPrice === 'number' && it.refPrice >= 0 ? it.refPrice : 0,
        quantity: typeof it.quantity === 'number' && it.quantity > 0 ? it.quantity : 1,
        imageUrl: typeof it.image === 'string' ? it.image : undefined,
        // Embed extra context as part of the material note via name suffix
        notes: noteParts.length > 0 ? noteParts.join(' | ') : undefined,
      };
    });

    const user = await getInsforgeUserFromRequest(request);

    const quote = await saveBudget({
      lines: lines as never,
      customer: body.customer,
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
      { error: message, code: 'COTIZACION_SAVE_FAILED' },
      { status: 500 },
    );
  }
}

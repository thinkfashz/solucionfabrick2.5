import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { getBillingDriver } from '@/lib/billing/provider';
import type { EmitDteRequest } from '@/lib/billing/provider';
import { insforge } from '@/lib/insforge';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/billing/emit
 *
 * Emits a DTE through the configured billing provider (Haulmer or mock),
 * saves the result to the `invoices` table, and returns the full record.
 *
 * Body: EmitDteRequest (JSON)
 */
export async function POST(req: NextRequest) {
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const session = await decodeSession(cookie.value);
  if (!session) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  let body: EmitDteRequest;
  try {
    body = (await req.json()) as EmitDteRequest;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!body.dte_type || !body.order_id || !body.items?.length) {
    return NextResponse.json(
      { error: 'Faltan campos requeridos: dte_type, order_id, items' },
      { status: 422 },
    );
  }

  const driver = getBillingDriver();

  let result;
  try {
    result = await driver.emitDte(body);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al emitir DTE' },
      { status: 502 },
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? 'Proveedor rechazó el DTE' },
      { status: 502 },
    );
  }

  // Persist to invoices table
  const pdfToken = randomBytes(24).toString('base64url');
  const row = {
    order_id: body.order_id,
    dte_type: body.dte_type,
    folio: result.folio ?? null,
    rut_emisor: process.env.BILLING_RUT_EMISOR ?? null,
    rut_receptor: body.rut_receptor ?? null,
    razon_social_receptor: body.razon_social_receptor ?? null,
    giro_receptor: body.giro_receptor ?? null,
    direccion_receptor: body.direccion_receptor ?? null,
    comuna_receptor: body.comuna_receptor ?? null,
    neto: result.neto,
    iva: result.iva,
    exento: result.exento,
    total: result.total,
    xml_url: result.xml_url ?? null,
    pdf_url: result.pdf_url ?? null,
    pdf_token: pdfToken,
    sii_track_id: result.sii_track_id ?? null,
    sii_status: result.sii_status ?? 'pending',
    provider: driver.code,
    provider_payload: result.raw ?? {},
  };

  const { data: inserted, error: dbErr } = await insforge.database
    .from('invoices')
    .insert(row)
    .select()
    .single();

  if (dbErr) {
    // DTE was emitted but DB save failed — return result with a warning
    return NextResponse.json(
      { ok: true, result, warning: 'DTE emitido pero no guardado en BD', db_error: dbErr },
      { status: 207 },
    );
  }

  return NextResponse.json({ ok: true, invoice: inserted, result });
}

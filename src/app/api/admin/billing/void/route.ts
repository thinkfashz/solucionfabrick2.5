import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { getBillingDriver } from '@/lib/billing/provider';
import { insforge } from '@/lib/insforge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/billing/void
 *
 * Voids an existing invoice by emitting a Nota de Crédito (DTE 61) that
 * references the original folio. Marks the invoice as voided in the DB.
 *
 * Body: { invoice_id: string; reason: string }
 */
export async function POST(req: NextRequest) {
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const session = await decodeSession(cookie.value);
  if (!session) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  let body: { invoice_id: string; reason: string };
  try {
    body = (await req.json()) as { invoice_id: string; reason: string };
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!body.invoice_id || !body.reason?.trim()) {
    return NextResponse.json(
      { error: 'Faltan campos requeridos: invoice_id, reason' },
      { status: 422 },
    );
  }

  // Fetch original invoice from DB
  const { data: invoice, error: fetchErr } = await insforge.database
    .from('invoices')
    .select('*')
    .eq('id', body.invoice_id)
    .single();

  if (fetchErr || !invoice) {
    return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
  }

  const inv = invoice as {
    id: string;
    folio: string | null;
    dte_type: number;
    voided: boolean;
    neto: number;
    iva: number;
    exento: number;
    total: number;
    rut_receptor: string | null;
    razon_social_receptor: string | null;
  };

  if (inv.voided) {
    return NextResponse.json({ error: 'La factura ya está anulada' }, { status: 409 });
  }

  if (!inv.folio) {
    return NextResponse.json(
      { error: 'No se puede anular una factura sin folio (modo simulado sin folio)' },
      { status: 422 },
    );
  }

  const driver = getBillingDriver();

  let result;
  try {
    result = await driver.voidDte({
      invoice_id: body.invoice_id,
      folio: inv.folio,
      dte_type: inv.dte_type as 33 | 34 | 39 | 41 | 56 | 61,
      reason: body.reason,
      neto_clp: inv.neto,
      iva_clp: inv.iva,
      exento_clp: inv.exento,
      total_clp: inv.total,
      rut_receptor: inv.rut_receptor ?? undefined,
      razon_social_receptor: inv.razon_social_receptor ?? undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al anular DTE' },
      { status: 502 },
    );
  }

  // Mark original invoice as voided
  await insforge.database
    .from('invoices')
    .update({ voided: true, voided_at: new Date().toISOString() })
    .eq('id', body.invoice_id);

  // Insert credit note record
  const { data: creditNote } = await insforge.database
    .from('invoices')
    .insert({
      order_id: body.invoice_id,   // reference to original invoice
      dte_type: 61,
      folio: result.folio ?? null,
      rut_emisor: process.env.BILLING_RUT_EMISOR ?? null,
      rut_receptor: inv.rut_receptor,
      razon_social_receptor: inv.razon_social_receptor,
      neto: result.neto,
      iva: result.iva,
      exento: result.exento,
      total: result.total,
      pdf_url: result.pdf_url ?? null,
      xml_url: result.xml_url ?? null,
      sii_track_id: result.sii_track_id ?? null,
      sii_status: result.sii_status ?? 'pending',
      provider: driver.code,
      provider_payload: result.raw ?? {},
    })
    .select()
    .single();

  return NextResponse.json({ ok: true, credit_note: creditNote, result });
}

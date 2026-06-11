import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { getBillingDriver } from '@/lib/billing/provider';
import { insforge } from '@/lib/insforge';
import { ensureInvoicesTable, markInvoiceVoided } from '@/lib/billing/sql';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const session = await decodeSession(cookie.value);
  if (!session) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  const tenantId = (session as { tenant_id?: string }).tenant_id ?? '00000000-0000-0000-0000-000000000001';

  await ensureInvoicesTable();

  let body: { invoice_id: string; reason: string };
  try { body = (await req.json()) as { invoice_id: string; reason: string }; } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  if (!body.invoice_id || !body.reason?.trim()) return NextResponse.json({ error: 'Faltan campos requeridos: invoice_id, reason' }, { status: 422 });

  const { data: invoice, error: fetchErr } = await insforge.database.from('invoices').select('*').eq('id', body.invoice_id).eq('tenant_id', tenantId).single();
  if (fetchErr || !invoice) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });

  const inv = invoice as { id: string; folio: string | null; dte_type: number; voided: boolean; neto: number; iva: number; exento: number; total: number; rut_receptor: string | null; razon_social_receptor: string | null };
  if (inv.voided) return NextResponse.json({ error: 'La factura ya está anulada' }, { status: 409 });

  const driver = getBillingDriver();
  let result;
  try {
    result = await driver.voidDte({
      invoice_id: body.invoice_id,
      folio: inv.folio ?? `SIM-${body.invoice_id.slice(0, 8)}`,
      dte_type: inv.dte_type as 33 | 34 | 39 | 41 | 56 | 61,
      reason: body.reason,
      neto_clp: Number(inv.neto || 0),
      iva_clp: Number(inv.iva || 0),
      exento_clp: Number(inv.exento || 0),
      total_clp: Number(inv.total || 0),
      rut_receptor: inv.rut_receptor ?? undefined,
      razon_social_receptor: inv.razon_social_receptor ?? undefined,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error al anular DTE' }, { status: 502 });
  }

  await markInvoiceVoided(body.invoice_id);

  const { data: creditNote } = await insforge.database.from('invoices').insert({
    tenant_id: tenantId,
    order_id: body.invoice_id,
    dte_type: 61,
    folio: result.folio ?? `NC-${Date.now().toString(36).toUpperCase()}`,
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
    sii_status: result.sii_status ?? 'accepted_mock',
    provider: driver.code,
    provider_payload: result.raw ?? { reason: body.reason },
  }).select().single();

  return NextResponse.json({ ok: true, credit_note: creditNote, result });
}

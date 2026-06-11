import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { ADMIN_COOKIE_NAME, decodeSession, type AdminSessionPayload } from '@/lib/adminAuth';
import { getBillingDriver } from '@/lib/billing/provider';
import type { EmitDteRequest } from '@/lib/billing/provider';
import { insforge } from '@/lib/insforge';
import { ensureInvoicesTable } from '@/lib/billing/sql';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const session = await decodeSession(cookie.value) as AdminSessionPayload | null;
  if (!session) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  const tenantId = session.tenant_id ?? '00000000-0000-0000-0000-000000000001';

  await ensureInvoicesTable();

  let body: EmitDteRequest;
  try { body = (await req.json()) as EmitDteRequest; } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  if (!body.dte_type || !body.order_id || !body.items?.length) return NextResponse.json({ error: 'Faltan campos requeridos: dte_type, order_id, items' }, { status: 422 });

  const { data: existingInvoice } = await insforge.database.from('invoices').select('*').eq('order_id', body.order_id).eq('dte_type', body.dte_type).eq('tenant_id', tenantId).limit(1);
  if (existingInvoice && existingInvoice.length > 0) return NextResponse.json({ ok: true, invoice: existingInvoice[0], reused: true });

  const driver = getBillingDriver();
  let result;
  try { result = await driver.emitDte(body); } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : 'Error al emitir DTE' }, { status: 502 }); }
  if (!result.ok) return NextResponse.json({ error: result.error ?? 'Proveedor rechazó el DTE' }, { status: 502 });

  const pdfToken = randomBytes(24).toString('base64url');
  const row = {
    tenant_id: tenantId,
    order_id: body.order_id,
    dte_type: body.dte_type,
    folio: result.folio ?? `SIM-${Date.now().toString(36).toUpperCase()}`,
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
    sii_status: result.sii_status ?? 'accepted_mock',
    provider: driver.code,
    provider_payload: result.raw ?? {},
  };

  const { data: inserted, error: dbErr } = await insforge.database.from('invoices').insert(row).select().single();
  if (dbErr) {
    if ((dbErr as { code?: string }).code === '23505') {
      const { data: raceWinner } = await insforge.database.from('invoices').select('*').eq('order_id', body.order_id).eq('dte_type', body.dte_type).eq('tenant_id', tenantId).limit(1);
      if (raceWinner && raceWinner.length > 0) return NextResponse.json({ ok: true, invoice: raceWinner[0], reused: true });
    }
    return NextResponse.json({ ok: true, result, warning: 'DTE emitido pero no guardado en BD', db_error: dbErr }, { status: 207 });
  }

  return NextResponse.json({ ok: true, invoice: inserted, result });
}

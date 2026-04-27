import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/invoices/[id]/pdf?token=...
 *
 * Public endpoint (no admin session required) that redirects to the PDF
 * stored by the billing provider. Access is gated by the per-invoice
 * `pdf_token` so links can be safely shared by email/whatsapp without leaking
 * other invoices.
 *
 * The token is a random opaque string generated when the invoice is emitted;
 * we never derive it from `id` so it cannot be brute-forced.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = new URL(request.url).searchParams.get('token') ?? '';
    if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

    const { data } = await insforge.database
      .from('invoices')
      .select('id, pdf_url, pdf_token, voided')
      .eq('id', id)
      .limit(1);

    const invoice = (data ?? [])[0] as
      | { id: string; pdf_url: string | null; pdf_token: string | null; voided: boolean }
      | undefined;

    if (!invoice) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (!invoice.pdf_url) return NextResponse.json({ error: 'pdf_not_ready' }, { status: 404 });
    if (invoice.pdf_token && invoice.pdf_token !== token) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    return NextResponse.redirect(invoice.pdf_url, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'pdf_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

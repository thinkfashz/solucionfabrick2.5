import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { listInvoices } from '@/lib/billing/sql';
import { getBillingDriver } from '@/lib/billing/provider';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const session = await decodeSession(cookie.value);
  if (!session) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  try {
    const invoices = await listInvoices(250);
    const driver = getBillingDriver();
    return NextResponse.json({
      ok: true,
      invoices,
      provider: {
        code: driver.code,
        configured: driver.code !== 'mock',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudieron cargar las facturas' }, { status: 500 });
  }
}

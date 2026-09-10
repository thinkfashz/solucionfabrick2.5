import { NextResponse, type NextRequest } from 'next/server';
import { getInsforgeUserFromRequest } from '@/lib/insforgeAuth';
import { insforgeAdmin } from '@/lib/insforge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;
const ORDER_SELECT = 'id, customer_name, customer_email, items, subtotal, total, currency, status, created_at, updated_at, payment_id, payment_status, shipping_address, region, customer_phone, tax, shipping_fee';

export async function GET(request: NextRequest) {
  const user = await getInsforgeUserFromRequest(request);
  if (!user?.email) return NextResponse.json({ error: 'No autenticado.' }, { status: 401, headers: NO_STORE });

  const email = user.email.trim().toLowerCase();
  try {
    const { data, error } = await insforgeAdmin.database
      .from('orders')
      .select(ORDER_SELECT)
      .eq('customer_email', email)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message || 'No se pudo consultar el historial.');
    return NextResponse.json({ orders: Array.isArray(data) ? data : [] }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: 'No se pudo consultar tu historial de compras.' }, { status: 500, headers: NO_STORE });
  }
}

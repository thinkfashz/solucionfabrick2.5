import { NextResponse, type NextRequest } from 'next/server';
import { getInsforgeUserFromRequest } from '@/lib/insforgeAuth';
import { getCustomerAccountBundle } from '@/lib/customerData';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const user = await getInsforgeUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  try {
    const bundle = await getCustomerAccountBundle(user.id, user.email);
    return NextResponse.json({ consent: bundle.consent }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'No se pudo consultar el consentimiento.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

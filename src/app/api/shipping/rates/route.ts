import { NextResponse } from 'next/server';
import { getShippingConfig } from '@/lib/shippingServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const config = await getShippingConfig();
  return NextResponse.json(config, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

import { NextResponse } from 'next/server';
import { getPublicVapidKey } from '@/lib/push';

export const runtime = 'nodejs';

export function GET() {
  const key = getPublicVapidKey();
  if (!key) {
    return NextResponse.json({ enabled: false, publicKey: null }, { status: 200 });
  }
  return NextResponse.json({ enabled: true, publicKey: key }, { status: 200 });
}

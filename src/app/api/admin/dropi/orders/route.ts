export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { createDropiFulfillment } from '@/lib/dropi';

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  let body: { orderId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const orderId = String(body.orderId ?? '').trim();
  if (!orderId) return NextResponse.json({ error: 'orderId es requerido.' }, { status: 400 });

  const result = await createDropiFulfillment(orderId);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

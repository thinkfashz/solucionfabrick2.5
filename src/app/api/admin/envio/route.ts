import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { DEFAULT_SHIPPING_CONFIG, normalizeShippingConfig } from '@/lib/shipping';
import { getShippingConfig, saveShippingConfig } from '@/lib/shippingServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'read' });
  if (!auth.ok) return auth.response;
  const config = await getShippingConfig();
  return NextResponse.json(config, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'update' });
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
  const saved = await saveShippingConfig({ ...normalizeShippingConfig(body), updatedAt: new Date().toISOString() });
  return NextResponse.json(saved);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'update' });
  if (!auth.ok) return auth.response;
  const mode = new URL(request.url).searchParams.get('mode') === 'production' ? 'production' : 'test';
  const saved = await saveShippingConfig({ ...DEFAULT_SHIPPING_CONFIG, mode, updatedAt: new Date().toISOString() });
  return NextResponse.json(saved);
}

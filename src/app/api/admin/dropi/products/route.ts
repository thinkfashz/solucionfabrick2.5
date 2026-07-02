export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { fetchDropiProducts, importDropiProducts } from '@/lib/dropi';

function readLimit(request: NextRequest) {
  const raw = Number(new URL(request.url).searchParams.get('limit') ?? 40);
  return Math.max(1, Math.min(Number.isFinite(raw) ? raw : 40, 100));
}

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();
  try {
    const products = await fetchDropiProducts(readLimit(request));
    return NextResponse.json({ ok: true, products, total: products.length });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'No se pudieron leer productos Dropi.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();
  let body: { limit?: number; dryRun?: boolean } = {};
  try { body = await request.json(); } catch { body = {}; }
  try {
    const limit = Math.max(1, Math.min(Number(body.limit ?? 40) || 40, 100));
    const result = await importDropiProducts(limit, Boolean(body.dryRun));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'No se pudieron importar productos Dropi.' }, { status: 500 });
  }
}

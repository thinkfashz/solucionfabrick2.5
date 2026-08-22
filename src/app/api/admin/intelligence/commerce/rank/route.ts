import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';
import { DEFAULT_TENANT_ID } from '@/lib/tenant';
import { rankCommerceCandidates, type CommerceCandidate, type ExistingCatalogProduct } from '@/lib/fabrickCommerceAgent';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

async function getSession(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return decodeSession(cookie).catch(() => null);
}

function sanitizeCandidates(value: unknown): CommerceCandidate[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).map((item) => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const specs = row.specifications && typeof row.specifications === 'object' && !Array.isArray(row.specifications)
      ? row.specifications as Record<string, unknown>
      : null;
    return {
      name: String(row.name ?? row.nombre ?? '').trim().slice(0, 240),
      description: String(row.description ?? row.descripcion ?? '').trim().slice(0, 5000) || null,
      supplier: String(row.supplier ?? row.proveedor ?? row.source ?? '').trim().slice(0, 240) || null,
      supplierUrl: String(row.supplierUrl ?? row.supplier_url ?? row.url_proveedor ?? row.source_url ?? '').trim().slice(0, 2000) || null,
      supplierPrice: Math.max(0, Number(row.supplierPrice ?? row.supplier_price ?? row.precio_proveedor ?? row.cost ?? 0) || 0),
      marketPrice: Math.max(0, Number(row.marketPrice ?? row.market_price ?? row.precio_mercado ?? row.price ?? row.precio ?? 0) || 0) || null,
      stock: row.stock == null ? null : Math.max(0, Math.floor(Number(row.stock) || 0)),
      imageUrl: String(row.imageUrl ?? row.image_url ?? row.image ?? row.imagen_url ?? '').trim().slice(0, 2000) || null,
      category: String(row.category ?? row.categoria ?? '').trim().slice(0, 240) || null,
      specifications: specs,
    };
  }).filter((item) => item.name && item.supplierPrice > 0);
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: NO_STORE });
  if ((session.rol || 'viewer') === 'viewer') return NextResponse.json({ error: 'El rol viewer solo puede consultar analítica.' }, { status: 403, headers: NO_STORE });

  let body: { candidates?: unknown; markupPercent?: number; minimumMarginPercent?: number };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400, headers: NO_STORE });
  }

  const candidates = sanitizeCandidates(body.candidates);
  if (!candidates.length) return NextResponse.json({ error: 'Agrega al menos un candidato con nombre y costo proveedor.' }, { status: 422, headers: NO_STORE });

  const tenantId = session.tenant_id || DEFAULT_TENANT_ID;
  try {
    const { data, error } = await insforgeAdmin.database
      .from('products')
      .select('id,name,supplier_price,price')
      .eq('tenant_id', tenantId)
      .limit(2000);
    if (error) throw new Error(error.message);
    const catalog = (Array.isArray(data) ? data : []) as ExistingCatalogProduct[];
    const ranked = rankCommerceCandidates(candidates, catalog, {
      markupPercent: Math.max(0, Math.min(300, Number(body.markupPercent ?? 30) || 30)),
      minimumMarginPercent: Math.max(0, Math.min(90, Number(body.minimumMarginPercent ?? 25) || 25)),
    });
    return NextResponse.json({
      ok: true,
      mode: 'rank-only',
      tenantId,
      received: candidates.length,
      catalogCompared: catalog.length,
      ranked: ranked.slice(0, 4),
      note: 'Los candidatos se comparan contra el catálogo del tenant. Ningún producto se publica desde este endpoint.',
    }, { headers: NO_STORE });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo analizar el catálogo.' }, { status: 503, headers: NO_STORE });
  }
}

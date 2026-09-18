import { createHash } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';
import { getAdminTenantId } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';
const PUBLIC_FIELDS = 'id,product_id,author_name,rating,body,verified_purchase,featured,admin_reply,created_at,published_at';
const ADMIN_FIELDS = 'id,tenant_id,product_id,author_name,author_email,rating,body,status,verified_purchase,featured,admin_reply,analysis,created_at,updated_at,published_at';

type ReviewStatus = 'pending' | 'published' | 'archived';

function cleanText(value: unknown, max: number) {
  return String(value ?? '').trim().replace(/[<>]/g, '').slice(0, max);
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function clientHash(request: NextRequest) {
  const raw = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const salt = process.env.ADMIN_SESSION_SECRET || 'fabrick-product-reviews';
  return createHash('sha256').update(`${salt}:${raw}`).digest('hex');
}

async function adminSession(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return cookie ? decodeSession(cookie) : null;
}

function tenantFromPublicRequest(request: NextRequest) {
  return request.headers.get('x-tenant-id') || DEFAULT_TENANT;
}

function dbFailure(error: unknown, fallback: string) {
  const message = typeof error === 'object' && error && 'message' in error ? String((error as { message?: unknown }).message || '') : String(error || '');
  console.error('[product-reviews] database operation failed:', message.slice(0, 1000));
  return NextResponse.json({ error: fallback, code: 'REVIEWS_STORAGE_UNAVAILABLE' }, { status: 503 });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const scope = url.searchParams.get('scope');
  const productId = cleanText(url.searchParams.get('product'), 80);
  const isAdmin = scope === 'admin';

  const session = isAdmin ? await adminSession(request) : null;
  if (isAdmin && !session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!isAdmin && !validUuid(productId)) return NextResponse.json({ reviews: [] }, { headers: { 'Cache-Control': 'no-store' } });

  const tenantId = isAdmin ? await getAdminTenantId(request) : tenantFromPublicRequest(request);

  try {
    let query = insforgeAdmin.database
      .from('product_reviews')
      .select(isAdmin ? ADMIN_FIELDS : PUBLIC_FIELDS)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(isAdmin ? 250 : 40);

    if (validUuid(productId)) query = query.eq('product_id', productId);
    if (!isAdmin) query = query.eq('status', 'published');

    const { data, error } = await query;
    if (error) return dbFailure(error, 'Las opiniones no están disponibles por el momento.');
    const reviews = Array.isArray(data) ? data : [];

    if (!isAdmin || reviews.length === 0) {
      return NextResponse.json({ reviews }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const productIds = Array.from(new Set(reviews.map((review) => String((review as { product_id?: unknown }).product_id || '')).filter(validUuid)));
    const productMap = new Map<string, { name: string; image_url: string | null }>();
    if (productIds.length) {
      const { data: products } = await insforgeAdmin.database
        .from('products')
        .select('id,name,image_url')
        .eq('tenant_id', tenantId)
        .in('id', productIds);
      for (const product of Array.isArray(products) ? products : []) {
        const row = product as { id?: unknown; name?: unknown; image_url?: unknown };
        const id = String(row.id || '');
        if (id) productMap.set(id, { name: String(row.name || 'Producto'), image_url: typeof row.image_url === 'string' ? row.image_url : null });
      }
    }

    return NextResponse.json({
      reviews: reviews.map((review) => {
        const product = productMap.get(String((review as { product_id?: unknown }).product_id || ''));
        return {
          ...review,
          product_name: product?.name || 'Producto',
          product_image_url: product?.image_url || null,
        };
      }),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return dbFailure(error, 'Las opiniones no están disponibles por el momento.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
    if (cleanText(payload.website, 180)) return NextResponse.json({ ok: true, status: 'pending' }, { status: 201 });

    const productId = cleanText(payload.productId, 80);
    const authorName = cleanText(payload.name, 80);
    const authorEmail = cleanText(payload.email, 140).toLowerCase();
    const body = cleanText(payload.body, 1200);
    const rating = Math.min(5, Math.max(1, Math.round(Number(payload.rating) || 5)));
    if (!validUuid(productId)) return NextResponse.json({ error: 'Producto inválido.' }, { status: 400 });
    if (authorName.length < 2) return NextResponse.json({ error: 'Escribe un nombre válido.' }, { status: 400 });
    if (body.length < 8) return NextResponse.json({ error: 'Cuéntanos un poco más sobre tu experiencia.' }, { status: 400 });
    if (!validEmail(authorEmail)) return NextResponse.json({ error: 'El correo no tiene un formato válido.' }, { status: 400 });

    const tenantId = tenantFromPublicRequest(request);
    const { data: productRows, error: productError } = await insforgeAdmin.database
      .from('products')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', productId)
      .limit(1);
    if (productError) return dbFailure(productError, 'No se pudo validar el producto.');
    if (!Array.isArray(productRows) || !productRows[0]) return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });

    const ipHash = clientHash(request);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recent, error: recentError } = await insforgeAdmin.database
      .from('product_reviews')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('ip_hash', ipHash)
      .gte('created_at', oneHourAgo)
      .limit(5);
    if (recentError) return dbFailure(recentError, 'No se pudo validar el envío.');
    if (Array.isArray(recent) && recent.length >= 4) return NextResponse.json({ error: 'Has enviado varias opiniones recientemente. Intenta más tarde.' }, { status: 429 });

    const { data, error } = await insforgeAdmin.database.from('product_reviews').insert([{
      tenant_id: tenantId,
      product_id: productId,
      author_name: authorName,
      author_email: authorEmail || null,
      rating,
      body,
      status: 'pending',
      verified_purchase: false,
      ip_hash: ipHash,
      updated_at: new Date().toISOString(),
    }]).select('id,status').limit(1);
    if (error) return dbFailure(error, 'No se pudo guardar la opinión.');
    const row = Array.isArray(data) ? data[0] : null;
    return NextResponse.json({ ok: true, id: row?.id || null, status: row?.status || 'pending' }, { status: 201 });
  } catch (error) {
    return dbFailure(error, 'No se pudo guardar la opinión.');
  }
}

export async function PATCH(request: NextRequest) {
  const session = await adminSession(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const tenantId = await getAdminTenantId(request);

  try {
    const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
    const id = cleanText(payload.id, 80);
    const status = cleanText(payload.status, 20) as ReviewStatus;
    const adminReply = cleanText(payload.adminReply, 1200);
    if (!validUuid(id)) return NextResponse.json({ error: 'Opinión inválida.' }, { status: 400 });
    if (status && !['pending', 'published', 'archived'].includes(status)) return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });

    const now = new Date().toISOString();
    const update: Record<string, unknown> = { updated_at: now };
    if (status) {
      update.status = status;
      update.published_at = status === 'published' ? now : null;
    }
    if (typeof payload.verifiedPurchase === 'boolean') update.verified_purchase = payload.verifiedPurchase;
    if (typeof payload.featured === 'boolean') update.featured = payload.featured;
    if ('adminReply' in payload) update.admin_reply = adminReply || null;
    if (payload.analysis && typeof payload.analysis === 'object' && !Array.isArray(payload.analysis)) update.analysis = payload.analysis;
    const { data, error } = await insforgeAdmin.database
      .from('product_reviews')
      .update(update)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select(ADMIN_FIELDS)
      .limit(1);
    if (error) return dbFailure(error, 'No se pudo actualizar la opinión.');
    const review = Array.isArray(data) ? data[0] : null;
    if (!review) return NextResponse.json({ error: 'Opinión no encontrada.' }, { status: 404 });
    return NextResponse.json({ ok: true, review });
  } catch (error) {
    return dbFailure(error, 'No se pudo actualizar la opinión.');
  }
}

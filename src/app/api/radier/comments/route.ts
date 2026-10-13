import { createHash } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';
import { DEFAULT_TENANT, ensureRadierCommentsTable } from '@/lib/radierDb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_PUBLIC_COMMENTS = 60;
const PAGE_SLUG = 'radier';
const PUBLIC_FIELDS = 'id,author_name,kind,body,admin_reply,created_at,published_at';
const ADMIN_FIELDS = 'id,tenant_id,page_slug,author_name,author_email,kind,body,status,admin_reply,created_at,updated_at,published_at';

type CommentKind = 'comment' | 'suggestion';
type CommentStatus = 'pending' | 'published' | 'archived';

type SubmitPayload = {
  name?: unknown;
  email?: unknown;
  kind?: unknown;
  body?: unknown;
  website?: unknown;
};

type PatchPayload = { id?: unknown; status?: unknown; adminReply?: unknown };

function cleanText(value: unknown, max: number) {
  return String(value ?? '').trim().replace(/[<>]/g, '').slice(0, max);
}

function validEmail(value: string) { return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }

function clientHash(request: NextRequest) {
  const raw = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const salt = process.env.ADMIN_SESSION_SECRET || 'fabrick-radier-comments';
  return createHash('sha256').update(`${salt}:${raw}`).digest('hex');
}

async function adminSession(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return await decodeSession(cookie);
}

function dbFailure(error: unknown, fallback: string) {
  const message = typeof error === 'object' && error && 'message' in error ? String((error as { message?: unknown }).message || '') : String(error || '');
  console.error('[radier-comments] database operation failed:', message.slice(0, 1200));
  return NextResponse.json({ error: fallback, code: 'COMMENTS_STORAGE_UNAVAILABLE' }, { status: 503 });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const scope = url.searchParams.get('scope');
  const session = scope === 'admin' ? await adminSession(request) : null;
  if (scope === 'admin' && !session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    let query = insforgeAdmin.database.from('radier_comments').select(scope === 'admin' ? ADMIN_FIELDS : PUBLIC_FIELDS).eq('tenant_id', DEFAULT_TENANT).eq('page_slug', PAGE_SLUG).order('created_at', { ascending: false }).limit(scope === 'admin' ? 250 : MAX_PUBLIC_COMMENTS);
    if (scope !== 'admin') query = query.eq('status', 'published');
    const { data, error } = await query;
    if (error) return dbFailure(error, 'Los comentarios se están sincronizando. Intenta nuevamente en unos segundos.');
    return NextResponse.json({ comments: Array.isArray(data) ? data : [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return dbFailure(error, 'Los comentarios se están sincronizando. Intenta nuevamente en unos segundos.');
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRadierCommentsTable();

    const payload = await request.json() as SubmitPayload;
    const honeypot = cleanText(payload.website, 180);
    if (honeypot) return NextResponse.json({ ok: true, status: 'pending' }, { status: 201 });

    const authorName = cleanText(payload.name, 80);
    const authorEmail = cleanText(payload.email, 140).toLowerCase();
    const body = cleanText(payload.body, 1200);
    const kind: CommentKind = payload.kind === 'suggestion' ? 'suggestion' : 'comment';

    if (authorName.length < 2) return NextResponse.json({ error: 'Escribe un nombre válido.' }, { status: 400 });
    if (body.length < 8) return NextResponse.json({ error: 'El comentario es demasiado corto.' }, { status: 400 });
    if (!validEmail(authorEmail)) return NextResponse.json({ error: 'El correo no tiene un formato válido.' }, { status: 400 });

    const ipHash = clientHash(request);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recent, error: recentError } = await insforgeAdmin.database.from('radier_comments').select('id').eq('tenant_id', DEFAULT_TENANT).eq('page_slug', PAGE_SLUG).eq('ip_hash', ipHash).gte('created_at', oneHourAgo).limit(6);
    if (recentError) return dbFailure(recentError, 'No se pudo validar el envío. Intenta nuevamente en unos segundos.');
    if (Array.isArray(recent) && recent.length >= 5) return NextResponse.json({ error: 'Has enviado varios aportes recientemente. Intenta nuevamente más tarde.' }, { status: 429 });

    const { data, error } = await insforgeAdmin.database.from('radier_comments').insert([{
      tenant_id: DEFAULT_TENANT,
      page_slug: PAGE_SLUG,
      author_name: authorName,
      author_email: authorEmail || null,
      kind,
      body,
      status: 'pending',
      ip_hash: ipHash,
      updated_at: new Date().toISOString(),
    }]).select('id,status').limit(1);

    if (error) return dbFailure(error, 'No se pudo guardar el comentario. Intenta nuevamente en unos segundos.');
    const row = Array.isArray(data) ? data[0] : null;
    return NextResponse.json({ ok: true, id: row?.id || null, status: row?.status || 'pending' }, { status: 201 });
  } catch (error) {
    return dbFailure(error, 'No se pudo guardar el comentario. Intenta nuevamente en unos segundos.');
  }
}

export async function PATCH(request: NextRequest) {
  const session = await adminSession(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const payload = await request.json() as PatchPayload;
    const id = cleanText(payload.id, 80);
    const status = cleanText(payload.status, 20) as CommentStatus;
    const adminReply = cleanText(payload.adminReply, 1200);
    if (!id) return NextResponse.json({ error: 'Falta el comentario.' }, { status: 400 });
    if (!['pending', 'published', 'archived'].includes(status)) return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });

    const now = new Date().toISOString();
    const update: Record<string, string | null> = { status, admin_reply: adminReply || null, updated_at: now };
    if (status === 'published') update.published_at = now;
    if (status !== 'published') update.published_at = null;

    const { data, error } = await insforgeAdmin.database.from('radier_comments').update(update).eq('tenant_id', DEFAULT_TENANT).eq('page_slug', PAGE_SLUG).eq('id', id).select(ADMIN_FIELDS).limit(1);
    if (error) return dbFailure(error, 'No se pudo actualizar el comentario.');
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return NextResponse.json({ error: 'Comentario no encontrado.' }, { status: 404 });
    return NextResponse.json({ ok: true, comment: row });
  } catch (error) {
    return dbFailure(error, 'No se pudo actualizar el comentario.');
  }
}

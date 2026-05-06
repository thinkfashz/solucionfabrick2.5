import { NextResponse, type NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import type { NewsletterCampaignRow } from '@/lib/newsletter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface CreateBody {
  subject?: unknown;
  body_md?: unknown;
  preview_text?: unknown;
  /** ISO timestamp; si se omite el campaign queda como draft. */
  scheduled_at?: unknown;
}

/** Lista campañas (más recientes primero). */
export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  try {
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('newsletter_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      return adminError(error.message ?? 'Error consultando campañas', 'INTERNAL_ERROR', 500);
    }
    return NextResponse.json({ campaigns: (data ?? []) as NewsletterCampaignRow[] });
  } catch (err) {
    return adminError((err as Error).message ?? 'Error', 'INTERNAL_ERROR', 500);
  }
}

/** Crea una campaña (draft o programada). */
export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 200) : '';
  const bodyMd = typeof body.body_md === 'string' ? body.body_md.trim() : '';
  if (!subject) return NextResponse.json({ error: 'subject requerido' }, { status: 400 });
  if (!bodyMd) return NextResponse.json({ error: 'body_md requerido' }, { status: 400 });
  if (bodyMd.length > 50_000) {
    return NextResponse.json({ error: 'body_md excede el máximo permitido (50000 chars)' }, { status: 400 });
  }
  const preview =
    typeof body.preview_text === 'string' ? body.preview_text.trim().slice(0, 200) || null : null;

  let scheduledAt: string | null = null;
  let status: 'draft' | 'scheduled' = 'draft';
  if (typeof body.scheduled_at === 'string' && body.scheduled_at.trim()) {
    const dt = new Date(body.scheduled_at);
    if (Number.isNaN(dt.getTime())) {
      return NextResponse.json({ error: 'scheduled_at no es una fecha válida' }, { status: 400 });
    }
    scheduledAt = dt.toISOString();
    status = 'scheduled';
  }

  try {
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('newsletter_campaigns')
      .insert([
        {
          subject,
          body_md: bodyMd,
          preview_text: preview,
          status,
          scheduled_at: scheduledAt,
          created_by: session.email ?? null,
        },
      ])
      .select('*')
      .limit(1);
    if (error) return adminError(error.message ?? 'Error creando campaña', 'INTERNAL_ERROR', 500);
    const campaign = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ campaign });
  } catch (err) {
    return adminError((err as Error).message ?? 'Error', 'INTERNAL_ERROR', 500);
  }
}

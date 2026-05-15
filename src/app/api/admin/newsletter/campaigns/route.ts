import { NextResponse, type NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import type { NewsletterCampaignRow } from '@/lib/newsletter';
import { v, parse, validationError } from '@/lib/validate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const campaignSchema = {
  subject:      v.string({ required: true, min: 1, max: 200 }),
  body_md:      v.string({ required: true, min: 1, max: 50000 }),
  preview_text: v.string({ max: 200 }),
  scheduled_at: v.string({ max: 50 }),
};

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

  const raw = await request.json().catch(() => ({}));
  const result = parse(campaignSchema, raw);
  if (!result.ok) return validationError(result.errors);
  const d = result.data as {
    subject: string; body_md: string; preview_text?: string; scheduled_at?: string;
  };

  const subject = d.subject;
  const bodyMd = d.body_md;
  const preview = d.preview_text || null;

  let scheduledAt: string | null = null;
  let status: 'draft' | 'scheduled' = 'draft';
  if (d.scheduled_at) {
    const dt = new Date(d.scheduled_at);
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

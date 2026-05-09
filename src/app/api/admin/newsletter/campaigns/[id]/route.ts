import { NextResponse, type NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { sendCampaign } from '@/lib/newsletterSender';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Detalle de una campaña + sus envíos recientes. */
export async function GET(request: NextRequest, ctx: RouteContext) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  try {
    const client = getAdminInsforge();
    const { data: c } = await client.database
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', id)
      .limit(1)
      .maybeSingle();
    if (!c) return NextResponse.json({ error: 'no encontrada' }, { status: 404 });
    const { data: sends } = await client.database
      .from('newsletter_sends')
      .select('subscriber_email,status,error,sent_at')
      .eq('campaign_id', id)
      .order('sent_at', { ascending: false })
      .limit(200);
    return NextResponse.json({ campaign: c, sends: sends ?? [] });
  } catch (err) {
    return adminError((err as Error).message ?? 'Error', 'INTERNAL_ERROR', 500);
  }
}

/** Disparo manual: POST para enviar la campaña ahora mismo. */
export async function POST(request: NextRequest, ctx: RouteContext) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();
  const { id } = await ctx.params;
  try {
    const result = await sendCampaign(id);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return adminError((err as Error).message ?? 'Error enviando', 'INTERNAL_ERROR', 500);
  }
}

/** Eliminar campaña (solo si está en draft). */
export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();
  const { id } = await ctx.params;
  try {
    const client = getAdminInsforge();
    const { data: c } = await client.database
      .from('newsletter_campaigns')
      .select('status')
      .eq('id', id)
      .limit(1)
      .maybeSingle();
    if (!c) return NextResponse.json({ error: 'no encontrada' }, { status: 404 });
    const status = (c as { status?: string }).status;
    if (status === 'sending' || status === 'sent') {
      return NextResponse.json({ error: 'No se puede borrar una campaña ya enviada o en envío' }, { status: 409 });
    }
    await client.database.from('newsletter_campaigns').delete().eq('id', id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminError((err as Error).message ?? 'Error', 'INTERNAL_ERROR', 500);
  }
}

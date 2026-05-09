import { NextResponse, type NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { addSubscriber, isValidEmail, normalizeEmail, subscribersCounts } from '@/lib/newsletter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Lista suscriptores + KPIs. ?format=csv exporta CSV. */
export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  try {
    const client = getAdminInsforge();
    const { data, error } = await client.database
      .from('newsletter_subscribers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2000);
    if (error) return adminError(error.message ?? 'Error', 'INTERNAL_ERROR', 500);
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const counts = await subscribersCounts();
    const url = new URL(request.url);
    if (url.searchParams.get('format') === 'csv') {
      const header = 'email,name,status,source,created_at,unsubscribed_at,last_sent_at\n';
      const body = rows
        .map((r) =>
          [
            r.email,
            (r.name ?? '') as string,
            r.status,
            r.source ?? '',
            r.created_at ?? '',
            r.unsubscribed_at ?? '',
            r.last_sent_at ?? '',
          ]
            .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
            .join(','),
        )
        .join('\n');
      return new NextResponse(header + body, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="suscriptores-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }
    return NextResponse.json({ subscribers: rows, counts });
  } catch (err) {
    return adminError((err as Error).message ?? 'Error', 'INTERNAL_ERROR', 500);
  }
}

interface CreateBody {
  email?: unknown;
  name?: unknown;
}

/** Alta manual desde admin. */
export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const email = normalizeEmail(typeof body.email === 'string' ? body.email : '');
  if (!isValidEmail(email)) return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 200) || null : null;
  const r = await addSubscriber({ email, name, source: 'manual' });
  if (!r.ok) return NextResponse.json({ error: r.error ?? 'Error' }, { status: 500 });
  return NextResponse.json({ ok: true, created: r.created });
}

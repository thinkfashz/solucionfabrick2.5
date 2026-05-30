export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { getResendCredentials } from '@/lib/resendCredentials';

interface ResendDetailRaw {
  id?: string;
  from?: string;
  to?: string | string[];
  subject?: string;
  created_at?: string;
  last_event?: string;
  html?: string;
  text?: string;
  bcc?: string[];
  cc?: string[];
  reply_to?: string[];
  opens?:  Array<{ timestamp?: string; ip_address?: string; region?: string; user_agent?: string }>;
  clicks?: Array<{ timestamp?: string; ip_address?: string; link?: string; user_agent?: string }>;
  name?: string;
  message?: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'id requerido' }, { status: 400 });

  const creds = await getResendCredentials();
  if (!creds.ready) {
    return NextResponse.json({ ok: false, error: 'Resend no configurado' });
  }

  try {
    const res = await fetch(`https://api.resend.com/emails/${encodeURIComponent(id)}`, {
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    });

    const data = await res.json() as ResendDetailRaw;

    if (!res.ok) {
      const msg = data.message ?? data.name ?? `HTTP ${res.status}`;
      return NextResponse.json({ ok: false, error: `Resend: ${msg}` });
    }

    return NextResponse.json({
      ok: true,
      email: {
        id:         String(data.id ?? id),
        from:       String(data.from ?? ''),
        to:         Array.isArray(data.to) ? data.to.map(String) : [String(data.to ?? '')],
        bcc:        Array.isArray(data.bcc) ? data.bcc.map(String) : [],
        cc:         Array.isArray(data.cc) ? data.cc.map(String) : [],
        subject:    String(data.subject ?? '(sin asunto)'),
        created_at: String(data.created_at ?? ''),
        last_event: String(data.last_event ?? 'sent'),
        html:       typeof data.html === 'string' ? data.html : null,
        text:       typeof data.text === 'string' ? data.text : null,
        opens_count:  Array.isArray(data.opens)  ? data.opens.length  : 0,
        clicks_count: Array.isArray(data.clicks) ? data.clicks.length : 0,
        opens:  (data.opens  ?? []).map((o) => ({ timestamp: String(o.timestamp ?? ''), ip: String(o.ip_address ?? '') })),
        clicks: (data.clicks ?? []).map((c) => ({ timestamp: String(c.timestamp ?? ''), link: String(c.link ?? '') })),
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message });
  }
}

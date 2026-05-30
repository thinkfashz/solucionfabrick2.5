export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { getResendCredentials } from '@/lib/resendCredentials';

interface ResendApiEmail {
  id?: string;
  from?: string;
  to?: string | string[];
  subject?: string;
  created_at?: string;
  last_event?: string;
}

interface ResendApiListResponse {
  data?: ResendApiEmail[];
  object?: string;
  name?: string;    // error name
  message?: string; // error message
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;

  const creds = await getResendCredentials();
  if (!creds.ready) {
    return NextResponse.json({
      ok: false,
      error: 'Resend no configurado. Agrega tu API key en Centro de Integraciones.',
      emails: [],
    });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

  try {
    const res = await fetch(`https://api.resend.com/emails?limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    });

    const json = await res.json() as ResendApiListResponse;

    if (!res.ok) {
      const msg = json.message ?? json.name ?? `HTTP ${res.status}`;
      return NextResponse.json({ ok: false, error: `Resend: ${msg}`, emails: [] });
    }

    const emails = (json.data ?? []).map((e) => ({
      id:          String(e.id ?? ''),
      from:        String(e.from ?? ''),
      to:          Array.isArray(e.to) ? e.to.map(String) : [String(e.to ?? '')],
      subject:     String(e.subject ?? '(sin asunto)'),
      created_at:  String(e.created_at ?? ''),
      last_event:  String(e.last_event ?? 'sent'),
    }));

    return NextResponse.json({ ok: true, emails, count: emails.length });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message, emails: [] });
  }
}

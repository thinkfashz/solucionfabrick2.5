export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { getResendCredentials } from '@/lib/resendCredentials';

interface ResendDomain {
  id?: string;
  name?: string;
  status?: string;
  region?: string;
  created_at?: string;
}

interface ResendDomainsResponse {
  data?: ResendDomain[];
  name?: string;
  message?: string;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;

  const creds = await getResendCredentials();
  if (!creds.ready) {
    return NextResponse.json({ ok: false, error: 'Resend no configurado', domains: [] }, { status: 200 });
  }

  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${creds.apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as ResendDomainsResponse;
      return NextResponse.json(
        { ok: false, error: json.message ?? `Resend ${res.status}`, domains: [] },
        { status: 200 }
      );
    }

    const json = (await res.json()) as ResendDomainsResponse;
    const domains = (json.data ?? []).map((d) => ({
      id: d.id ?? '',
      name: d.name ?? '',
      status: d.status ?? 'unknown',
      region: d.region ?? '',
      created_at: d.created_at ?? '',
    }));

    return NextResponse.json({ ok: true, domains });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message, domains: [] }, { status: 200 });
  }
}

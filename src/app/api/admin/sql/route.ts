import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const INSFORGE_URL =
  process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

// Tries admin key first, falls back to anon key
const API_KEY =
  process.env.INSFORGE_API_KEY ||
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ||
  'ik_7e23032539c2dc64d5d27ca29d07b928';

export async function POST(request: NextRequest) {
  // Auth check
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const session = await decodeSession(sessionCookie.value);
  if (!session) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  }

  let query: string;
  try {
    const body = await request.json();
    query = typeof body?.query === 'string' ? body.query.trim() : '';
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json({ error: 'Query vacío' }, { status: 400 });
  }

  const url = `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(30_000),
    });

    const text = await res.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return NextResponse.json(
      { ok: res.ok, status: res.status, data },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 502 }
    );
  }
}

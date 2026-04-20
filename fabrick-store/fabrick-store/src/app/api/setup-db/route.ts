import { NextResponse } from 'next/server';
import { DB_SCHEMA_SQL } from '@/lib/db-schema';

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.INSFORGE_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_INSFORGE_URL not set' }, { status: 500 });
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.INSFORGE_API_KEY}`,
      },
      body: JSON.stringify({ query: DB_SCHEMA_SQL }),
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    console.error('Setup DB fetch failed', err);
    return NextResponse.json(
      { error: 'Could not reach database API', code: 'FETCH_ERROR' },
      { status: 502 }
    );
  }

  if (!res.ok) {
    const text = await res.text();
    console.error('Setup DB SQL API request failed', { status: res.status, body: text });
    return NextResponse.json(
      { error: 'Failed to set up database', code: 'SQL_API_ERROR' },
      { status: res.status }
    );
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json({ success: true, data });
}


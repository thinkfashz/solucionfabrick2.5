export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { ensureDropiSchema, getDropiCredentials, maskedDropiCredentials, saveDropiCredentials } from '@/lib/dropi';

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();
  await ensureDropiSchema();
  const credentials = await getDropiCredentials();
  return NextResponse.json({ ok: true, provider: 'dropi', credentials: maskedDropiCredentials(credentials) });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  try {
    await ensureDropiSchema();
    const saved = await saveDropiCredentials(body);
    const credentials = await getDropiCredentials();
    return NextResponse.json({
      ok: true,
      provider: 'dropi',
      savedKeys: Object.keys(saved).filter((key) => saved[key as keyof typeof saved]),
      credentials: maskedDropiCredentials(credentials),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo guardar Dropi.' }, { status: 500 });
  }
}

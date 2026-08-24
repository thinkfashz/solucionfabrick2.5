export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { ensureDropiSchema, getDropiCredentials, maskedDropiCredentials, saveDropiCredentials } from '@/lib/dropi';

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;
  await ensureDropiSchema();
  const credentials = await getDropiCredentials();
  return NextResponse.json({ ok: true, provider: 'dropi', credentials: maskedDropiCredentials(credentials) });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'manage' });
  if (!auth.ok) return auth.response;

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

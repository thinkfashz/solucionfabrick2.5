export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { resolveAiConfig } from '@/lib/resolveAiConfig';

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;

  const config = await resolveAiConfig();
  if (!config) {
    return NextResponse.json({ ok: false, configured: false, provider: null, modelo: null });
  }

  // NEVER return the apiKey — only metadata
  return NextResponse.json({
    ok: true,
    configured: true,
    provider: config.provider,
    modelo: config.modelo,
  });
}

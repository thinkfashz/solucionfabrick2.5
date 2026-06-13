import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/adminApi';
import { isAiProviderId } from '@/modules/prospecting-engine/config/providers';
import { testAiIntegration } from '@/modules/prospecting-engine/services/ai-integration.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const body = await request.json().catch(() => null) as { provider?: string; credentials?: unknown } | null;
  const provider = String(body?.provider || '').trim();
  if (!isAiProviderId(provider)) return NextResponse.json({ error: 'Proveedor IA no permitido.' }, { status: 400 });

  try {
    const result = await testAiIntegration(provider, body?.credentials || {});
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, provider, error: err instanceof Error ? err.message : 'No se pudo testear la integración IA.', message: err instanceof Error ? err.message : 'No se pudo testear la integración IA.' }, { status: 400 });
  }
}

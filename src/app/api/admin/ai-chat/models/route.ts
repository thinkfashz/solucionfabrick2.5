import { NextResponse, type NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { listModels, RECOMMENDED_FREE_MODELS } from '@/lib/openrouter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/ai-chat/models
 *
 * Devuelve los modelos disponibles en OpenRouter, segmentados por
 * gratuitos vs de pago, para alimentar el selector del asistente IA.
 */
export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  try {
    const force = new URL(request.url).searchParams.get('refresh') === '1';
    const models = await listModels(force);
    const free = models.filter((m) => m.isFree);
    const paid = models.filter((m) => !m.isFree);
    return NextResponse.json({
      total: models.length,
      free,
      paid,
      recommended_free: RECOMMENDED_FREE_MODELS,
    });
  } catch (err) {
    return adminError((err as Error).message ?? 'Error consultando modelos', 'INTERNAL_ERROR', 502);
  }
}

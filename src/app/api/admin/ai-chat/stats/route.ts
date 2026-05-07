import { NextResponse, type NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { aggregateMetrics, type MetricRow } from '@/lib/aiChatStats';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/ai-chat/stats?hours=24
 *
 * Devuelve estadísticas agregadas de la tabla `ai_model_metrics` para
 * alimentar la gráfica de rendimiento del asistente IA.
 */
export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  const url = new URL(request.url);
  const hoursParam = Number(url.searchParams.get('hours') ?? '24');
  const hours = Number.isFinite(hoursParam) && hoursParam > 0 && hoursParam <= 168 ? hoursParam : 24;

  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const client = getAdminInsforge();
    const { data } = await client.database
      .from('ai_model_metrics')
      .select('model,ts,latency_ms,status,is_free')
      .gte('ts', since)
      .order('ts', { ascending: false })
      .limit(2000);
    const rows: MetricRow[] = Array.isArray(data) ? (data as MetricRow[]) : [];
    const stats = aggregateMetrics(rows);
    return NextResponse.json({
      window_hours: hours,
      total_calls: rows.length,
      stats,
    });
  } catch (err) {
    return adminError((err as Error).message ?? 'Error consultando métricas', 'INTERNAL_ERROR', 500);
  }
}

import { NextResponse, type NextRequest } from 'next/server';
import { META_GRAPH_URL } from '@/lib/meta';
import { getMetaCredentials } from '@/lib/metaCredentials';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PatchBody = {
  name?: string;
  status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  adSetId?: string;
  dailyBudgetCLP?: number;
  lifetimeBudgetCLP?: number;
};

function toMinor(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : 0;
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = cookie ? await decodeSession(cookie) : null;
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: 'ID de anuncio inválido.' }, { status: 400 });

  const body = await request.json().catch(() => ({})) as PatchBody;
  const credentials = await getMetaCredentials();
  const accessToken = credentials?.accessToken;
  if (!accessToken) return NextResponse.json({ error: 'Meta no está configurado.' }, { status: 503 });

  const updates: Array<{ target: string; payload: Record<string, string> }> = [];
  const adPayload: Record<string, string> = {};
  if (typeof body.name === 'string' && body.name.trim()) adPayload.name = body.name.trim().slice(0, 255);
  if (body.status && ['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(body.status)) adPayload.status = body.status;
  if (Object.keys(adPayload).length) updates.push({ target: id, payload: adPayload });

  if (body.adSetId && /^\d+$/.test(body.adSetId)) {
    const adSetPayload: Record<string, string> = {};
    if (body.dailyBudgetCLP !== undefined) adSetPayload.daily_budget = String(toMinor(body.dailyBudgetCLP));
    if (body.lifetimeBudgetCLP !== undefined) adSetPayload.lifetime_budget = String(toMinor(body.lifetimeBudgetCLP));
    if (Object.keys(adSetPayload).length) updates.push({ target: body.adSetId, payload: adSetPayload });
  }

  if (!updates.length) return NextResponse.json({ error: 'No hay cambios válidos.' }, { status: 400 });

  const results = [];
  for (const update of updates) {
    const form = new URLSearchParams({ ...update.payload, access_token: accessToken });
    const response = await fetch(`${META_GRAPH_URL}/${update.target}`, { method: 'POST', body: form, cache: 'no-store' });
    const json = await response.json();
    if (!response.ok || json.error) return NextResponse.json({ error: json.error?.message || `No se pudo actualizar ${update.target}.` }, { status: response.ok ? 502 : response.status });
    results.push({ target: update.target, success: Boolean(json.success) });
  }

  return NextResponse.json({ ok: true, results });
}

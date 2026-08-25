import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getAdminTenantId } from '@/lib/adminApi';
import { requireAdminPermission } from '@/lib/adminPermissions';
import {
  findMarketOpportunityBySourceUrl,
  getMarketOpportunity,
  listMarketOpportunities,
  saveMarketOpportunity,
  type MarketOpportunity,
  type MarketOpportunityStatus,
} from '@/lib/marketOpportunityStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNumber(value: unknown) {
  if (value == null || value === '') return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function financials(input: {
  cost: number;
  suggestedPrice: number;
  reservePct: number;
  marketMedian: number | null;
}) {
  const cost = Math.max(0, Math.round(input.cost));
  const suggestedPrice = Math.max(0, Math.round(input.suggestedPrice));
  const reservePct = clamp(input.reservePct, 0, 80);
  const grossProfit = suggestedPrice - cost;
  const grossMargin = suggestedPrice > 0 ? (grossProfit / suggestedPrice) * 100 : 0;
  const reserveAmount = Math.round(suggestedPrice * reservePct / 100);
  const netProfit = suggestedPrice - cost - reserveAmount;
  const netMargin = suggestedPrice > 0 ? (netProfit / suggestedPrice) * 100 : 0;
  const marketReference = Math.max(0, input.marketMedian || suggestedPrice || cost);
  const spreadToMarket = marketReference > 0 ? ((marketReference - cost) / marketReference) * 100 : 0;
  const opportunityScore = clamp(Math.round(45 + spreadToMarket * 0.65 + clamp(netMargin, -50, 60) * 0.65), 5, 95);
  return { cost, suggestedPrice, reservePct, grossProfit, grossMargin, netProfit, netMargin, opportunityScore };
}

function safeStatus(value: unknown, fallback: MarketOpportunityStatus): MarketOpportunityStatus {
  return value === 'saved' || value === 'exported' || value === 'dismissed' ? value : fallback;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'read' });
  if (!auth.ok) return auth.response;
  try {
    const tenantId = await getAdminTenantId(request);
    const includeDismissed = request.nextUrl.searchParams.get('dismissed') === '1';
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || 250) || 250, 1), 500);
    const opportunities = await listMarketOpportunities(tenantId, { limit, includeDismissed });
    return NextResponse.json({ ok: true, opportunities });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar la bandeja.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'create' });
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const title = String(body.title || '').trim();
  const sourceUrl = String(body.sourceUrl || '').trim();
  const source = String(body.source || '').trim();
  if (!title || !sourceUrl || !source) {
    return NextResponse.json({ error: 'Faltan título, fuente o URL de origen.' }, { status: 400 });
  }

  try {
    const tenantId = await getAdminTenantId(request);
    const existing = await findMarketOpportunityBySourceUrl(tenantId, sourceUrl);
    const now = new Date().toISOString();
    const marketMedian = nullableNumber(body.marketMedian);
    const cost = Math.max(0, numberValue(body.cost, numberValue(body.referencePrice)));
    const markupPct = clamp(numberValue(body.markupPct, 30), 0, 300);
    const targetFromMarkup = Math.round(cost * (1 + markupPct / 100));
    const suggestedInput = numberValue(body.suggestedPrice, targetFromMarkup);
    const reservePct = clamp(numberValue(body.reservePct, 12), 0, 80);
    const computed = financials({ cost, suggestedPrice: suggestedInput, reservePct, marketMedian });

    const opportunity: MarketOpportunity = {
      id: existing?.id || randomUUID(),
      tenantId,
      status: 'saved',
      query: String(body.query || existing?.query || '').trim(),
      normalizedQuery: String(body.normalizedQuery || existing?.normalizedQuery || '').trim(),
      source,
      sourceLabel: String(body.sourceLabel || source),
      sourceId: body.sourceId == null ? null : String(body.sourceId),
      sourceUrl,
      sourcePosition: nullableNumber(body.sourcePosition),
      title,
      imageUrl: body.imageUrl ? String(body.imageUrl) : null,
      currency: String(body.currency || 'CLP'),
      referencePrice: Math.max(0, numberValue(body.referencePrice)),
      cost: computed.cost,
      marketMin: nullableNumber(body.marketMin),
      marketAvg: nullableNumber(body.marketAvg),
      marketMedian,
      marketMax: nullableNumber(body.marketMax),
      markupPct,
      reservePct: computed.reservePct,
      suggestedPrice: computed.suggestedPrice,
      grossProfit: computed.grossProfit,
      grossMargin: Math.round(computed.grossMargin * 10) / 10,
      netProfit: computed.netProfit,
      netMargin: Math.round(computed.netMargin * 10) / 10,
      opportunityScore: computed.opportunityScore,
      commerceAi: objectValue(body.commerceAi) || existing?.commerceAi || null,
      productId: existing?.productId || null,
      note: body.note ? String(body.note).slice(0, 1000) : existing?.note || null,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await saveMarketOpportunity(opportunity, auth.session.email);
    return NextResponse.json({ ok: true, opportunity, reused: Boolean(existing) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo guardar la oportunidad.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'update' });
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const id = String(body.id || '').trim();
  if (!id) return NextResponse.json({ error: 'Falta el id de la oportunidad.' }, { status: 400 });

  try {
    const tenantId = await getAdminTenantId(request);
    const current = await getMarketOpportunity(tenantId, id);
    if (!current) return NextResponse.json({ error: 'Oportunidad no encontrada.' }, { status: 404 });

    const cost = body.cost == null ? current.cost : Math.max(0, numberValue(body.cost));
    const reservePct = body.reservePct == null ? current.reservePct : clamp(numberValue(body.reservePct), 0, 80);
    const suggestedPrice = body.suggestedPrice == null ? current.suggestedPrice : Math.max(0, numberValue(body.suggestedPrice));
    const markupPct = body.markupPct == null ? current.markupPct : clamp(numberValue(body.markupPct), 0, 300);
    const marketMedian = body.marketMedian == null ? current.marketMedian : nullableNumber(body.marketMedian);
    const computed = financials({ cost, suggestedPrice, reservePct, marketMedian });

    const opportunity: MarketOpportunity = {
      ...current,
      status: safeStatus(body.status, current.status),
      title: body.title == null ? current.title : String(body.title).trim() || current.title,
      cost: computed.cost,
      marketMedian,
      markupPct,
      reservePct: computed.reservePct,
      suggestedPrice: computed.suggestedPrice,
      grossProfit: computed.grossProfit,
      grossMargin: Math.round(computed.grossMargin * 10) / 10,
      netProfit: computed.netProfit,
      netMargin: Math.round(computed.netMargin * 10) / 10,
      opportunityScore: computed.opportunityScore,
      commerceAi: body.commerceAi === undefined ? current.commerceAi : objectValue(body.commerceAi),
      productId: body.productId === undefined ? current.productId : body.productId ? String(body.productId) : null,
      note: body.note === undefined ? current.note : body.note ? String(body.note).slice(0, 1000) : null,
      updatedAt: new Date().toISOString(),
    };

    await saveMarketOpportunity(opportunity, auth.session.email);
    return NextResponse.json({ ok: true, opportunity });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo actualizar la oportunidad.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'update' });
  if (!auth.ok) return auth.response;
  const id = request.nextUrl.searchParams.get('id')?.trim() || '';
  if (!id) return NextResponse.json({ error: 'Falta el id de la oportunidad.' }, { status: 400 });

  try {
    const tenantId = await getAdminTenantId(request);
    const current = await getMarketOpportunity(tenantId, id);
    if (!current) return NextResponse.json({ error: 'Oportunidad no encontrada.' }, { status: 404 });
    const opportunity: MarketOpportunity = { ...current, status: 'dismissed', updatedAt: new Date().toISOString() };
    await saveMarketOpportunity(opportunity, auth.session.email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo descartar la oportunidad.' }, { status: 500 });
  }
}

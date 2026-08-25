import 'server-only';

import { insforgeAdmin } from '@/lib/insforge';

const MARKET_OPPORTUNITY_EVENT = 'fabrick_market_opportunity';
const READ_LIMIT = 1500;

export type MarketOpportunityStatus = 'saved' | 'exported' | 'dismissed';

export type MarketOpportunity = {
  id: string;
  tenantId: string;
  status: MarketOpportunityStatus;
  query: string;
  normalizedQuery: string;
  source: string;
  sourceLabel: string;
  sourceId: string | null;
  sourceUrl: string;
  sourcePosition: number | null;
  title: string;
  imageUrl: string | null;
  currency: string;
  referencePrice: number;
  cost: number;
  marketMin: number | null;
  marketAvg: number | null;
  marketMedian: number | null;
  marketMax: number | null;
  markupPct: number;
  reservePct: number;
  suggestedPrice: number;
  grossProfit: number;
  grossMargin: number;
  netProfit: number;
  netMargin: number;
  opportunityScore: number;
  commerceAi: Record<string, unknown> | null;
  productId: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type EventRow = {
  event?: string | null;
  meta?: Record<string, unknown> | null;
  created_at?: string | null;
};

function opportunityFromRow(row: EventRow): MarketOpportunity | null {
  const meta = row.meta || {};
  if (row.event !== MARKET_OPPORTUNITY_EVENT || typeof meta.opportunity !== 'object' || !meta.opportunity) return null;
  return meta.opportunity as MarketOpportunity;
}

export async function saveMarketOpportunity(opportunity: MarketOpportunity, actorEmail?: string | null) {
  const { error } = await insforgeAdmin.database.from('pwa_events').insert([{
    event: MARKET_OPPORTUNITY_EVENT,
    user_id: actorEmail || null,
    meta: { tenantId: opportunity.tenantId, opportunity },
    created_at: new Date().toISOString(),
  }]);
  if (error) throw new Error(`No se pudo guardar la oportunidad: ${error.message}`);
}

export async function listMarketOpportunities(
  tenantId: string,
  options: { limit?: number; includeDismissed?: boolean } = {},
): Promise<MarketOpportunity[]> {
  const limit = Math.min(Math.max(options.limit ?? 250, 1), 500);
  const { data, error } = await insforgeAdmin.database
    .from('pwa_events')
    .select('event,meta,created_at')
    .eq('event', MARKET_OPPORTUNITY_EVENT)
    .order('created_at', { ascending: false })
    .limit(Math.min(READ_LIMIT, Math.max(limit * 8, 250)));
  if (error) throw new Error(`No se pudo leer la bandeja de oportunidades: ${error.message}`);

  const latest = new Map<string, MarketOpportunity>();
  for (const row of (data || []) as EventRow[]) {
    const opportunity = opportunityFromRow(row);
    if (!opportunity || opportunity.tenantId !== tenantId || latest.has(opportunity.id)) continue;
    if (!options.includeDismissed && opportunity.status === 'dismissed') {
      latest.set(opportunity.id, opportunity);
      continue;
    }
    latest.set(opportunity.id, opportunity);
  }

  return [...latest.values()]
    .filter((item) => options.includeDismissed || item.status !== 'dismissed')
    .sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === 'saved') return -1;
        if (b.status === 'saved') return 1;
      }
      if (b.opportunityScore !== a.opportunityScore) return b.opportunityScore - a.opportunityScore;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
    .slice(0, limit);
}

export async function getMarketOpportunity(tenantId: string, id: string): Promise<MarketOpportunity | null> {
  const rows = await listMarketOpportunities(tenantId, { limit: 500, includeDismissed: true });
  return rows.find((item) => item.id === id) || null;
}

export async function findMarketOpportunityBySourceUrl(tenantId: string, sourceUrl: string): Promise<MarketOpportunity | null> {
  const clean = sourceUrl.trim().toLowerCase();
  if (!clean) return null;
  const rows = await listMarketOpportunities(tenantId, { limit: 500, includeDismissed: true });
  return rows.find((item) => item.sourceUrl.trim().toLowerCase() === clean) || null;
}

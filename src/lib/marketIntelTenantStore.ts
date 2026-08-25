import 'server-only';

import { insforgeAdmin } from '@/lib/insforge';
import type { MarketDelta, MarketSnapshot } from '@/lib/marketIntel';

export async function compareMarketSnapshotForTenant(
  tenantId: string,
  normalizedQuery: string,
  currentAvg: number | null,
): Promise<MarketDelta> {
  if (currentAvg == null) {
    return { previousAvg: null, currentAvg, deltaPct: null, trend: 'unknown', previousAt: null };
  }

  try {
    const { data, error } = await insforgeAdmin.database
      .from('market_intel_snapshots')
      .select('stats, created_at')
      .eq('tenant_id', tenantId)
      .eq('normalized_query', normalizedQuery)
      .order('created_at', { ascending: false })
      .limit(2);

    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    const previousRow = rows[0];
    if (!previousRow) {
      return { previousAvg: null, currentAvg, deltaPct: null, trend: 'unknown', previousAt: null };
    }

    const previousAvg = ((previousRow as { stats?: { avg?: number | null } }).stats?.avg) ?? null;
    const previousAt = ((previousRow as { created_at?: string }).created_at) ?? null;
    if (typeof previousAvg !== 'number' || previousAvg <= 0) {
      return { previousAvg: null, currentAvg, deltaPct: null, trend: 'unknown', previousAt };
    }

    const deltaPct = ((currentAvg - previousAvg) / previousAvg) * 100;
    const trend = Math.abs(deltaPct) < 0.5 ? 'flat' : deltaPct > 0 ? 'up' : 'down';
    return { previousAvg, currentAvg, deltaPct, trend, previousAt };
  } catch {
    return { previousAvg: null, currentAvg, deltaPct: null, trend: 'unknown', previousAt: null };
  }
}

export async function persistMarketSnapshotForTenant(
  tenantId: string,
  snapshot: MarketSnapshot,
): Promise<string | null> {
  try {
    const { data: snapRow, error } = await insforgeAdmin.database
      .from('market_intel_snapshots')
      .insert([
        {
          tenant_id: tenantId,
          query: snapshot.query,
          normalized_query: snapshot.normalizedQuery,
          site: snapshot.site,
          sources_count: snapshot.sources.length,
          refs_count: snapshot.refs.length,
          stats: snapshot.stats,
        },
      ])
      .select('id')
      .single();

    if (error || !snapRow) return null;
    const snapshotId = String((snapRow as { id: string }).id);

    if (snapshot.refs.length > 0) {
      const { error: refsError } = await insforgeAdmin.database.from('market_intel_refs').insert(
        snapshot.refs.slice(0, 60).map((ref) => ({
          tenant_id: tenantId,
          snapshot_id: snapshotId,
          source: ref.source,
          source_id: ref.sourceId,
          title: ref.title.slice(0, 500),
          price: ref.price,
          currency: ref.currency,
          url: ref.url.slice(0, 1000),
          image: ref.image?.slice(0, 1000) ?? null,
          position: ref.position,
        })),
      );
      if (refsError) {
        console.error('[MarketIntel] snapshot saved but refs persistence failed', refsError.message);
      }
    }

    return snapshotId;
  } catch {
    return null;
  }
}

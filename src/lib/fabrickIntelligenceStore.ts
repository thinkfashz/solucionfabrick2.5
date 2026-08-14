import { insforgeAdmin } from '@/lib/insforge';
import type { AdminRole, IntelligenceActionRequest, IntelligencePolicyDecision } from '@/lib/fabrickIntelligencePolicy';

const PROPOSAL_EVENT = 'fabrick_intelligence_proposal';
const AUDIT_EVENT = 'fabrick_intelligence_audit';
const READ_LIMIT = 1000;

export type ProposalStatus = 'pending' | 'approved' | 'executed' | 'rejected' | 'failed';

export type IntelligenceProposal = {
  id: string;
  tenantId: string;
  actorEmail: string;
  actorRole: AdminRole;
  status: ProposalStatus;
  action: IntelligenceActionRequest;
  decision: IntelligencePolicyDecision;
  createdAt: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
  executedAt?: string | null;
  result?: Record<string, unknown> | null;
};

type EventRow = {
  event?: string | null;
  user_id?: string | null;
  meta?: Record<string, unknown> | null;
  created_at?: string | null;
};

function proposalFromRow(row: EventRow): IntelligenceProposal | null {
  const meta = row.meta || {};
  if (row.event !== PROPOSAL_EVENT || typeof meta.proposal !== 'object' || !meta.proposal) return null;
  return meta.proposal as IntelligenceProposal;
}

export async function saveProposal(proposal: IntelligenceProposal) {
  const { error } = await insforgeAdmin.database.from('pwa_events').insert([{
    event: PROPOSAL_EVENT,
    user_id: proposal.actorEmail,
    meta: { tenantId: proposal.tenantId, proposal },
    created_at: new Date().toISOString(),
  }]);
  if (error) throw new Error(`No se pudo guardar la propuesta: ${error.message}`);
}

export async function appendAudit(input: {
  tenantId: string;
  actorEmail: string;
  actorRole: AdminRole;
  proposalId: string;
  action: string;
  status: string;
  detail?: Record<string, unknown>;
}) {
  const { error } = await insforgeAdmin.database.from('pwa_events').insert([{
    event: AUDIT_EVENT,
    user_id: input.actorEmail,
    meta: {
      tenantId: input.tenantId,
      proposalId: input.proposalId,
      actorRole: input.actorRole,
      action: input.action,
      status: input.status,
      detail: input.detail || {},
    },
    created_at: new Date().toISOString(),
  }]);
  if (error) throw new Error(`No se pudo registrar auditoría: ${error.message}`);
}

export async function listProposals(tenantId: string, limit = 100): Promise<IntelligenceProposal[]> {
  const { data, error } = await insforgeAdmin.database
    .from('pwa_events')
    .select('event,user_id,meta,created_at')
    .eq('event', PROPOSAL_EVENT)
    .order('created_at', { ascending: false })
    .limit(Math.min(READ_LIMIT, Math.max(limit * 5, 100)));
  if (error) throw new Error(`No se pudieron leer propuestas: ${error.message}`);

  const latest = new Map<string, IntelligenceProposal>();
  for (const row of (data || []) as EventRow[]) {
    const proposal = proposalFromRow(row);
    if (!proposal || proposal.tenantId !== tenantId || latest.has(proposal.id)) continue;
    latest.set(proposal.id, proposal);
    if (latest.size >= limit) break;
  }
  return [...latest.values()];
}

export async function getProposal(tenantId: string, id: string): Promise<IntelligenceProposal | null> {
  const rows = await listProposals(tenantId, 250);
  return rows.find((item) => item.id === id) || null;
}

export async function saveProposalRevision(proposal: IntelligenceProposal) {
  await saveProposal(proposal);
}

import 'server-only';

import { getHarnessAgentProfile, harnessAgentAccess } from '@/lib/mcp/agentProfile';
import { auditMcpAction, claimMcpRateLimit } from '@/lib/mcp/governance';
import { runOllamaAgent } from '@/lib/ollamaAgent';
import type { HarnessAgentTask } from '@/lib/mcp/agentTasks';

export async function runHarnessAgentTask(task: HarnessAgentTask, options?: { allowCommit?: boolean; scheduled?: boolean }) {
  const profile = await getHarnessAgentProfile(task.tenantId);
  if (!profile.enabled) throw new Error('AGENT_DISABLED');
  const access = harnessAgentAccess(profile);
  await claimMcpRateLimit(access, 'request');
  const scheduled = options?.scheduled === true;
  const allowCommit = options?.allowCommit === true
    && task.allowWrites === true
    && (!scheduled || profile.allowScheduledWrites === true);

  await auditMcpAction({
    access,
    toolName: '__ollama_agent_task__',
    phase: 'request',
    outcome: 'ok',
    payload: { taskId: task.id, cadence: task.cadence, scheduled, allowCommit },
    result: { count: 1 },
    requestId: `agent-task:${task.id}`,
  });

  return runOllamaAgent({
    access,
    profile,
    model: task.model,
    messages: [{ role: 'user', content: task.prompt }],
    allowCommit,
  });
}

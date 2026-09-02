import type { NextRequest } from 'next/server';
import { handleFabrickAgentMcpRequest } from '@/lib/mcp/agentServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handler(request: NextRequest) {
  return handleFabrickAgentMcpRequest(request);
}

export { handler as GET, handler as POST };

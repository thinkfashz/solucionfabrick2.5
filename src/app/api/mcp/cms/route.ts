import type { NextRequest } from 'next/server';
import { handleFabrickCmsMcpRequest } from '@/lib/mcp/cmsServer';
import { applyMcpOAuthChallenge } from '@/lib/mcp/oauth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handler(request: NextRequest) {
  const response = await handleFabrickCmsMcpRequest(request);
  return applyMcpOAuthChallenge(response, request.url);
}

export { handler as GET, handler as POST };

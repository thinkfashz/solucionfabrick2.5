import type { NextRequest } from 'next/server';
import { handleFabrickMcpRequest } from '@/lib/mcp/server';
import { applyMcpOAuthChallenge } from '@/lib/mcp/oauth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handler(request: NextRequest) {
  const response = await handleFabrickMcpRequest(request);
  return applyMcpOAuthChallenge(response, request.url);
}

export { handler as GET, handler as POST };

import type { NextRequest } from 'next/server';
import { handleFabrickMcpRequest } from '@/lib/mcp/server';
import { applyMcpOAuthChallenge } from '@/lib/mcp/oauth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ token: string }> };

async function handler(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const response = await handleFabrickMcpRequest(request, token);
  return applyMcpOAuthChallenge(response, request.url);
}

export { handler as GET, handler as POST };

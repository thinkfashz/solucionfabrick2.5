import type { NextRequest } from 'next/server';
import { handleFabrickMcpRequest } from '@/lib/mcp/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ token: string }> };

async function handler(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  return handleFabrickMcpRequest(request, token);
}

export { handler as GET, handler as POST };

import type { NextRequest } from 'next/server';
import { handleFabrickMcpRequest } from '@/lib/mcp/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handler(request: NextRequest) {
  return handleFabrickMcpRequest(request);
}

export { handler as GET, handler as POST };

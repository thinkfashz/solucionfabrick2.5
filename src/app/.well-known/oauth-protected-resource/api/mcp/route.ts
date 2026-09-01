import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getMcpResourceMetadata } from '@/lib/mcp/oauth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const metadata = getMcpResourceMetadata(new URL(request.url).origin);
  if (!metadata) {
    return NextResponse.json(
      { error: 'MCP_OAUTH_NOT_CONFIGURED', message: 'Configura MCP_OAUTH_ISSUER para habilitar descubrimiento OAuth 2.1.' },
      { status: 404, headers: { 'cache-control': 'no-store' } },
    );
  }
  return NextResponse.json(metadata, {
    headers: {
      'cache-control': 'public, max-age=300, stale-while-revalidate=300',
      'x-robots-tag': 'noindex',
    },
  });
}

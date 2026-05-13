import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/shipping/carriers-status
 * Returns which shipping carriers are configured via env vars.
 * Used by /admin/envios to show a warning banner when keys are missing.
 */
export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const session = await decodeSession(cookie.value);
  if (!session) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  return NextResponse.json({
    chilexpress: {
      configured: Boolean(process.env.CHILEXPRESS_API_KEY),
      label: 'Chilexpress',
      required: ['CHILEXPRESS_API_KEY', 'CHILEXPRESS_ACCOUNT'],
      optional: ['CHILEXPRESS_BASE_URL'],
      docs: 'https://developers.chilexpress.cl/',
    },
    starken: {
      configured: Boolean(process.env.STARKEN_USER && process.env.STARKEN_PASS),
      label: 'Starken',
      required: ['STARKEN_USER', 'STARKEN_PASS', 'STARKEN_RUT_EMISOR'],
      optional: ['STARKEN_BASE_URL'],
      docs: null,
    },
    correoschile: {
      configured: Boolean(process.env.CORREOSCHILE_USER && process.env.CORREOSCHILE_PASS),
      label: 'Correos de Chile',
      required: ['CORREOSCHILE_USER', 'CORREOSCHILE_PASS', 'CORREOSCHILE_CONTRATO'],
      optional: ['CORREOSCHILE_BASE_URL'],
      docs: null,
    },
  });
}

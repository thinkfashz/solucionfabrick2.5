import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Prueba deliberada de Sentry reservada a Root/superadmin.
 * En producción captura y lanza un error controlado para validar la tubería
 * de observabilidad. Nunca debe quedar disponible para roles operativos.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'admin', action: 'manage' });
  if (!auth.ok) return auth.response;

  if (process.env.NODE_ENV === 'production') {
    const Sentry = await import('@sentry/nextjs');
    const error = new Error(
      `Sentry test error triggered by Root ${auth.session.email} at ${new Date().toISOString()}`,
    );
    Sentry.captureException(error);
    throw error;
  }

  return NextResponse.json({
    ok: true,
    env: process.env.NODE_ENV,
    sentryDsnConfigured: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
    note: 'Sentry solo reporta esta prueba en producción.',
  });
}

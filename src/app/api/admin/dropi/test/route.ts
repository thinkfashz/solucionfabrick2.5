export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { dropiRequest, getDropiCredentials, maskedDropiCredentials } from '@/lib/dropi';

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  const credentials = await getDropiCredentials();
  if (!credentials) return NextResponse.json({ ok: false, error: 'Dropi no está configurado.' }, { status: 400 });

  const checks: Array<{ name: string; ok: boolean; detail?: string }> = [
    { name: 'Base URL', ok: Boolean(credentials.api_base_url), detail: credentials.api_base_url },
    { name: 'Token/API key', ok: Boolean(credentials.api_token || credentials.api_key), detail: credentials.api_token ? 'api_token configurado' : credentials.api_key ? 'api_key configurada' : 'sin credencial' },
    { name: 'Ruta productos', ok: Boolean(credentials.products_path), detail: credentials.products_path },
    { name: 'Ruta órdenes', ok: Boolean(credentials.orders_path), detail: credentials.orders_path },
  ];

  try {
    const probePath = credentials.health_path || credentials.products_path;
    await dropiRequest(probePath, { method: 'GET' }, credentials);
    checks.push({ name: 'Respuesta API', ok: true, detail: 'Dropi respondió correctamente.' });
    return NextResponse.json({ ok: true, checks, credentials: maskedDropiCredentials(credentials) });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'No se pudo conectar.';
    checks.push({ name: 'Respuesta API', ok: false, detail });
    return NextResponse.json({ ok: false, checks, credentials: maskedDropiCredentials(credentials), error: detail }, { status: 502 });
  }
}

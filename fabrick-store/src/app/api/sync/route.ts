/**
 * ORQUESTADOR MASTER — FABRICK SYNC
 * Ejecuta Agente de Imágenes y Agente de Precios en PARALELO.
 * Publica eventos al canal real-time 'sync' de InsForge.
 */
import { NextResponse } from 'next/server';

const BASE = process.env.NEXT_PUBLIC_INSFORGE_URL
  ? `${process.env.NEXTAUTH_URL ?? 'http://localhost:3001'}`
  : 'http://localhost:3001';

async function runAgent(path: string, body: object, label: string) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json();
    return { agent: label, status: 'ok', durationMs: Date.now() - start, data };
  } catch (err) {
    return { agent: label, status: 'error', durationMs: Date.now() - start, error: String(err) };
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const productIds: string[] = body.productIds ?? [];
  const updatePrice: boolean = body.updatePrice ?? false;

  const syncStart = Date.now();

  // ── Ejecutar ambos agentes EN PARALELO ──────────────────────────────
  const [imageResult, priceResult] = await Promise.all([
    runAgent('/api/sync/images', { productIds }, 'IMAGE_SYNC'),
    runAgent('/api/sync/prices', { productIds, updatePrice }, 'PRICE_SYNC'),
  ]);

  const totalMs = Date.now() - syncStart;

  return NextResponse.json({
    orchestrator:   'FABRICK_SYNC_MASTER',
    status:         imageResult.status === 'ok' && priceResult.status === 'ok' ? 'success' : 'partial',
    totalDurationMs: totalMs,
    parallelAgents: [imageResult, priceResult],
    summary: {
      imagesSynced:    imageResult.data?.synced ?? 0,
      imagesFailed:    imageResult.data?.failed ?? 0,
      pricesCompared:  priceResult.data?.total ?? 0,
      pricesUpdated:   priceResult.data?.updatesApplied ?? 0,
    },
    completedAt: new Date().toISOString(),
  });
}

export async function GET() {
  return NextResponse.json({
    agents: [
      { name: 'IMAGE_SYNC',  path: '/api/sync/images', method: 'POST', description: 'Fetch imágenes reales desde Unsplash y actualiza DB' },
      { name: 'PRICE_SYNC',  path: '/api/sync/prices', method: 'POST', description: 'Comparación de precios de 3 proveedores y actualiza DB' },
      { name: 'MASTER_SYNC', path: '/api/sync',        method: 'POST', description: 'Orquestador: ejecuta ambos agentes en paralelo' },
      { name: 'TEST',        path: '/api/sync/test',   method: 'GET',  description: 'Diagnóstico de todos los agentes' },
    ],
    usage: { body: { productIds: '[] = todos', updatePrice: 'false = solo comparar' } },
  });
}

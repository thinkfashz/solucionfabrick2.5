import { NextResponse } from 'next/server';
import { getSyncStatus, runFullSync } from '@/lib/mercadoLibreSync';

/**
 * GET /api/admin/ml-sync/status
 * Obtiene estado actual de sincronización
 */
export async function GET() {
  try {
    const status = await getSyncStatus();
    return NextResponse.json(status);
  } catch (err) {
    console.error('Error getting sync status:', err);
    return NextResponse.json(
      { error: 'Error obteniendo estado de sincronización' },
      { status: 500 }
    );
  }
}

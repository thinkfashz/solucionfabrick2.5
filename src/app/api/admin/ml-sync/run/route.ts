import { NextResponse } from 'next/server';
import { runFullSync } from '@/lib/mercadoLibreSync';

/**
 * POST /api/admin/ml-sync/run
 * Ejecuta sincronización completa
 */
export async function POST() {
  try {
    const result = await runFullSync();
    return NextResponse.json({
      success: result.success,
      productsSync: result.productsSync.length,
      ordersSync: result.ordersSync.length,
      errors: result.errors,
    });
  } catch (err) {
    console.error('Error running sync:', err);
    return NextResponse.json(
      { error: 'Error ejecutando sincronización' },
      { status: 500 }
    );
  }
}

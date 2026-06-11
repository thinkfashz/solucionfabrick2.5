export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ensureWebPagesTable } from '@/lib/web-pages/sql';

export async function POST() {
  try {
    await ensureWebPagesTable();
    return NextResponse.json({ ok: true, message: 'Tabla web_pages creada o migrada correctamente.' });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'No se pudo migrar web_pages' }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}

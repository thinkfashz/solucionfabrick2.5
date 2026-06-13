import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/adminApi';
import { insforgeAdmin } from '@/lib/insforge';
import { ensureProspectsTable } from '@/modules/prospecting-engine/services/prospect-table.server';
import { parseProspectImportPayload, toDbProspectRow } from '@/modules/prospecting-engine/utils/prospect-importer';
import type { ProspectRecord } from '@/modules/prospecting-engine/types/prospect.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function serializeDbError(error: unknown) {
  if (!error || typeof error !== 'object') return String(error || 'Error desconocido');
  const e = error as { message?: string; code?: string; details?: string; hint?: string };
  return [e.message, e.code, e.details, e.hint].filter(Boolean).join(' · ') || 'Error de base de datos';
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  if (session.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });

  const body = await request.json().catch(() => null) as { raw?: string } | unknown;
  const raw = body && typeof body === 'object' && 'raw' in body ? (body as { raw?: string }).raw : body;
  const parsed = parseProspectImportPayload(raw);
  if (!parsed.prospects.length) {
    return NextResponse.json({ error: 'No se encontraron prospectos válidos para importar.' }, { status: 400 });
  }

  const ensure = await ensureProspectsTable();
  if (!ensure.ok) return NextResponse.json({ error: 'No se pudo preparar la tabla prospects.', detail: ensure.data }, { status: 502 });

  const imported: ProspectRecord[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  for (const [index, prospect] of parsed.prospects.entries()) {
    const row = toDbProspectRow(prospect);
    const { data, error } = await insforgeAdmin.database
      .from('prospects')
      .insert([row])
      .select('*')
      .single();
    if (error) {
      errors.push({ index, error: serializeDbError(error) });
      continue;
    }
    if (data) imported.push(data as ProspectRecord);
  }

  return NextResponse.json({
    ok: true,
    connected: true,
    table: 'prospects',
    source: parsed.source || 'chatgpt',
    city: parsed.city || '',
    industry: parsed.industry || '',
    imported: imported.length,
    skipped: errors.length,
    errors,
    prospects: imported,
  });
}

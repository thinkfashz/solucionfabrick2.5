import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/adminApi';
import { insforgeAdmin } from '@/lib/insforge';
import { ensureProspectsTable } from '@/modules/prospecting-engine/services/prospect-table.server';
import { normalizeProspectInput, toDbProspectRow } from '@/modules/prospecting-engine/utils/prospect-importer';
import type { ProspectRecord } from '@/modules/prospecting-engine/types/prospect.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function requireAdmin(request: NextRequest) {
  const session = await getAdminSession(request);
  return session;
}

function serializeDbError(error: unknown) {
  if (!error || typeof error !== 'object') return String(error || 'Error desconocido');
  const e = error as { message?: string; code?: string; details?: string; hint?: string };
  return [e.message, e.code, e.details, e.hint].filter(Boolean).join(' · ') || 'Error de base de datos';
}

function filterProspects(prospects: ProspectRecord[], request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') || '').toLowerCase().trim();
  const status = (request.nextUrl.searchParams.get('status') || '').toLowerCase().trim();
  const probability = (request.nextUrl.searchParams.get('probability') || request.nextUrl.searchParams.get('probability_level') || '').toLowerCase().trim();
  const city = (request.nextUrl.searchParams.get('city') || '').toLowerCase().trim();
  const industry = (request.nextUrl.searchParams.get('industry') || '').toLowerCase().trim();

  return prospects.filter((p) => {
    if (status && String(p.status || '').toLowerCase() !== status) return false;
    if (probability && String(p.probability_level || '').toLowerCase() !== probability) return false;
    if (city && !String(p.city || '').toLowerCase().includes(city)) return false;
    if (industry && !String(p.industry || '').toLowerCase().includes(industry)) return false;
    if (!q) return true;
    const haystack = [p.brand, p.client_name, p.industry, p.city, p.instagram, p.website, p.whatsapp, p.problem_detected, p.opportunity, p.notes]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const ensure = await ensureProspectsTable();
  if (!ensure.ok) return NextResponse.json({ error: 'No se pudo preparar la tabla prospects.', detail: ensure.data }, { status: 502 });

  const { data, error } = await insforgeAdmin.database
    .from('prospects')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(250);

  if (error) return NextResponse.json({ error: serializeDbError(error), detail: error }, { status: 502 });
  const prospects = filterProspects((data || []) as ProspectRecord[], request);
  return NextResponse.json({ ok: true, connected: true, table: 'prospects', prospects });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  if (session.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const normalized = normalizeProspectInput(body);
  if (!normalized) return NextResponse.json({ error: 'El prospecto necesita al menos una marca/nombre válido.' }, { status: 400 });

  const ensure = await ensureProspectsTable();
  if (!ensure.ok) return NextResponse.json({ error: 'No se pudo preparar la tabla prospects.', detail: ensure.data }, { status: 502 });

  const row = toDbProspectRow(normalized);
  const { data, error } = await insforgeAdmin.database
    .from('prospects')
    .insert([row])
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: `No se pudo crear el prospecto: ${serializeDbError(error)}`, detail: error }, { status: 502 });
  return NextResponse.json({ ok: true, connected: true, table: 'prospects', prospect: data });
}

export async function PUT(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  if (session.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = String(body?.id || '').trim();
  if (!id) return NextResponse.json({ error: 'Falta id del prospecto.' }, { status: 400 });

  const normalized = normalizeProspectInput({ ...body, brand: body?.brand || 'Prospecto' });
  if (!normalized) return NextResponse.json({ error: 'Datos de prospecto inválidos.' }, { status: 400 });

  const ensure = await ensureProspectsTable();
  if (!ensure.ok) return NextResponse.json({ error: 'No se pudo preparar la tabla prospects.', detail: ensure.data }, { status: 502 });

  const row = toDbProspectRow({ ...normalized, id });
  const { data, error } = await insforgeAdmin.database
    .from('prospects')
    .update(row)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: `No se pudo actualizar el prospecto: ${serializeDbError(error)}`, detail: error }, { status: 502 });
  return NextResponse.json({ ok: true, connected: true, table: 'prospects', prospect: data });
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  if (session.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });

  const id = request.nextUrl.searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'Falta id del prospecto.' }, { status: 400 });

  const ensure = await ensureProspectsTable();
  if (!ensure.ok) return NextResponse.json({ error: 'No se pudo preparar la tabla prospects.', detail: ensure.data }, { status: 502 });

  const { error } = await insforgeAdmin.database.from('prospects').delete().eq('id', id);
  if (error) return NextResponse.json({ error: `No se pudo eliminar el prospecto: ${serializeDbError(error)}`, detail: error }, { status: 502 });
  return NextResponse.json({ ok: true, deleted: id });
}

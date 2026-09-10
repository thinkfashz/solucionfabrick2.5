import { NextResponse, type NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { isAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;
const STAGES = new Set(['Contacto inicial', 'Calificación', 'Propuesta', 'Negociación', 'Cerrado']);

function text(value: unknown, max = 500) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
}
function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
async function guard() {
  return isAdminSession();
}

export async function GET() {
  if (!await guard()) return NextResponse.json({ error: 'No autorizado.' }, { status: 401, headers: NO_STORE });
  try {
    const [leadResult, customerResult] = await Promise.all([
      insforgeAdmin.database.from('crm_leads').select('id,order_id,customer_user_id,name,contact,email,phone,company,value,stage,probability,notes,next_action,created_at,updated_at').order('updated_at', { ascending: false }).limit(500),
      insforgeAdmin.database.from('crm_customers').select('id,user_id,name,email,phone,source,lifecycle_stage,marketing_email,marketing_whatsapp,last_order_id,last_order_at,last_order_total,created_at,updated_at').order('updated_at', { ascending: false }).limit(500),
    ]);
    if (leadResult.error || customerResult.error) {
      const message = leadResult.error?.message || customerResult.error?.message || 'Esquema CRM pendiente.';
      if (/does not exist|42P01|schema cache|PGRST205/i.test(message)) {
        return NextResponse.json({ leads: [], customers: [], schema_ready: false, error: 'El esquema de clientes/CRM aún no fue aplicado.' }, { status: 503, headers: NO_STORE });
      }
      throw new Error(message);
    }
    return NextResponse.json({ leads: Array.isArray(leadResult.data) ? leadResult.data : [], customers: Array.isArray(customerResult.data) ? customerResult.data : [], schema_ready: true }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: 'No se pudo cargar el CRM.' }, { status: 500, headers: NO_STORE });
  }
}

export async function POST(request: NextRequest) {
  if (!await guard()) return NextResponse.json({ error: 'No autorizado.' }, { status: 401, headers: NO_STORE });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const name = text(body.name, 180);
  if (!name) return NextResponse.json({ error: 'La oportunidad necesita un nombre.' }, { status: 422, headers: NO_STORE });
  const stage = STAGES.has(String(body.stage)) ? String(body.stage) : 'Contacto inicial';
  const payload = {
    name,
    contact: text(body.contact, 180),
    email: text(body.email, 180).toLowerCase(),
    phone: text(body.phone, 50),
    company: text(body.company, 180),
    value: Math.max(0, Math.round(numberValue(body.value))),
    stage,
    probability: Math.max(0, Math.min(100, Math.round(numberValue(body.probability, 20)))),
    next_action: text(body.next_action, 400),
    notes: text(body.notes, 2000),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await insforgeAdmin.database.from('crm_leads').insert([{ ...payload, created_at: new Date().toISOString() }]).select('*');
  if (error) return NextResponse.json({ error: error.message || 'No se pudo guardar.' }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ ok: true, lead: Array.isArray(data) ? data[0] : null }, { status: 201, headers: NO_STORE });
}

export async function PATCH(request: NextRequest) {
  if (!await guard()) return NextResponse.json({ error: 'No autorizado.' }, { status: 401, headers: NO_STORE });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = numberValue(body.id, 0);
  if (!id) return NextResponse.json({ error: 'ID inválido.' }, { status: 422, headers: NO_STORE });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ('name' in body) patch.name = text(body.name, 180);
  if ('contact' in body) patch.contact = text(body.contact, 180);
  if ('email' in body) patch.email = text(body.email, 180).toLowerCase();
  if ('phone' in body) patch.phone = text(body.phone, 50);
  if ('company' in body) patch.company = text(body.company, 180);
  if ('value' in body) patch.value = Math.max(0, Math.round(numberValue(body.value)));
  if ('probability' in body) patch.probability = Math.max(0, Math.min(100, Math.round(numberValue(body.probability, 20))));
  if ('stage' in body && STAGES.has(String(body.stage))) patch.stage = String(body.stage);
  if ('next_action' in body) patch.next_action = text(body.next_action, 400);
  if ('notes' in body) patch.notes = text(body.notes, 2000);
  const { error } = await insforgeAdmin.database.from('crm_leads').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message || 'No se pudo actualizar.' }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

export async function DELETE(request: NextRequest) {
  if (!await guard()) return NextResponse.json({ error: 'No autorizado.' }, { status: 401, headers: NO_STORE });
  const id = numberValue(request.nextUrl.searchParams.get('id'), 0);
  if (!id) return NextResponse.json({ error: 'ID inválido.' }, { status: 422, headers: NO_STORE });
  const { error } = await insforgeAdmin.database.from('crm_leads').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message || 'No se pudo eliminar.' }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

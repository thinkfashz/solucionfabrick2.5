import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import {
  createPresupuesto,
  buildPresupuestoLink,
  type PresupuestoItem,
} from '@/lib/presupuestos';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return null;
  return decodeSession(cookie.value);
}

interface CreateBody {
  customer_name?: unknown;
  customer_email?: unknown;
  customer_phone?: unknown;
  total?: unknown;
  notas?: unknown;
  items?: unknown;
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
}

function parseItems(v: unknown): PresupuestoItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const obj = raw as Record<string, unknown>;
      const descripcion = typeof obj.descripcion === 'string' ? obj.descripcion : '';
      const cantidad = Number(obj.cantidad);
      const precio_unitario = Number(obj.precio_unitario);
      if (!descripcion || !Number.isFinite(cantidad) || !Number.isFinite(precio_unitario)) return null;
      return { descripcion, cantidad, precio_unitario } as PresupuestoItem;
    })
    .filter((x): x is PresupuestoItem => x !== null);
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido (JSON requerido).' }, { status: 400 });
  }

  const customer_name = asString(body.customer_name);
  if (!customer_name) {
    return NextResponse.json({ error: 'El nombre del cliente es obligatorio.' }, { status: 400 });
  }

  const totalRaw = body.total;
  const total =
    typeof totalRaw === 'number' && Number.isFinite(totalRaw) && totalRaw >= 0
      ? totalRaw
      : typeof totalRaw === 'string' && totalRaw.trim().length > 0 && Number.isFinite(Number(totalRaw))
        ? Math.max(0, Number(totalRaw))
        : undefined;

  const result = await createPresupuesto({
    customer_name,
    customer_email: asString(body.customer_email) ?? null,
    customer_phone: asString(body.customer_phone) ?? null,
    notas: asString(body.notas) ?? null,
    items: parseItems(body.items),
    total,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }

  const link = buildPresupuestoLink(result.presupuesto.slug, request.url);
  return NextResponse.json({ ok: true, presupuesto: result.presupuesto, link }, { status: 201 });
}

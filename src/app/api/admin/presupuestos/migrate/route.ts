import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession, getAdminTenantId } from '@/lib/adminApi';
import { calculateBudget, normalizeBudget, type PresupuestoPro } from '@/lib/presupuestosBuilder';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function toDbRow(budget: PresupuestoPro, tenantId: string) {
  const normalized = calculateBudget(normalizeBudget(budget));
  return {
    id: normalized.id,
    tenant_id: tenantId,
    slug: normalized.slug,
    proveedor: normalized.proveedor,
    cliente: normalized.cliente,
    empresa_cliente: normalized.empresa_cliente,
    email_cliente: normalized.email_cliente || null,
    telefono_whatsapp: normalized.telefono_whatsapp || null,
    titulo: normalized.titulo,
    descripcion: normalized.descripcion,
    ciudad: normalized.ciudad,
    fecha: normalized.fecha,
    validez: normalized.validez,
    plazo_entrega: normalized.plazo_entrega,
    estado: normalized.estado,
    valor_neto: normalized.valor_neto,
    iva_porcentaje: normalized.iva_porcentaje,
    total_iva: normalized.total_iva,
    total_con_iva: normalized.total_con_iva,
    html_personalizado: normalized.html_personalizado || '',
    usar_html_personalizado: normalized.usar_html_personalizado || false,
    json_presentacion: normalized.json_presentacion || {},
    imagenes: normalized.imagenes || [],
    archivos: normalized.archivos || [],
    incluye: normalized.incluye || [],
    no_incluye: normalized.no_incluye || [],
    materiales: normalized.materiales || [],
    forma_pago: normalized.forma_pago || [],
    observacion_tecnica: normalized.observacion_tecnica || '',
    items: normalized.items || [],
    created_at: normalized.created_at,
    updated_at: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const tenantId = await getAdminTenantId(request);
    const body = (await request.json().catch(() => ({}))) as { presupuestos?: PresupuestoPro[] };
    const presupuestos = Array.isArray(body.presupuestos) ? body.presupuestos : [];

    if (!presupuestos.length) {
      return NextResponse.json({ error: 'No se recibieron presupuestos para migrar.', code: 'EMPTY_PAYLOAD' }, { status: 400 });
    }

    const rows = presupuestos.map((budget) => toDbRow(budget, tenantId));
    const client = getAdminInsforge();

    const { data, error } = await client.database
      .from('presupuestos')
      .upsert(rows, { onConflict: 'id' })
      .select();

    if (error) {
      return NextResponse.json({
        error: error.message,
        code: error.code || 'DB_ERROR',
        hint: 'Crea la tabla presupuestos en InsForge/Admin Setup. Columnas recomendadas: id, tenant_id, slug, proveedor, cliente, empresa_cliente, email_cliente, telefono_whatsapp, titulo, descripcion, ciudad, fecha, validez, plazo_entrega, estado, valor_neto, iva_porcentaje, total_iva, total_con_iva, html_personalizado, usar_html_personalizado, json_presentacion jsonb, imagenes jsonb, archivos jsonb, incluye jsonb, no_incluye jsonb, materiales jsonb, forma_pago jsonb, observacion_tecnica, items jsonb, created_at, updated_at.',
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      migrated: rows.length,
      ids: rows.map((row) => row.id),
      data: data || [],
    });
  } catch (err) {
    return adminError(err, 'PRESUPUESTOS_MIGRATION_FAILED', 500, request);
  }
}

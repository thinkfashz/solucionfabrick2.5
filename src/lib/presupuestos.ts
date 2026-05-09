import 'server-only';
import { randomBytes } from 'crypto';
import { insforgeAdmin } from '@/lib/insforge';

/**
 * Cuántos días vive un presupuesto antes de "autodestruirse".
 * Centralizado aquí para que el correo, la página pública y la insersión usen
 * exactamente el mismo número.
 */
export const PRESUPUESTO_TTL_DIAS = 5;

export interface PresupuestoItem {
  /** Descripción del material/servicio. */
  descripcion: string;
  /** Cantidad (m², unidad, días, etc.). */
  cantidad: number;
  /** Precio unitario en CLP (o moneda definida fuera). */
  precio_unitario: number;
  /** Subtotal calculado en cliente; recalculado server-side por seguridad. */
  subtotal?: number;
}

export interface PresupuestoRow {
  id: string;
  slug: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  items: PresupuestoItem[];
  total: number;
  notas: string | null;
  status: string;
  sent_via: string[];
  created_at: string;
  expira_at: string;
}

export interface CreatePresupuestoInput {
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  items?: PresupuestoItem[];
  /** Si se omite, se calcula sumando los items. */
  total?: number;
  notas?: string | null;
}

const SLUG_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // sin caracteres ambiguos

/** Genera un slug aleatorio de 10 caracteres legible (~50 bits de entropía). */
export function generateSlug(length = 10): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  }
  return out;
}

function normalizeItems(items: PresupuestoItem[] | undefined): PresupuestoItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((it) => it && typeof it === 'object')
    .map((it) => {
      const cantidad = Number(it.cantidad) || 0;
      const precio_unitario = Number(it.precio_unitario) || 0;
      return {
        descripcion: String(it.descripcion ?? '').slice(0, 240),
        cantidad,
        precio_unitario,
        subtotal: Math.round(cantidad * precio_unitario * 100) / 100,
      };
    });
}

function computeTotal(items: PresupuestoItem[]): number {
  return Math.round(items.reduce((sum, it) => sum + (it.subtotal ?? 0), 0) * 100) / 100;
}

/**
 * Inserta un presupuesto en la tabla `presupuestos`. Genera slug único y
 * `expira_at = now + PRESUPUESTO_TTL_DIAS` (calculado server-side para evitar
 * desfases de reloj cliente/servidor).
 */
export async function createPresupuesto(
  input: CreatePresupuestoInput,
): Promise<{ ok: true; presupuesto: PresupuestoRow } | { ok: false; error: string; status?: number }> {
  const customer_name = String(input.customer_name ?? '').trim();
  if (customer_name.length === 0) {
    return { ok: false, error: 'customer_name es requerido', status: 400 };
  }
  const items = normalizeItems(input.items);
  const total =
    typeof input.total === 'number' && Number.isFinite(input.total) && input.total >= 0
      ? Math.round(input.total * 100) / 100
      : computeTotal(items);

  const expiraAt = new Date(Date.now() + PRESUPUESTO_TTL_DIAS * 24 * 60 * 60 * 1000);

  // Reintenta hasta 3 veces ante colisión (extremadamente improbable con 10 chars).
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = generateSlug();
    const row = {
      slug,
      customer_name,
      customer_email: input.customer_email ? String(input.customer_email).trim() : null,
      customer_phone: input.customer_phone ? String(input.customer_phone).trim() : null,
      items,
      total,
      notas: input.notas ? String(input.notas).trim() : null,
      status: 'borrador',
      sent_via: [],
      expira_at: expiraAt.toISOString(),
    };

    try {
      const { data, error } = await insforgeAdmin.database
        .from('presupuestos')
        .insert([row])
        .select('*')
        .single();
      if (error) {
        const code = (error as { code?: string }).code;
        // 23505 = unique_violation (slug colisionado): reintenta.
        if (code === '23505') continue;
        return { ok: false, error: (error as { message?: string }).message ?? 'Error guardando presupuesto', status: 500 };
      }
      if (!data) {
        return { ok: false, error: 'No se obtuvo respuesta de la base de datos', status: 500 };
      }
      return { ok: true, presupuesto: data as PresupuestoRow };
    } catch (err) {
      return { ok: false, error: (err as Error).message ?? 'Error desconocido', status: 500 };
    }
  }
  return { ok: false, error: 'No se pudo generar un slug único, intenta nuevamente', status: 500 };
}

export async function getPresupuestoBySlug(slug: string): Promise<PresupuestoRow | null> {
  const cleaned = String(slug ?? '').trim().toLowerCase();
  if (!/^[a-z0-9-]{4,64}$/.test(cleaned)) return null;
  try {
    const { data, error } = await insforgeAdmin.database
      .from('presupuestos')
      .select('*')
      .eq('slug', cleaned)
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data as PresupuestoRow;
  } catch {
    return null;
  }
}

/** True si `now() > expira_at`. */
export function isPresupuestoExpired(p: Pick<PresupuestoRow, 'expira_at'>, now: Date = new Date()): boolean {
  const expires = new Date(p.expira_at).getTime();
  if (!Number.isFinite(expires)) return true;
  return now.getTime() > expires;
}

/**
 * Marca un canal como enviado (email|whatsapp). Best-effort: si falla la
 * actualización solo lo loggea, no rompe la respuesta del envío.
 */
export async function markPresupuestoSent(slug: string, channel: 'email' | 'whatsapp'): Promise<void> {
  try {
    const current = await getPresupuestoBySlug(slug);
    if (!current) return;
    const set = new Set<string>(Array.isArray(current.sent_via) ? current.sent_via : []);
    set.add(channel);
    await insforgeAdmin.database
      .from('presupuestos')
      .update({ sent_via: Array.from(set), status: current.status === 'borrador' ? 'enviado' : current.status })
      .eq('slug', slug);
  } catch (err) {
    console.warn('[presupuestos] markPresupuestoSent fallo:', (err as Error).message);
  }
}

/** Construye el link público absoluto a /p/[slug]. */
export function buildPresupuestoLink(slug: string, requestUrl?: string): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return `${explicit.replace(/\/+$/, '')}/p/${slug}`;
  if (requestUrl) {
    try {
      const u = new URL(requestUrl);
      return `${u.origin}/p/${slug}`;
    } catch {
      /* ignore */
    }
  }
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}/p/${slug}`;
  return `/p/${slug}`;
}

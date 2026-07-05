import { NextResponse } from 'next/server';
import { randomBytes, scryptSync } from 'node:crypto';
import { INSFORGE_BASE_URL, insforgeAdmin } from '@/lib/insforge';
import { parseOrderTrackingToken } from '@/lib/orderTracking';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 16 * 1024;

type SchemaPrepareResult = {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  message?: string;
};

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

async function readBody(request: Request) {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return null;
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) return null;
  return text ? JSON.parse(text) as Record<string, unknown> : {};
}

async function rawSql(query: string): Promise<SchemaPrepareResult> {
  const apiKey = process.env.INSFORGE_API_KEY;
  if (!apiKey) return { ok: false, skipped: true, message: 'INSFORGE_API_KEY no configurada.' };
  const res = await fetch(`${INSFORGE_BASE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ query }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text().catch(() => '');
  return { ok: res.ok, status: res.status, message: text };
}

async function ensureCustomerAccountsSchema() {
  return rawSql(`
    CREATE TABLE IF NOT EXISTS public.customer_accounts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id text,
      last_order_id text,
      name text NOT NULL,
      email text NOT NULL,
      phone text,
      password_hash text NOT NULL,
      status text DEFAULT 'active',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS order_id text;
    ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS last_order_id text;
    ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS name text;
    ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS email text;
    ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS phone text;
    ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS password_hash text;
    ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
    ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    ALTER TABLE public.customer_accounts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
    CREATE UNIQUE INDEX IF NOT EXISTS customer_accounts_email_idx ON public.customer_accounts (lower(email));
    CREATE INDEX IF NOT EXISTS customer_accounts_order_idx ON public.customer_accounts (order_id) WHERE order_id IS NOT NULL;
  `);
}

async function loadOrder(orderId: string) {
  const { data, error } = await insforgeAdmin.database.from('orders').select('id, customer_name, customer_email, customer_phone, status').eq('id', orderId).limit(1);
  if (error) throw new Error(error.message || 'No se pudo validar la compra.');
  return Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : undefined;
}

async function findExistingCustomer(email: string) {
  try {
    const { data } = await insforgeAdmin.database.from('customer_accounts').select('id').eq('email', email).limit(1);
    return Array.isArray(data) ? (data[0] as { id?: string | number } | undefined)?.id : undefined;
  } catch {
    return undefined;
  }
}

function customerTableHint(schema: SchemaPrepareResult) {
  if (schema.ok) return '';
  if (schema.skipped) return ' Falta INSFORGE_API_KEY para crear la tabla automáticamente.';
  return ` La preparación automática de la tabla falló: ${schema.message || 'sin detalle'}`;
}

export async function POST(request: Request) {
  let schema: SchemaPrepareResult = { ok: false, skipped: false, message: '' };
  try {
    const body = await readBody(request);
    if (!body) return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });

    const token = cleanText(body.token, 600);
    const parsed = parseOrderTrackingToken(token);
    if (!parsed) return NextResponse.json({ error: 'Token de pedido inválido.' }, { status: 401 });

    const order = await loadOrder(parsed.orderId);
    if (!order) return NextResponse.json({ error: 'No se encontró la compra para crear usuario.' }, { status: 404 });

    const name = cleanText(body.name, 120) || cleanText(order.customer_name, 120);
    const email = (cleanText(body.email, 180) || cleanText(order.customer_email, 180)).toLowerCase();
    const phone = cleanText(body.phone, 60) || cleanText(order.customer_phone, 60);
    const password = typeof body.password === 'string' ? body.password : '';
    const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

    if (name.length < 3) return NextResponse.json({ error: 'Ingresa tu nombre completo.' }, { status: 422 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Correo inválido.' }, { status: 422 });
    if (phone.replace(/\D/g, '').length < 8) return NextResponse.json({ error: 'Ingresa un celular válido.' }, { status: 422 });
    if (password.length < 8) return NextResponse.json({ error: 'La contraseña debe tener mínimo 8 caracteres.' }, { status: 422 });
    if (password !== confirmPassword) return NextResponse.json({ error: 'Las contraseñas no coinciden.' }, { status: 422 });

    schema = await ensureCustomerAccountsSchema();

    const now = new Date().toISOString();
    const password_hash = hashPassword(password);
    const payload = {
      order_id: parsed.orderId,
      last_order_id: parsed.orderId,
      name,
      email,
      phone,
      password_hash,
      status: 'active',
      updated_at: now,
    };

    const existingId = await findExistingCustomer(email);
    if (existingId) {
      const { error } = await insforgeAdmin.database.from('customer_accounts').update(payload).eq('id', existingId);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, mode: 'updated', message: 'Usuario actualizado. Ya puedes usar este correo para seguimiento.' });
    }

    const { error } = await insforgeAdmin.database.from('customer_accounts').insert([{ ...payload, created_at: now }]);
    if (error) {
      return NextResponse.json({ error: `No se pudo crear usuario: ${error.message}.${customerTableHint(schema)}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mode: 'created', message: 'Usuario creado. Podrás seguir tus compras con este correo.' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : `No se pudo crear el usuario.${customerTableHint(schema)}` }, { status: 500 });
  }
}

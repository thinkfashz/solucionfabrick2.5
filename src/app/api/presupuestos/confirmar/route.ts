import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Resend } from 'resend';
import { getResendCredentials } from '@/lib/resendCredentials';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';
const DEFAULT_FROM = 'Soluciones Fabrick <onboarding@resend.dev>';

function resolveApiKey(): { key: string; source: 'admin' | 'anon' | 'fallback' } {
  if (process.env.INSFORGE_API_KEY) return { key: process.env.INSFORGE_API_KEY, source: 'admin' };
  if (process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY) return { key: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY, source: 'anon' };
  return { key: 'ik_7e23032539c2dc64d5d27ca29d07b928', source: 'fallback' };
}

function sqlText(value: unknown) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value: unknown) {
  return `${sqlText(JSON.stringify(value ?? {}))}::jsonb`;
}

async function runRawSql(query: string) {
  const { key: apiKey, source } = resolveApiKey();
  const url = `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(30_000),
    cache: 'no-store',
  });
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) return { ok: false, status: res.status, data, keySource: source };
  return { ok: true, status: res.status, data, keySource: source };
}

async function ensureTable() {
  return runRawSql(`
CREATE TABLE IF NOT EXISTS presupuesto_registros (
  id TEXT PRIMARY KEY,
  presupuesto_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'presupuesto',
  proveedor TEXT,
  cliente TEXT NOT NULL,
  numero_cliente TEXT,
  empresa_cliente TEXT,
  titulo TEXT,
  fecha DATE,
  ciudad TEXT,
  estado TEXT,
  valor_neto NUMERIC DEFAULT 0,
  iva_porcentaje NUMERIC DEFAULT 0,
  total_iva NUMERIC DEFAULT 0,
  total_con_iva NUMERIC DEFAULT 0,
  public_link TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  presupuesto_json JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  accepted_via TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE presupuesto_registros ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE presupuesto_registros ADD COLUMN IF NOT EXISTS accepted_via TEXT;
CREATE INDEX IF NOT EXISTS idx_presupuesto_registros_slug ON presupuesto_registros(slug);
CREATE INDEX IF NOT EXISTS idx_presupuesto_registros_generated_at ON presupuesto_registros(generated_at DESC);
`);
}

type ConfirmPayload = Record<string, unknown> & {
  id?: string;
  slug?: string;
  proveedor?: string;
  cliente?: string;
  empresa_cliente?: string;
  telefono_whatsapp?: string;
  email_cliente?: string;
  titulo?: string;
  total_con_iva?: number;
  public_link?: string;
};

function isEmail(value: unknown) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function sendConfirmationEmail(payload: ConfirmPayload) {
  const recipient = isEmail(payload.email_cliente) ? String(payload.email_cliente).trim() : '';
  if (!recipient) return { sent: false, reason: 'missing_email' };
  const creds = await getResendCredentials({ preferDb: true });
  if (!creds?.ready || !creds.apiKey) return { sent: false, reason: 'resend_not_configured' };

  const resend = new Resend(creds.apiKey);
  const from = creds.from || DEFAULT_FROM;
  const total = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(payload.total_con_iva || 0));
  const title = String(payload.titulo || 'Presupuesto Soluciones Fabris');
  const client = String(payload.cliente || 'cliente');
  const company = String(payload.empresa_cliente || client);
  const link = String(payload.public_link || '');

  const { data, error } = await resend.emails.send({
    from,
    to: recipient,
    subject: `Confirmación de presupuesto aceptado — ${company}`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#0a0a0a;color:#ffffff;padding:28px;border-radius:18px">
        <p style="color:#facc15;text-transform:uppercase;letter-spacing:3px;font-size:12px;font-weight:700">Soluciones Fabris</p>
        <h1 style="margin:8px 0 12px;font-size:24px">Presupuesto confirmado</h1>
        <p>Hola ${client}, recibimos la aceptación del presupuesto:</p>
        <p style="font-size:18px;font-weight:700">${title}</p>
        <p><strong>Empresa:</strong> ${company}</p>
        <p><strong>Total:</strong> ${total}</p>
        ${link ? `<p><a href="${link}" style="color:#facc15">Abrir presupuesto</a></p>` : ''}
        <p style="margin-top:22px;color:#d4d4d8;font-size:13px">Este correo confirma que el botón de aceptación fue presionado desde la página pública del presupuesto.</p>
      </div>
    `,
  });
  if (error) return { sent: false, reason: error.message || 'resend_error' };
  return { sent: true, id: data?.id || null };
}

export async function POST(request: NextRequest) {
  let payload: ConfirmPayload;
  try {
    const body = await request.json();
    payload = (body?.presupuesto ?? body) as ConfirmPayload;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!payload?.id || !payload?.slug || !payload?.cliente) {
    return NextResponse.json({ error: 'Faltan campos obligatorios: id, slug y cliente.' }, { status: 400 });
  }

  const ensure = await ensureTable();
  if (!ensure.ok) return NextResponse.json({ error: 'No se pudo preparar el registro.', detail: ensure.data }, { status: 502 });

  const acceptedAt = new Date().toISOString();
  const recordId = `registro_${payload.id}`;
  const meta = {
    accepted: true,
    accepted_at: acceptedAt,
    accepted_via: 'public_whatsapp_button',
    user_agent: request.headers.get('user-agent'),
    ip_hint: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
  };

  const query = `
INSERT INTO presupuesto_registros (
  id, presupuesto_id, slug, document_type, proveedor, cliente, numero_cliente, empresa_cliente, titulo,
  estado, total_con_iva, public_link, meta, presupuesto_json, generated_at, accepted_at, accepted_via, updated_at
) VALUES (
  ${sqlText(recordId)}, ${sqlText(payload.id)}, ${sqlText(payload.slug)}, 'presupuesto', ${sqlText(payload.proveedor)}, ${sqlText(payload.cliente)},
  ${sqlText(payload.telefono_whatsapp)}, ${sqlText(payload.empresa_cliente)}, ${sqlText(payload.titulo)}, 'aprobado', ${Number(payload.total_con_iva || 0)},
  ${sqlText(payload.public_link)}, ${sqlJson(meta)}, ${sqlJson(payload)}, NOW(), ${sqlText(acceptedAt)}, 'whatsapp', NOW()
)
ON CONFLICT (id) DO UPDATE SET
  estado = 'aprobado',
  accepted_at = EXCLUDED.accepted_at,
  accepted_via = EXCLUDED.accepted_via,
  meta = COALESCE(presupuesto_registros.meta, '{}'::jsonb) || EXCLUDED.meta,
  presupuesto_json = EXCLUDED.presupuesto_json,
  updated_at = NOW();
`;

  const saved = await runRawSql(query);
  if (!saved.ok) return NextResponse.json({ error: 'No se pudo registrar la aceptación.', detail: saved.data }, { status: 502 });

  const email = await sendConfirmationEmail(payload).catch((err) => ({ sent: false, reason: (err as Error).message }));
  const phone = String(payload.telefono_whatsapp || '').replace(/[^0-9]/g, '');
  const text = encodeURIComponent(`Hola, confirmo la aceptación del presupuesto "${payload.titulo || ''}" para ${payload.empresa_cliente || payload.cliente}. Link: ${payload.public_link || ''}`);
  const whatsappUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;

  return NextResponse.json({ ok: true, accepted: true, id: recordId, accepted_at: acceptedAt, whatsappUrl, email });
}

import { runRawSql, rows, sqlText } from '@/lib/web-pages/sql';

export type InvoiceRow = {
  id: string;
  tenant_id?: string | null;
  order_id: string | null;
  dte_type: number;
  folio: string | null;
  rut_emisor?: string | null;
  rut_receptor: string | null;
  razon_social_receptor?: string | null;
  neto: number;
  iva: number;
  exento: number;
  total: number;
  sii_status: string | null;
  pdf_url: string | null;
  pdf_token: string | null;
  voided: boolean;
  created_at: string;
};

export async function ensureInvoicesTable() {
  const result = await runRawSql(`
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  order_id TEXT,
  dte_type INTEGER NOT NULL DEFAULT 39,
  folio TEXT,
  rut_emisor TEXT,
  rut_receptor TEXT,
  razon_social_receptor TEXT,
  giro_receptor TEXT,
  direccion_receptor TEXT,
  comuna_receptor TEXT,
  neto NUMERIC DEFAULT 0,
  iva NUMERIC DEFAULT 0,
  exento NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  xml_url TEXT,
  pdf_url TEXT,
  pdf_token TEXT,
  sii_track_id TEXT,
  sii_status TEXT DEFAULT 'pending',
  provider TEXT DEFAULT 'mock',
  provider_payload JSONB DEFAULT '{}'::jsonb,
  voided BOOLEAN DEFAULT FALSE,
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS dte_type INTEGER NOT NULL DEFAULT 39;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS folio TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS rut_emisor TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS rut_receptor TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS razon_social_receptor TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS giro_receptor TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS direccion_receptor TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS comuna_receptor TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS neto NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS iva NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exento NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS xml_url TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_token TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sii_track_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sii_status TEXT DEFAULT 'pending';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'mock';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS provider_payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS voided BOOLEAN DEFAULT FALSE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_created ON invoices(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_order_dte ON invoices(order_id, dte_type);
CREATE INDEX IF NOT EXISTS idx_invoices_sii_status ON invoices(sii_status);
`);
  if (!result.ok) throw new Error(JSON.stringify(result.data));
  return result;
}

export async function listInvoices(limit = 200) {
  await ensureInvoicesTable();
  const result = await runRawSql(`
SELECT id::text, tenant_id::text, order_id, dte_type, folio, rut_emisor, rut_receptor, razon_social_receptor,
       COALESCE(neto,0)::float AS neto,
       COALESCE(iva,0)::float AS iva,
       COALESCE(exento,0)::float AS exento,
       COALESCE(total,0)::float AS total,
       sii_status, pdf_url, pdf_token, COALESCE(voided,false) AS voided, created_at::text
FROM invoices
ORDER BY created_at DESC
LIMIT ${Math.max(1, Math.min(500, Math.round(limit)))};
`);
  if (!result.ok) throw new Error(JSON.stringify(result.data));
  return rows(result) as InvoiceRow[];
}

export async function markInvoiceVoided(invoiceId: string) {
  await ensureInvoicesTable();
  const result = await runRawSql(`UPDATE invoices SET voided = TRUE, voided_at = NOW(), updated_at = NOW() WHERE id::text = ${sqlText(invoiceId)};`);
  if (!result.ok) throw new Error(JSON.stringify(result.data));
  return result;
}

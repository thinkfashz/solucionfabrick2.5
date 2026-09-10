import { readFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = (process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_URL || '').replace(/\/+$/, '');
const apiKey = (process.env.INSFORGE_API_KEY || '').trim();
const isVercel = process.env.VERCEL === '1';

if (!baseUrl || !apiKey) {
  const message = '[customer-data-migration] Falta NEXT_PUBLIC_INSFORGE_URL/INSFORGE_URL o INSFORGE_API_KEY.';
  if (isVercel) {
    console.error(message);
    process.exit(1);
  }
  console.warn(`${message} Se omite fuera de Vercel.`);
  process.exit(0);
}

const migrationPath = path.join(process.cwd(), 'migrations', '20260910_customer_data_crm.sql');
const sql = await readFile(migrationPath, 'utf8');
const endpoint = `${baseUrl}/api/database/advance/rawsql`;

try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ query: sql }),
    signal: AbortSignal.timeout(45_000),
  });
  const body = await response.text();
  if (!response.ok) {
    console.error(`[customer-data-migration] HTTP ${response.status}: ${body.slice(0, 2200)}`);
    process.exit(1);
  }
  console.log('[customer-data-migration] 20260910_customer_data_crm aplicado/verificado correctamente.');
} catch (error) {
  console.error('[customer-data-migration] Error:', error instanceof Error ? error.message : error);
  process.exit(1);
}

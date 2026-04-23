import { NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl =
    process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';
  const anonKey =
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';

  const client = createClient({ baseUrl, anonKey });

  const results: Record<string, unknown> = {
    config: {
      baseUrl,
      anonKeyPrefix: anonKey.slice(0, 8) + '...',
    },
  };

  // Test each table
  const tables = ['products', 'orders', 'leads', 'projects', 'categories', 'admin_users'];
  for (const table of tables) {
    try {
      const { data, error, count } = await client.database
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);
      results[table] = error
        ? { ok: false, error: error.message ?? JSON.stringify(error) }
        : { ok: true, rows: count ?? (data?.length ?? 0) };
    } catch (e) {
      results[table] = { ok: false, error: (e as Error).message };
    }
  }

  // Test products with exact select the page uses
  try {
    const { data, error } = await client.database
      .from('products')
      .select('id, name, description, price, stock, image_url, featured, activo, tagline, category_id, created_at')
      .limit(1);
    results['products_select_exacto'] = error
      ? { ok: false, error: error.message ?? JSON.stringify(error) }
      : { ok: true, sample: data?.[0] ?? null };
  } catch (e) {
    results['products_select_exacto'] = { ok: false, error: (e as Error).message };
  }

  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

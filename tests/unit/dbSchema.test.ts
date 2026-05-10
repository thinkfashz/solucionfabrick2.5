import { describe, expect, it } from 'vitest';
import { DB_SCHEMA_SQL } from '@/lib/db-schema';

describe('DB_SCHEMA_SQL', () => {
  it('es un string no vacío', () => {
    expect(typeof DB_SCHEMA_SQL).toBe('string');
    expect(DB_SCHEMA_SQL.length).toBeGreaterThan(100);
  });

  it('declara las tablas core con CREATE TABLE IF NOT EXISTS (idempotente)', () => {
    for (const table of [
      'products',
      'orders',
      'order_items',
      'deliveries',
      'admin_users',
      'payment_webhooks',
    ]) {
      expect(DB_SCHEMA_SQL).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${table}\\b`, 'i'));
    }
  });

  it('payment_webhooks.idempotency_key es UNIQUE NOT NULL', () => {
    expect(DB_SCHEMA_SQL).toMatch(/idempotency_key[\s\S]*UNIQUE[\s\S]*NOT NULL/i);
  });

  it('order_items.order_id y product_id son ON DELETE CASCADE', () => {
    expect(DB_SCHEMA_SQL).toMatch(/REFERENCES\s+orders\(id\)\s+ON DELETE CASCADE/i);
    expect(DB_SCHEMA_SQL).toMatch(/REFERENCES\s+products\(id\)\s+ON DELETE CASCADE/i);
  });

  it('declara función set_updated_at y triggers idempotentes', () => {
    expect(DB_SCHEMA_SQL).toMatch(/CREATE OR REPLACE FUNCTION\s+set_updated_at/i);
    expect(DB_SCHEMA_SQL).toMatch(/trg_products_updated_at/);
    expect(DB_SCHEMA_SQL).toMatch(/trg_orders_updated_at/);
    // Triggers se crean dentro de IF NOT EXISTS para no fallar en re-runs
    expect(DB_SCHEMA_SQL).toMatch(/IF NOT EXISTS[\s\S]*pg_trigger/i);
  });

  it('no contiene sintaxis Supabase no soportada por InsForge', () => {
    // InsForge raw SQL endpoint NO soporta auth.jwt(), auth.uid(), ENABLE ROW LEVEL SECURITY
    expect(DB_SCHEMA_SQL).not.toMatch(/auth\.jwt\s*\(/i);
    expect(DB_SCHEMA_SQL).not.toMatch(/auth\.uid\s*\(/i);
    expect(DB_SCHEMA_SQL).not.toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(DB_SCHEMA_SQL).not.toMatch(/CREATE\s+POLICY/i);
  });

  it('orders.currency tiene default CLP', () => {
    expect(DB_SCHEMA_SQL).toMatch(/currency[\s\S]*DEFAULT\s+'CLP'/i);
  });
});

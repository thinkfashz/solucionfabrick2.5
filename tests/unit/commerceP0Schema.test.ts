import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'scripts/ensure-commerce-p0-schema.mjs'), 'utf8');

describe('commerce P0 schema bootstrap', () => {
  it('crea reservas con los cuatro estados requeridos y TTL', () => {
    expect(source).toContain('inventory_reservations');
    expect(source).toContain("'reserved','committed','released','expired'");
    expect(source).toContain('expires_at');
  });

  it('reserva y bloquea stock en PostgreSQL', () => {
    expect(source).toContain('commerce_create_order_with_reservations');
    expect(source).toMatch(/FOR UPDATE/);
    expect(source).toContain('INSUFFICIENT_STOCK');
  });

  it('commit de reserva descuenta stock y es repetible sin doble descuento', () => {
    expect(source).toContain('commerce_commit_order_reservation');
    expect(source).toContain("IF r.status = 'committed' THEN CONTINUE");
    expect(source).toContain('stock = v_stock - r.quantity');
  });

  it('incluye release y expiración de reservas', () => {
    expect(source).toContain('commerce_release_order_reservation');
    expect(source).toContain('commerce_expire_reservations');
  });

  it('persiste auditoría de monto y moneda esperados/recibidos', () => {
    for (const column of ['expected_payment_amount', 'received_payment_amount', 'expected_payment_currency', 'received_payment_currency', 'payment_validation_result']) {
      expect(source).toContain(column);
    }
  });
});

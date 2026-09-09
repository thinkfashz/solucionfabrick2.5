import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const home = readFileSync('src/components/store/TiendaClientV2.tsx', 'utf8');
const catalog = readFileSync('src/app/tienda/catalogo/CatalogoClient.tsx', 'utf8');
const detail = readFileSync('src/components/store/ProductDetailClientV2.tsx', 'utf8');
const checkout = readFileSync('src/components/checkout/CheckoutAppV2.tsx', 'utf8');
const checkoutApi = readFileSync('src/app/api/checkout/route.ts', 'utf8');

describe('storefront commerce contract', () => {
  it('keeps the two calculators as first-class pre-purchase paths', () => {
    expect(home).toContain('Calcula tu radier ideal');
    expect(home).toContain("/herramientas/radier");
    expect(home).toContain('Calcula tu aire ideal');
    expect(home).toContain("/herramientas/aire-acondicionado");
  });

  it('exposes a complete searchable catalog and best-seller section', () => {
    expect(catalog).toContain('Todos los productos');
    expect(catalog).toContain('Productos');
    expect(catalog).toContain('más comprados');
    expect(catalog).toContain('catalog-search');
    expect(catalog).toContain('selectedCategory');
  });

  it('links calculator-adjacent product details back to the correct calculator', () => {
    expect(detail).toContain('Calcular mi radier');
    expect(detail).toContain("/herramientas/radier");
    expect(detail).toContain('Calcular mi aire ideal');
    expect(detail).toContain("/herramientas/aire-acondicionado");
  });

  it('keeps processing, approved and rejected/review states in the existing checkout', () => {
    expect(checkout).toContain("'pending'");
    expect(checkout).toContain("'approved'");
    expect(checkout).toContain("'failed'");
    expect(checkout).toContain("'review'");
    expect(checkout).toContain('StatusView');
  });

  it('does not invent a direct bank-transfer backend while Mercado Pago is authoritative', () => {
    expect(checkoutApi).toContain("paymentMethod: 'mercadopago'");
    expect(checkoutApi).toContain('createMercadoPagoPreference');
    expect(checkoutApi).toContain('createOrderWithReservations');
  });
});

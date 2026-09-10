import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const home = readFileSync('src/components/store/TiendaClientV2.tsx', 'utf8');
const catalog = readFileSync('src/app/tienda/catalogo/CatalogoClient.tsx', 'utf8');
const detail = readFileSync('src/components/store/ProductDetailClientV2.tsx', 'utf8');
const chrome = readFileSync('src/components/store/StorefrontChrome.tsx', 'utf8');
const cartDrawer = readFileSync('src/components/store/CartDrawer.tsx', 'utf8');
const checkout = readFileSync('src/components/checkout/CheckoutAppV2.tsx', 'utf8');
const checkoutApi = readFileSync('src/app/api/checkout/route.ts', 'utf8');
const visuals = readFileSync('src/lib/storeProductVisuals.ts', 'utf8');
const toolCanvas = readFileSync('src/components/store/StoreToolCanvas.tsx', 'utf8');

describe('storefront commerce contract', () => {
  it('keeps the two calculators as first-class pre-purchase paths with explicit media', () => {
    expect(home).toContain('Calcula tu radier ideal');
    expect(home).toContain("/herramientas/radier");
    expect(home).toContain('Calcula tu aire ideal');
    expect(home).toContain("/herramientas/aire-acondicionado");
    expect(home).toContain('kind="radier"');
    expect(home).toContain('kind="air"');
    expect(toolCanvas).toContain('requestAnimationFrame');
    expect(toolCanvas).toContain('SISTEMA CONSTRUCTIVO 4D');
    expect(toolCanvas).toContain('FLUJO 3D · INVERTER');
    expect(visuals).toContain('air-split-premium-v10.png');
    expect(home).toContain('STORE_VISUALS.hero');
  });

  it('uses one visible top search and keeps catalog filtering connected invisibly', () => {
    expect(chrome).toContain('¿Qué estás buscando para tu proyecto?');
    expect(chrome).toContain('syncCatalogSearch');
    expect(catalog).toContain('id="catalog-search"');
    expect(catalog).toContain('className="sr-only"');
    expect(home).toContain('id="catalog-search"');
    expect(home).not.toContain('store-home-search');
  });

  it('exposes a two-column vertical mobile catalog and stable 9K/12K conditioner images', () => {
    expect(catalog).toContain('Todos los productos');
    expect(catalog).toContain('Productos');
    expect(catalog).toContain('más comprados');
    expect(catalog).toContain('grid grid-cols-2');
    expect(catalog).toContain('Desliza hacia abajo');
    expect(catalog).toContain('resolveStoreProductImage');
    expect(visuals).toContain('air-9k-v7.png');
    expect(visuals).toContain('air-12k-v7.png');
    expect(catalog).toContain('selectedCategory');
  });

  it('opens the existing cart drawer from the native mobile dock before checkout', () => {
    expect(chrome).toContain('onClick={openCart}');
    expect(chrome).not.toContain("nav('/checkout?cart=1')");
    expect(cartDrawer).toContain('onCheckout');
    expect(cartDrawer).toContain('Continuar compra');
    expect(cartDrawer).toContain('Total del producto');
    expect(cartDrawer).toContain('category_name');
  });

  it('keeps the home cart image aligned with the product image the user actually saw', () => {
    expect(home).toContain('image_url: productImage(product)');
    expect(home).toContain('resolveStoreProductImage');
    expect(visuals).toContain('air-9k-v7.png');
    expect(visuals).toContain('air-12k-v7.png');
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

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Funnel BTU contract', () => {
  it('Home envía climatización directamente a la calculadora', () => {
    const home = source('src/components/landing/HomePremiumV10.tsx');
    expect(home).toContain("href: '/herramientas/aire-acondicionado'");
    expect(home).toContain('Calcular BTU');
    expect(home).toContain('Calcular aire ideal');
  });

  it('la página precarga catálogo real en servidor antes del cliente', () => {
    const page = source('src/app/herramientas/aire-acondicionado/page.tsx');
    expect(page).toContain('preloadAirCatalogProducts');
    expect(page).toContain('<AirCalculatorFunnelV8 initialProducts={initialProducts} />');
    expect(page).toContain("export const runtime = 'nodejs'");
  });

  it('la compra final sigue entrando por el checkout seguro existente', () => {
    const funnel = source('src/components/store/AirCalculatorFunnelV8.tsx');
    expect(funnel).toContain("router.push(`/checkout?");
    expect(funnel).toContain('Checkout recalcula desde servidor');
    expect(funnel).toContain('Stock reservado');
  });

  it('el recomendador no habilita compra directa cuando el cálculo requiere múltiples unidades', () => {
    const funnel = source('src/components/store/AirCalculatorFunnelV8.tsx');
    expect(funnel).toContain('sizing.requiresMultiUnit');
    expect(funnel).toContain('no habilitamos compra directa');
  });
});

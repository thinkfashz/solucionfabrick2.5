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
    expect(page).toContain('<AirSimulatorFunnelV9 initialProducts={initialProducts} />');
    expect(page).toContain("export const runtime = 'nodejs'");
  });

  it('la compra final sigue entrando por el checkout seguro existente', () => {
    const funnel = source('src/components/store/AirSimulatorFunnelV9.tsx');
    expect(funnel).toContain("router.push(`/checkout?");
    expect(funnel).toContain('Checkout recalcula desde servidor');
    expect(funnel).toContain('Stock reservado');
  });

  it('el recomendador bloquea compra directa cuando el cálculo requiere múltiples unidades', () => {
    const funnel = source('src/components/store/AirSimulatorFunnelV9.tsx');
    expect(funnel).toContain('sizing.requiresMultiUnit');
    expect(funnel).toContain('bloqueamos compra directa');
    expect(funnel).toContain("disabled={sizing.requiresMultiUnit}");
  });

  it('incluye visor 3D, control térmico y consumo animado', () => {
    const funnel = source('src/components/store/AirSimulatorFunnelV9.tsx');
    expect(funnel).toContain('Visor climático 3D');
    expect(funnel).toContain('Control simulado');
    expect(funnel).toContain('Consumo animado');
    expect(funnel).toContain('Costo eléctrico estimado');
    expect(funnel).toContain('Temperatura objetivo');
  });

  it('muestra habitación, living, oficina y cocina desde perfiles térmicos', () => {
    const engine = source('src/lib/airConditioning.ts');
    expect(engine).toContain("label: 'Habitación'");
    expect(engine).toContain("label: 'Living'");
    expect(engine).toContain("label: 'Oficina'");
    expect(engine).toContain("label: 'Cocina'");
    expect(engine).toContain('internalLoadBtu');
  });

  it('conecta referencias reales Ahorro/Recomendado/Premium al catálogo', () => {
    const funnel = source('src/components/store/AirSimulatorFunnelV9.tsx');
    expect(funnel).toContain("label: 'Ahorro'");
    expect(funnel).toContain("label: 'Recomendado'");
    expect(funnel).toContain("label: 'Premium'");
    expect(funnel).toContain('recommendAirProductTiers');
    expect(funnel).toContain('distinctTierEntries');
  });

  it('mantiene separado el BTU objetivo de la capacidad real mostrada', () => {
    const funnel = source('src/components/store/AirSimulatorFunnelV9.tsx');
    expect(funnel).toContain('targetCapacityLabel');
    expect(funnel).toContain('displayedProductCapacityLabel');
    expect(funnel).toContain('BTU real');
    expect(funnel).toContain('No cambiamos tu cálculo para forzar una venta');
  });

  it('calcula consumo con la capacidad real del equipo mostrado cuando existe', () => {
    const funnel = source('src/components/store/AirSimulatorFunnelV9.tsx');
    expect(funnel).toContain('capacityBtu: primary?.capacity ||');
    expect(funnel).toContain('electricityRateClpKwh: DEFAULT_ELECTRICITY_RATE_CLP_KWH');
  });

  it('explica inverter con ahorro estimado y advertencia de variabilidad', () => {
    const funnel = source('src/components/store/AirSimulatorFunnelV9.tsx');
    expect(funnel).toContain('¿Por qué inverter?');
    expect(funnel).toContain('estimatedSavingsPercent');
    expect(funnel).toContain('El consumo real depende del modelo');
  });
});

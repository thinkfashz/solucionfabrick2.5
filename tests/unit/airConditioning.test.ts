import { describe, expect, it } from 'vitest';
import {
  calculateAirSizing,
  detectAirCapacity,
  estimateAirEnergy,
  getAirRoomProfile,
  normalizeAirCatalogProducts,
  recommendAirProductTiers,
  recommendAirProducts,
  type AirCatalogProduct,
} from '@/lib/airConditioning';

const base = {
  lengthM: 3.2,
  widthM: 3,
  heightM: 2.4,
  people: 1,
  roomType: 'dormitorio' as const,
  sunExposure: 'media' as const,
  insulation: 'normal' as const,
  climateZone: 'centro' as const,
  windowAreaM2: 1.5,
};

describe('calculateAirSizing', () => {
  it('entrega 9K para un dormitorio pequeño típico', () => {
    const result = calculateAirSizing(base);
    expect(result.areaM2).toBe(9.6);
    expect(result.recommendedCapacity).toBe(9000);
    expect(result.requiresMultiUnit).toBe(false);
  });

  it('lleva un living mediano a una capacidad superior cuando corresponde', () => {
    const result = calculateAirSizing({
      ...base,
      lengthM: 5,
      widthM: 4,
      heightM: 2.5,
      people: 4,
      roomType: 'living',
      windowAreaM2: 4,
    });
    expect(result.requiredBtu).toBeGreaterThan(12000);
    expect(result.recommendedCapacity).toBe(18000);
  });

  it('aumenta la carga con sol alto y aislación baja', () => {
    const normal = calculateAirSizing(base);
    const demanding = calculateAirSizing({ ...base, sunExposure: 'alta', insulation: 'baja' });
    expect(demanding.requiredBtu).toBeGreaterThan(normal.requiredBtu);
  });

  it('el uso del recinto cambia la carga térmica sin falsificar el escalón comercial', () => {
    const bedroom = calculateAirSizing({ ...base, lengthM: 4.2, widthM: 3.5, people: 2, roomType: 'dormitorio' });
    const office = calculateAirSizing({ ...base, lengthM: 4.2, widthM: 3.5, people: 2, roomType: 'oficina' });
    const kitchen = calculateAirSizing({ ...base, lengthM: 4.2, widthM: 3.5, people: 2, roomType: 'cocina' });
    expect(office.requiredBtu).toBeGreaterThan(bedroom.requiredBtu);
    expect(kitchen.requiredBtu).toBeGreaterThan(office.requiredBtu);
  });

  it('expone perfiles explicativos por habitación', () => {
    expect(getAirRoomProfile('dormitorio').label).toBe('Habitación');
    expect(getAirRoomProfile('oficina').internalLoadBtu).toBeGreaterThan(0);
    expect(getAirRoomProfile('cocina').emoji).toBe('🍳');
  });

  it('no fuerza una compra de 24K cuando el espacio requiere múltiples unidades', () => {
    const result = calculateAirSizing({
      ...base,
      lengthM: 8,
      widthM: 6,
      heightM: 2.8,
      people: 6,
      roomType: 'cocina',
      sunExposure: 'alta',
      insulation: 'baja',
      climateZone: 'norte',
      windowAreaM2: 8,
    });
    expect(result.requiredBtu).toBeGreaterThan(24000);
    expect(result.requiresMultiUnit).toBe(true);
    expect(result.minimumUnits).toBeGreaterThanOrEqual(2);
  });

  it('siempre devuelve capacidades comerciales soportadas', () => {
    for (const area of [6, 12, 20, 32, 50]) {
      const result = calculateAirSizing({ ...base, lengthM: area / 3, widthM: 3 });
      expect([9000, 12000, 18000, 24000]).toContain(result.recommendedCapacity);
      expect([9000, 12000, 18000, 24000]).toContain(result.perUnitCapacity);
    }
  });
});

describe('estimateAirEnergy', () => {
  it('sube el consumo al exigir una temperatura más baja', () => {
    const comfortable = estimateAirEnergy({ capacityBtu: 12000, targetTempC: 24, ambientTempC: 30, hoursPerDay: 8 });
    const cold = estimateAirEnergy({ capacityBtu: 12000, targetTempC: 18, ambientTempC: 30, hoursPerDay: 8 });
    expect(cold.electricalKwNow).toBeGreaterThan(comfortable.electricalKwNow);
    expect(cold.monthlyCostClp).toBeGreaterThan(comfortable.monthlyCostClp);
  });

  it('proyecta consumo y costo mensuales positivos', () => {
    const result = estimateAirEnergy({ capacityBtu: 9000, targetTempC: 23, ambientTempC: 30, hoursPerDay: 6, electricityRateClpKwh: 240 });
    expect(result.electricalKwNow).toBeGreaterThan(0);
    expect(result.monthlyKwh).toBeGreaterThan(0);
    expect(result.monthlyCostClp).toBeGreaterThan(0);
    expect(['Bajo', 'Medio', 'Alto']).toContain(result.loadLabel);
  });

  it('compara inverter contra tradicional sin prometer ahorro fijo', () => {
    const result = estimateAirEnergy({ capacityBtu: 18000, targetTempC: 22, ambientTempC: 32, hoursPerDay: 8 });
    expect(result.traditionalMonthlyKwh).toBeGreaterThan(result.monthlyKwh);
    expect(result.estimatedMonthlySavingsClp).toBeGreaterThan(0);
    expect(result.estimatedSavingsPercent).toBeGreaterThan(0);
    expect(result.estimatedSavingsPercent).toBeLessThan(60);
  });

  it('escala el consumo al requerir múltiples unidades', () => {
    const one = estimateAirEnergy({ capacityBtu: 12000, unitCount: 1 });
    const two = estimateAirEnergy({ capacityBtu: 12000, unitCount: 2 });
    expect(two.electricalKwNow).toBeCloseTo(one.electricalKwNow * 2, 2);
  });
});

describe('detectAirCapacity', () => {
  it('detecta variantes 9K, 12.000 y 18000 BTU', () => {
    expect(detectAirCapacity({ id: '1', name: 'Split Inverter 9K BTU', price: 1 })).toBe(9000);
    expect(detectAirCapacity({ id: '2', name: 'Aire 12.000 BTU', price: 1 })).toBe(12000);
    expect(detectAirCapacity({ id: '3', name: 'Climatizador 18000 btu', price: 1 })).toBe(18000);
  });

  it('lee capacidad desde especificaciones', () => {
    expect(detectAirCapacity({ id: '1', name: 'Aire Inverter', price: 1, specifications: { capacidad: '24.000 BTU' } })).toBe(24000);
  });
});

describe('normalizeAirCatalogProducts', () => {
  it('descarta filas inválidas, duplicadas y normaliza stock/descuento', () => {
    const result = normalizeAirCatalogProducts([
      { id: 'a', name: 'Aire 9K', price: 250000, stock: 4, discount_percentage: 10 },
      { id: 'a', name: 'Duplicado', price: 1 },
      { id: '', name: 'Inválido', price: 1 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].stock).toBe(4);
    expect(result[0].discount_percentage).toBe(10);
  });
});

describe('recommendAirProducts', () => {
  const products: AirCatalogProduct[] = [
    { id: '9a', name: 'Split Inverter 9.000 BTU A', price: 290000, stock: 5, rating: 4.8, featured: true },
    { id: '9b', name: 'Split Inverter 9K BTU B', price: 270000, stock: 3, rating: 4.5 },
    { id: '12', name: 'Split Inverter 12.000 BTU', price: 330000, stock: 8, rating: 4.9 },
    { id: '18', name: 'Split 18.000 BTU', price: 410000, stock: 2 },
    { id: 'sold', name: 'Split Inverter 9.000 BTU agotado', price: 200000, stock: 0 },
    { id: 'other', name: 'Cemento 25 kg', price: 6000, stock: 10 },
  ];

  it('devuelve varias alternativas reales y prioriza la capacidad ideal', () => {
    const sizing = calculateAirSizing(base);
    const result = recommendAirProducts(products, sizing, 4);
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result[0].capacity).toBe(9000);
    expect(result[0].match).toBe('ideal');
    expect(result.some((entry) => entry.product.id === 'sold')).toBe(false);
    expect(result.some((entry) => entry.product.id === 'other')).toBe(false);
  });

  it('nunca recomienda una capacidad inferior a la calculada', () => {
    const sizing = calculateAirSizing({ ...base, lengthM: 5, widthM: 4, people: 4, roomType: 'living', windowAreaM2: 4 });
    const result = recommendAirProducts(products, sizing, 4);
    expect(result.every((entry) => entry.capacity >= sizing.recommendedCapacity)).toBe(true);
  });

  it('aplica descuento solo a la presentación comercial', () => {
    const sizing = calculateAirSizing(base);
    const result = recommendAirProducts([
      { id: 'sale', name: 'Split Inverter 9.000 BTU', price: 300000, stock: 2, discount_percentage: 10 },
    ], sizing);
    expect(result[0].finalPrice).toBe(270000);
  });

  it('construye referencias Ahorro, Recomendado y Premium desde productos compatibles', () => {
    const sizing = calculateAirSizing(base);
    const tiers = recommendAirProductTiers(products, sizing);
    expect(tiers.economy).toBeTruthy();
    expect(tiers.recommended).toBeTruthy();
    expect(tiers.premium).toBeTruthy();
    expect(tiers.economy?.finalPrice).toBeLessThanOrEqual(tiers.recommended?.finalPrice || Infinity);
    expect([tiers.economy?.product.id, tiers.recommended?.product.id, tiers.premium?.product.id].every(Boolean)).toBe(true);
  });
});

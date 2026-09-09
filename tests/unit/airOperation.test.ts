import { describe, expect, it } from 'vitest';
import { resolveAirMode, simulateAirOperation } from '@/lib/airOperation';

const base = {
  powerOn: true,
  mode: 'cool' as const,
  fanSpeed: 'auto' as const,
  eco: false,
  sleep: false,
  turbo: false,
  swing: true,
  baseElectricalKw: 1.2,
  baseLoadPercent: 72,
  unitCount: 1,
  ambientTempC: 30,
  targetTempC: 23,
  hoursPerDay: 8,
  electricityRateClpKwh: 240,
};

describe('air operation simulator', () => {
  it('apaga consumo y flujo cuando el equipo está apagado', () => {
    const result = simulateAirOperation({ ...base, powerOn: false });
    expect(result.electricalKwNow).toBe(0);
    expect(result.monthlyKwh).toBe(0);
    expect(result.monthlyCostClp).toBe(0);
    expect(result.airflowPercent).toBe(0);
    expect(result.compressorActive).toBe(false);
  });

  it('modo ventilador evita uso del compresor', () => {
    const result = simulateAirOperation({ ...base, mode: 'fan', fanSpeed: 'low' });
    expect(result.compressorActive).toBe(false);
    expect(result.electricalKwNow).toBeGreaterThan(0);
    expect(result.electricalKwNow).toBeLessThan(0.1);
  });

  it('eco reduce potencia y costo frente a frío normal', () => {
    const normal = simulateAirOperation(base);
    const eco = simulateAirOperation({ ...base, eco: true });
    expect(eco.electricalKwNow).toBeLessThan(normal.electricalKwNow);
    expect(eco.monthlyCostClp).toBeLessThan(normal.monthlyCostClp);
  });

  it('turbo aumenta la respuesta y fuerza ventilador alto', () => {
    const normal = simulateAirOperation(base);
    const turbo = simulateAirOperation({ ...base, turbo: true });
    expect(turbo.electricalKwNow).toBeGreaterThan(normal.electricalKwNow);
    expect(turbo.fanSpeed).toBe('high');
    expect(turbo.airflowPercent).toBeGreaterThanOrEqual(normal.airflowPercent);
  });

  it('sueño baja ventilador y consumo', () => {
    const normal = simulateAirOperation(base);
    const sleep = simulateAirOperation({ ...base, sleep: true });
    expect(sleep.fanSpeed).toBe('low');
    expect(sleep.electricalKwNow).toBeLessThan(normal.electricalKwNow);
  });

  it('auto decide frío, calor o ventilación según diferencia térmica', () => {
    expect(resolveAirMode('auto', 30, 23)).toBe('cool');
    expect(resolveAirMode('auto', 18, 23)).toBe('heat');
    expect(resolveAirMode('auto', 23.4, 23)).toBe('fan');
  });

  it('modo seco consume menos que frío bajo la misma carga', () => {
    const cool = simulateAirOperation(base);
    const dry = simulateAirOperation({ ...base, mode: 'dry' });
    expect(dry.electricalKwNow).toBeLessThan(cool.electricalKwNow);
    expect(dry.resolvedMode).toBe('dry');
  });
});

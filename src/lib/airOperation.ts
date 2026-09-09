export type AirMode = 'auto' | 'cool' | 'dry' | 'fan' | 'heat';
export type ResolvedAirMode = Exclude<AirMode, 'auto'>;
export type AirFanSpeed = 'auto' | 'low' | 'medium' | 'high';

export const AIR_MODE_LABELS: Record<AirMode, string> = {
  auto: 'Auto',
  cool: 'Frío',
  dry: 'Seco',
  fan: 'Ventilar',
  heat: 'Calor',
};

export const AIR_FAN_LABELS: Record<AirFanSpeed, string> = {
  auto: 'Auto',
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

export type AirOperationInput = {
  powerOn: boolean;
  mode: AirMode;
  fanSpeed: AirFanSpeed;
  eco: boolean;
  sleep: boolean;
  turbo: boolean;
  swing: boolean;
  baseElectricalKw: number;
  baseLoadPercent: number;
  unitCount: number;
  ambientTempC: number;
  targetTempC: number;
  hoursPerDay: number;
  electricityRateClpKwh: number;
};

export type AirOperationResult = {
  resolvedMode: ResolvedAirMode;
  fanSpeed: Exclude<AirFanSpeed, 'auto'>;
  compressorActive: boolean;
  electricalKwNow: number;
  monthlyKwh: number;
  monthlyCostClp: number;
  loadPercent: number;
  loadLabel: 'Apagado' | 'Suave' | 'Medio' | 'Alto' | 'Máximo';
  airflowPercent: number;
  responseIndex: number;
};

const FAN_KW_PER_UNIT: Record<Exclude<AirFanSpeed, 'auto'>, number> = {
  low: 0.018,
  medium: 0.03,
  high: 0.047,
};

function round(value: number, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function resolveAirMode(mode: AirMode, ambientTempC: number, targetTempC: number): ResolvedAirMode {
  if (mode !== 'auto') return mode;
  const delta = ambientTempC - targetTempC;
  if (delta >= 1) return 'cool';
  if (delta <= -1) return 'heat';
  return 'fan';
}

export function resolveFanSpeed(
  requested: AirFanSpeed,
  loadPercent: number,
  options: { sleep: boolean; turbo: boolean },
): Exclude<AirFanSpeed, 'auto'> {
  if (options.sleep) return 'low';
  if (options.turbo) return 'high';
  if (requested !== 'auto') return requested;
  if (loadPercent >= 72) return 'high';
  if (loadPercent >= 38) return 'medium';
  return 'low';
}

function loadLabel(powerOn: boolean, loadPercent: number): AirOperationResult['loadLabel'] {
  if (!powerOn) return 'Apagado';
  if (loadPercent < 28) return 'Suave';
  if (loadPercent < 58) return 'Medio';
  if (loadPercent < 88) return 'Alto';
  return 'Máximo';
}

export function simulateAirOperation(input: AirOperationInput): AirOperationResult {
  const unitCount = Math.max(1, Math.trunc(input.unitCount || 1));
  const baseLoad = clamp(Number(input.baseLoadPercent) || 0, 0, 100);
  const resolvedMode = resolveAirMode(input.mode, input.ambientTempC, input.targetTempC);
  const fanSpeed = resolveFanSpeed(input.fanSpeed, baseLoad, { sleep: input.sleep, turbo: input.turbo });

  if (!input.powerOn) {
    return {
      resolvedMode,
      fanSpeed,
      compressorActive: false,
      electricalKwNow: 0,
      monthlyKwh: 0,
      monthlyCostClp: 0,
      loadPercent: 0,
      loadLabel: 'Apagado',
      airflowPercent: 0,
      responseIndex: 0,
    };
  }

  const fanKw = FAN_KW_PER_UNIT[fanSpeed] * unitCount + (input.swing ? 0.003 * unitCount : 0);
  const compressorBaseline = Math.max(0, Number(input.baseElectricalKw || 0) - 0.035 * unitCount);

  let compressorFactor = 1;
  if (resolvedMode === 'fan') compressorFactor = 0;
  else if (resolvedMode === 'dry') compressorFactor = 0.62;
  else if (resolvedMode === 'heat') compressorFactor = 0.94;

  if (input.eco && resolvedMode !== 'fan') compressorFactor *= 0.8;
  if (input.sleep && resolvedMode !== 'fan') compressorFactor *= 0.9;
  if (input.turbo && resolvedMode !== 'fan' && !input.eco) compressorFactor *= 1.16;

  const compressorKw = compressorBaseline * compressorFactor;
  const electricalKwNow = Math.max(0, compressorKw + fanKw);
  const monthlyKwh = electricalKwNow * clamp(input.hoursPerDay, 0, 24) * 30;
  const monthlyCostClp = monthlyKwh * Math.max(0, input.electricityRateClpKwh || 0);

  let loadPercent = resolvedMode === 'fan'
    ? ({ low: 12, medium: 18, high: 24 } as const)[fanSpeed]
    : baseLoad * compressorFactor;
  loadPercent += fanSpeed === 'high' ? 4 : fanSpeed === 'medium' ? 2 : 0;
  loadPercent = clamp(loadPercent, 0, 100);

  const airflowPercent = clamp(
    ({ low: 38, medium: 64, high: 92 } as const)[fanSpeed] + (input.turbo ? 8 : 0) - (input.sleep ? 12 : 0),
    18,
    100,
  );

  const responseIndex = resolvedMode === 'fan'
    ? 0.2
    : resolvedMode === 'dry'
      ? 0.5
      : clamp(0.55 + loadPercent / 85, 0.55, 1.7);

  return {
    resolvedMode,
    fanSpeed,
    compressorActive: resolvedMode !== 'fan' && compressorKw > 0,
    electricalKwNow: round(electricalKwNow),
    monthlyKwh: round(monthlyKwh, 1),
    monthlyCostClp: Math.round(monthlyCostClp),
    loadPercent: Math.round(loadPercent),
    loadLabel: loadLabel(true, loadPercent),
    airflowPercent: Math.round(airflowPercent),
    responseIndex: round(responseIndex, 2),
  };
}

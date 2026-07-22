export type Soil = 'rock' | 'firm' | 'soft' | 'fill';
export type Condition = 'new' | 'maintained' | 'aged' | 'deficient';
export type Anchoring = 'reinforced' | 'standard' | 'poor';
export type Direction = 'x' | 'z' | 'multi';

export type SimulatorSettings = {
  intensity: number;
  frequency: number;
  duration: number;
  vertical: number;
  soil: Soil;
  condition: Condition;
  anchoring: Anchoring;
  direction: Direction;
};

const SOIL: Record<Soil, number> = { rock: 0.72, firm: 1, soft: 1.36, fill: 1.62 };
const CONDITION: Record<Condition, number> = { new: 0.72, maintained: 0.94, aged: 1.2, deficient: 1.52 };
const ANCHORING: Record<Anchoring, number> = { reinforced: 0.72, standard: 1, poor: 1.38 };

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function resonanceFactor(frequency: number) {
  return 1 + Math.exp(-Math.pow(frequency - 2.15, 2) / 0.72) * 0.72;
}

export function soilFactor(soil: Soil) {
  return SOIL[soil];
}

export function calculateDamage(settings: SimulatorSettings) {
  const demand =
    Math.pow(settings.intensity / 10, 1.68) *
    (0.72 + Math.sqrt(settings.duration / 30) * 0.34) *
    (1 + (settings.vertical / 100) * 0.28) *
    (settings.direction === 'multi' ? 1.13 : 1) *
    SOIL[settings.soil] *
    CONDITION[settings.condition] *
    ANCHORING[settings.anchoring] *
    resonanceFactor(settings.frequency);

  const score = clamp(Math.round(demand * 62), 0, 100);
  return {
    demand,
    score,
    superficial: clamp(Math.round(score * 1.28 + 8), 0, 100),
    nonStructural: clamp(Math.round((score - 12) * 1.35), 0, 100),
    structural: clamp(Math.round((score - 34) * 1.52), 0, 100),
    critical: clamp(Math.round((score - 68) * 2.55), 0, 100),
  };
}

export function damageLevel(score: number) {
  if (score < 15) return ['Muy bajo', 'Movimiento perceptible sin daño visible relevante.'] as const;
  if (score < 35) return ['Leve', 'Posibles daños de terminación o elementos sueltos.'] as const;
  if (score < 55) return ['Moderado', 'Daño no estructural y fisuras localizadas posibles.'] as const;
  if (score < 75) return ['Severo', 'Deformaciones importantes y daño estructural posible.'] as const;
  return ['Crítico', 'Escenario visual de alta demanda y pérdida importante de desempeño.'] as const;
}

export function waveSignal(t: number, settings: SimulatorSettings) {
  const omega = Math.PI * 2 * settings.frequency;
  const envelope = Math.min(clamp(t / 1.6, 0, 1), clamp((settings.duration - t) / 2.4, 0, 1));
  return (
    Math.sin(omega * t) +
    Math.sin(omega * 0.47 * t + 1.18) * 0.38 +
    Math.sin(omega * 1.71 * t + 0.43) * 0.12
  ) * envelope;
}

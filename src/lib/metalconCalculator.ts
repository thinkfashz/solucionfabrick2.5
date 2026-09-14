export type StructurePreset = 'partition' | 'house1' | 'house2' | 'large';
export type MetalconOpening = { enabled: boolean; xM: number; widthM: number; heightM: number; sillM: number };
export type MetalconInput = {
  widthM: number;
  heightM: number;
  spacingCm: 40 | 60;
  osbWidthCm: 120 | 122;
  preset: StructurePreset;
  cDepthMm: 60 | 90 | 100 | 150;
  thicknessMm: 0.5 | 0.85 | 1 | 1.6;
  door: MetalconOpening;
  window: MetalconOpening;
};

export const STRUCTURE_PRESETS = {
  partition: { label: 'Tabique interior', profile: 'C 60 / U 61', thickness: '0,50 mm referencial', use: 'Separación liviana no portante' },
  house1: { label: 'Vivienda · 1 piso', profile: 'C 90 / U 92 compatible', thickness: '0,85 mm referencial', use: 'Muro estructural sujeto a cálculo' },
  house2: { label: 'Vivienda · 2 pisos', profile: 'C 90–100 / U compatible', thickness: '≥ 0,85 mm según cálculo', use: 'Requiere memoria estructural' },
  large: { label: 'Estructura mayor', profile: 'C 150 o solución diseñada', thickness: '1,00–1,60 mm o superior', use: 'Ingeniería obligatoria' },
} as const;

type CProfileReference = {
  label: string;
  kgPerM: number | null;
  commonLengthsM: number[];
  source: 'Cintac Manual de Diseño Metalcon 2020' | 'Referencia de familia';
};

const C_PROFILE_REFERENCE: Record<string, CProfileReference> = {
  '60-0.5': { label: 'C 60 · tabiquería', kgPerM: null, commonLengthsM: [2.4, 3, 6], source: 'Referencia de familia' },
  '60-0.85': { label: 'C 60×38×6×0,85', kgPerM: 0.96, commonLengthsM: [2.4, 6], source: 'Cintac Manual de Diseño Metalcon 2020' },
  '90-0.85': { label: 'C 90×38×12×0,85', kgPerM: 1.23, commonLengthsM: [2.5, 3, 4, 6, 7.1], source: 'Cintac Manual de Diseño Metalcon 2020' },
  '90-1': { label: 'C 90×38×12×1,00', kgPerM: 1.44, commonLengthsM: [2.5, 4, 6, 7.1], source: 'Cintac Manual de Diseño Metalcon 2020' },
  '100-0.85': { label: 'C 100×40×12×0,85', kgPerM: 1.32, commonLengthsM: [2.5, 6], source: 'Cintac Manual de Diseño Metalcon 2020' },
  '150-0.85': { label: 'C 150×40×12×0,85', kgPerM: 1.64, commonLengthsM: [4, 6], source: 'Cintac Manual de Diseño Metalcon 2020' },
  '150-1': { label: 'C 150×40×12×1,00', kgPerM: 1.94, commonLengthsM: [4, 6], source: 'Cintac Manual de Diseño Metalcon 2020' },
  '150-1.6': { label: 'C 150×40×12×1,60', kgPerM: 3.06, commonLengthsM: [4, 6], source: 'Cintac Manual de Diseño Metalcon 2020' },
};

export function getMetalconProfileReference(input: Pick<MetalconInput, 'cDepthMm' | 'thicknessMm'>): CProfileReference {
  return C_PROFILE_REFERENCE[`${input.cDepthMm}-${input.thicknessMm}`] || {
    label: `C ${input.cDepthMm} × ${input.thicknessMm.toFixed(2).replace('.', ',')} mm`,
    kgPerM: null,
    commonLengthsM: [6],
    source: 'Referencia de familia',
  };
}

export function compatibleTrackLabel(depthMm: MetalconInput['cDepthMm']) {
  if (depthMm === 60) return 'U 61';
  if (depthMm === 90) return 'U 92';
  if (depthMm === 100) return 'U 103';
  return 'U 153';
}

export function enabledOpenings(input: MetalconInput) {
  return [input.door, input.window].filter(item => item.enabled);
}

export function validateMetalcon(input: MetalconInput) {
  const messages: string[] = [];
  for (const opening of enabledOpenings(input)) {
    if (opening.xM < 0 || opening.xM + opening.widthM > input.widthM) messages.push('Un vano queda fuera del largo del panel.');
    if (opening.sillM + opening.heightM > input.heightM) messages.push('Un vano supera la altura del panel.');
    if (opening.widthM > 1.2) messages.push('Vano mayor a 1,20 m: requiere dintel compuesto o viga dimensionada por cálculo.');
  }
  if (input.door.enabled && input.window.enabled) {
    const a = input.door;
    const b = input.window;
    if (a.xM < b.xM + b.widthM && b.xM < a.xM + a.widthM) messages.push('La puerta y la ventana se superponen.');
  }
  if (input.preset === 'partition') messages.push('El preset tabique interior no debe interpretarse como muro soportante.');
  if (input.preset === 'house2' || input.preset === 'large') messages.push('Esta escala exige proyecto y memoria de cálculo estructural.');
  return Array.from(new Set(messages));
}

export function calculateMetalcon(input: MetalconInput) {
  const widthM = Math.max(.8, Math.min(20, input.widthM || 0));
  const heightM = Math.max(1.8, Math.min(5, input.heightM || 0));
  const openings = enabledOpenings(input);
  // ceil mantiene la separación máxima seleccionada incluso cuando el largo no es múltiplo exacto de 40/60 cm.
  const baseStuds = Math.ceil(widthM * 100 / input.spacingCm) + 1;
  const openingReinforcements = openings.length * 4;
  const sheetHeightM = input.osbWidthCm === 122 ? 2.44 : 2.4;
  const grossArea = widthM * heightM;
  const openingArea = openings.reduce((sum, item) => sum + item.widthM * item.heightM, 0);
  const osbSheets = Math.max(1, Math.ceil(Math.max(0, grossArea - openingArea) / ((input.osbWidthCm / 100) * sheetHeightM) * 1.1));
  const verticalMeters = (baseStuds + openingReinforcements) * heightM;
  const trackMeters = Math.ceil(widthM * 2 * 10) / 10;
  const profileMeters = Math.ceil((verticalMeters + openings.reduce((sum, opening) => sum + opening.widthM * 2, 0)) * 10) / 10;
  const profileReference = getMetalconProfileReference(input);
  const cPieces6m = Math.ceil(profileMeters / 6);
  const uPieces6m = Math.ceil(trackMeters / 6);
  const cWeightKg = profileReference.kgPerM == null ? null : Math.round(profileMeters * profileReference.kgPerM * 10) / 10;

  return {
    baseStuds,
    openingReinforcements,
    totalStuds: baseStuds + openingReinforcements,
    trackMeters,
    profileMeters,
    cPieces6m,
    uPieces6m,
    cWeightKg,
    profileReference,
    trackLabel: compatibleTrackLabel(input.cDepthMm),
    osbSheets,
    openings: openings.length,
    warnings: validateMetalcon(input),
  };
}

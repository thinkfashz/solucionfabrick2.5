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

export type CProfileReference = {
  label: string;
  kgPerM: number | null;
  commonLengthsM: number[];
  source: 'Cintac Manual de Diseño Metalcon 2020' | 'Referencia de familia';
  /** 'profile' = perfiles C estructurales; 'track' = soleras U. Solo los C entran a METALCON_C_PROFILE_TABLE. */
  kind: 'profile' | 'track';
};

const C_PROFILE_REFERENCE: Record<string, CProfileReference> = {
  '60-0.5': { label: 'C 60 · tabiquería', kgPerM: null, commonLengthsM: [2.4, 3, 6], source: 'Referencia de familia', kind: 'profile' },
  '60-0.85': { label: 'C 60×38×6×0,85', kgPerM: 0.96, commonLengthsM: [2.4, 6], source: 'Cintac Manual de Diseño Metalcon 2020', kind: 'profile' },
  '90-0.85': { label: 'C 90×38×12×0,85', kgPerM: 1.23, commonLengthsM: [2.5, 3, 4, 6, 7.1], source: 'Cintac Manual de Diseño Metalcon 2020', kind: 'profile' },
  '90-1': { label: 'C 90×38×12×1,00', kgPerM: 1.44, commonLengthsM: [2.5, 4, 6, 7.1], source: 'Cintac Manual de Diseño Metalcon 2020', kind: 'profile' },
  '100-0.85': { label: 'C 100×40×12×0,85', kgPerM: 1.32, commonLengthsM: [2.5, 6], source: 'Cintac Manual de Diseño Metalcon 2020', kind: 'profile' },
  '150-0.85': { label: 'C 150×40×12×0,85', kgPerM: 1.64, commonLengthsM: [4, 6], source: 'Cintac Manual de Diseño Metalcon 2020', kind: 'profile' },
  '150-1': { label: 'C 150×40×12×1,00', kgPerM: 1.94, commonLengthsM: [4, 6], source: 'Cintac Manual de Diseño Metalcon 2020', kind: 'profile' },
  '150-1.6': { label: 'C 150×40×12×1,60', kgPerM: 3.06, commonLengthsM: [4, 6], source: 'Cintac Manual de Diseño Metalcon 2020', kind: 'profile' },
  // Soleras U: el fabricante no publica kg/m. U 61 toma el valor referencial de familia (~0,9 kg/m);
  // U 92 / U 103 / U 153 se estiman como ~0,85 del C compatible (la U va sin labios, sección menor).
  'U61': { label: 'U 61', kgPerM: 0.9, commonLengthsM: [6], source: 'Referencia de familia', kind: 'track' },
  'U92': { label: 'U 92', kgPerM: 1.05, commonLengthsM: [6], source: 'Referencia de familia', kind: 'track' },
  'U103': { label: 'U 103', kgPerM: 1.12, commonLengthsM: [6], source: 'Referencia de familia', kind: 'track' },
  'U153': { label: 'U 153', kgPerM: 1.39, commonLengthsM: [6], source: 'Referencia de familia', kind: 'track' },
};

export function getMetalconProfileReference(input: Pick<MetalconInput, 'cDepthMm' | 'thicknessMm'>): CProfileReference {
  return C_PROFILE_REFERENCE[`${input.cDepthMm}-${input.thicknessMm}`] || {
    label: `C ${input.cDepthMm} × ${input.thicknessMm.toFixed(2).replace('.', ',')} mm`,
    kgPerM: null,
    commonLengthsM: [6],
    source: 'Referencia de familia',
    kind: 'profile',
  };
}

/** Solera U compatible con cada profundidad de perfil C. Los kg/m son referencia de familia, no publicados. */
export function getTrackReference(depthMm: MetalconInput['cDepthMm']): CProfileReference {
  const key = depthMm === 60 ? 'U61' : depthMm === 90 ? 'U92' : depthMm === 100 ? 'U103' : 'U153';
  return C_PROFILE_REFERENCE[key];
}

/** Tabla de perfiles C publicada en el Manual de Diseño Metalcon de Cintac.
    Es la misma fuente que usa el cálculo: aquí solo se expone como lista para la ficha técnica.
    Las soleras U (kind 'track') quedan fuera: son kg/m estimados, no publicados. */
export const METALCON_C_PROFILE_TABLE = Object.values(C_PROFILE_REFERENCE).filter(
  (item) => item.kind === 'profile' && item.kgPerM != null
);

/** Soleras U con peso referencial de familia (para la ficha y para estimar kilos de acero). */
export const METALCON_TRACK_PROFILE_TABLE = Object.values(C_PROFILE_REFERENCE).filter(
  (item) => item.kind === 'track' && item.kgPerM != null
);

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

/* =========================================================================
   VIVIENDA COMPLETA (no un panel)
   Estimado educativo de material para una casa entera en planta rectangular.
   No es cotización ni memoria de cálculo: los precios salen de la obra y el
   dimensionado estructural de una memoria profesional.
   ========================================================================= */

/** Altura estándar comercial del muro de vivienda: corte de 2,50 m sobre barra de 6 m. */
const STANDARD_WALL_HEIGHT_M = 2.5;
/** Alto útil de la plancha de OSB (2,44 m). */
const OSB_SHEET_LENGTH_M = 2.44;
/** Desperdicio por cortes y traslapos del revestimiento. */
const OSB_CUT_WASTE = 1.1;
/** Recorte de coronación: muro de 2,50 m contra 2,44 m útiles de la plancha. */
const OSB_CORONATION_FACTOR = 1.04;
/** Tornillos por m² de revestimiento y por montante (referencia orientativa). */
const SCREWS_PER_M2 = 12;
const SCREWS_PER_STUD = 4;

function clampNumber(value: number, min: number, max: number, fallback: number) {
  const v = typeof value === 'number' && isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, v));
}

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export type HouseVanoSize = { widthM: number; heightM: number };

export type HousePlanInput = {
  lengthM: number;
  depthM: number;
  /** Altura libre del muro. Default 2,50 m si viene vacía o inválida (corte estándar comercial); rango 1,80–4,00 m. */
  heightM: number;
  spacingCm: 40 | 60;
  cDepthMm: 60 | 90 | 100 | 150;
  thicknessMm: 0.5 | 0.85 | 1 | 1.6;
  osbFormat: '244x120' | '244x122';
  osbThicknessMm: 9 | 10 | 12;
  /** Largo TOTAL de tabiques interiores en metros (suma de largos, no cantidad de tabiques). */
  interiorPartitionsM: number;
  doors: number;
  windows: number;
  /** Pendiente del techo en %, opcional. Solo alimenta una nota: la techumbre no entra en el estimado. */
  roofPitch?: number;
  /** Pisos. Default 1. Solo se usa para notas y para la referencia de espesor de OSB. */
  floors?: number;
  /** Tamaño unitario de puerta. Default 0,90 × 2,00 m. */
  doorSizeM?: HouseVanoSize;
  /** Tamaño unitario de ventana. Default 1,20 × 1,20 m. */
  windowSizeM?: HouseVanoSize;
};

/** HousePlanInput con defaults aplicados y medidas saneadas: siempre números definidos. */
export type ResolvedHousePlanInput = {
  lengthM: number;
  depthM: number;
  heightM: number;
  spacingCm: 40 | 60;
  cDepthMm: 60 | 90 | 100 | 150;
  thicknessMm: 0.5 | 0.85 | 1 | 1.6;
  osbFormat: '244x120' | '244x122';
  osbThicknessMm: 9 | 10 | 12;
  interiorPartitionsM: number;
  doors: number;
  windows: number;
  floors: number;
  roofPitch: number | null;
  doorSizeM: HouseVanoSize;
  windowSizeM: HouseVanoSize;
};

/** Línea de lista de compra. */
export type MaterialLine = { sku: string; label: string; qty: number; unit: string; note: string };

export type HouseStudBreakdown = {
  /** Montantes del perímetro: ceil(perímetro / modulación). */
  perimeter: number;
  /** Esquinas: siempre 4 en una planta rectangular. */
  corners: number;
  /** Tabiques interiores. */
  partitions: number;
  /** Refuerzos de vanos: 2 jambas + 2 listones de dintel por puerta o ventana. */
  openings: number;
};

export type HouseEstimate = {
  /** Entrada saneada con defaults aplicados (heightM, floors y vanos siempre definidos). */
  input: ResolvedHousePlanInput;
  perimetroM: number;

  studs: number;
  studBreakdown: HouseStudBreakdown;
  /** Cuántos montantes cortados a la altura del muro salen de cada barra de 6 m. */
  studsBarra6M: number;
  /** Barras de 6 m de perfil C a comprar. */
  studsBars: number;
  /** Sobrante total de las barras de 6 m (m). */
  leftoverM: number;
  /** Sobrante de acero en % de las barras compradas. */
  steelWastePct: number;

  /** Metros lineales de solera U (base + coronación + tabiques interiores). */
  trackM: number;
  trackBars6M: number;
  trackLabel: string;

  wallAreaM2: number;
  partitionAreaM2: number;
  grossOsbAreaM2: number;
  openingsAreaM2: number;
  netOsbAreaM2: number;
  osbSheetAreaM2: number;
  osbSheets: number;
  /** 10% de cortes + 4% de coronación cuando el muro pasa de 2,44 m. */
  osbWastePct: number;
  /** Regla orientativa (no es cálculo estructural) según altura y pisos. */
  osbThicknessNote: string;

  screws: number;

  profileReference: CProfileReference;
  trackReference: CProfileReference;

  materials: MaterialLine[];
  warnings: string[];
  notes: string[];
};

/**
 * Estimado de material para una vivienda completa en planta rectangular:
 * perímetro + tabiques interiores + refuerzos de vanos, con reglas comerciales
 * de corte (barra de 6 m, corte estándar de muro a 2,50 m).
 */
export function calculateHousePlan(input: HousePlanInput): HouseEstimate {
  const lengthM = clampNumber(input.lengthM, 1, 60, 10);
  const depthM = clampNumber(input.depthM, 1, 60, 8);
  const rawHeightM = typeof input.heightM === 'number' && isFinite(input.heightM) && input.heightM > 0
    ? input.heightM
    : STANDARD_WALL_HEIGHT_M;
  const heightM = clampNumber(rawHeightM, 1.8, 4, STANDARD_WALL_HEIGHT_M);
  const heightClamped = Math.abs(heightM - rawHeightM) > 0.001;
  const spacingCm: 40 | 60 = input.spacingCm === 60 ? 60 : 40;
  const interiorPartitionsM = clampNumber(input.interiorPartitionsM, 0, 200, 0);
  const doors = Math.max(0, Math.floor(input.doors || 0));
  const windows = Math.max(0, Math.floor(input.windows || 0));
  const floors = Math.max(1, Math.floor(input.floors ?? 1));
  const doorSizeM: HouseVanoSize = {
    widthM: clampNumber(input.doorSizeM?.widthM ?? 0.9, 0.4, 4, 0.9),
    heightM: clampNumber(input.doorSizeM?.heightM ?? 2, 0.4, 4, 2),
  };
  const windowSizeM: HouseVanoSize = {
    widthM: clampNumber(input.windowSizeM?.widthM ?? 1.2, 0.4, 6, 1.2),
    heightM: clampNumber(input.windowSizeM?.heightM ?? 1.2, 0.4, 4, 1.2),
  };
  const roofPitch = typeof input.roofPitch === 'number' && isFinite(input.roofPitch) && input.roofPitch > 0
    ? roundTo(input.roofPitch, 1)
    : null;

  const resolved: ResolvedHousePlanInput = {
    lengthM, depthM, heightM, spacingCm,
    cDepthMm: input.cDepthMm, thicknessMm: input.thicknessMm,
    osbFormat: input.osbFormat, osbThicknessMm: input.osbThicknessMm,
    interiorPartitionsM, doors, windows, floors, roofPitch, doorSizeM, windowSizeM,
  };

  const perimetroM = roundTo(2 * (lengthM + depthM), 1);
  const spacingM = spacingCm / 100;

  // --- Montantes C ---
  const perimeterStuds = Math.ceil(perimetroM / spacingM);
  const cornerStuds = 4;
  // Aproximación razonable: módulo del tabique + 1 montante de encuentro por cada tramo de 4 m.
  const partitionStuds = interiorPartitionsM > 0
    ? Math.ceil(interiorPartitionsM / spacingM) + Math.ceil(interiorPartitionsM / 4)
    : 0;
  const openingCount = doors + windows;
  const openingStuds = openingCount * 4; // 2 jambas + 2 listones de dintel por vano
  const studs = perimeterStuds + cornerStuds + partitionStuds + openingStuds;

  // Corte comercial: de una barra de 6 m salen floor(6 / altura) montantes; sobre 3 m, solo 1 por barra.
  const studsBarra6M = heightM > 3 ? 1 : Math.max(1, Math.floor(6 / heightM));
  const studsBars = Math.max(1, Math.ceil(studs / studsBarra6M));
  const leftoverM = roundTo(studsBars * 6 - studs * heightM, 1);
  const steelWastePct = roundTo((leftoverM / (studsBars * 6)) * 100, 1);

  // --- Soleras U ---
  const trackM = roundTo(perimetroM * 2 + interiorPartitionsM * 2, 1);
  const trackBars6M = Math.ceil(trackM / 6);
  const trackReference = getTrackReference(input.cDepthMm);

  // --- Revestimiento OSB ---
  const wallAreaM2 = roundTo(perimetroM * heightM, 1);
  const partitionAreaM2 = roundTo(interiorPartitionsM * heightM, 1);
  const grossOsbAreaM2 = roundTo(wallAreaM2 + partitionAreaM2, 1);
  const openingsAreaM2 = roundTo(
    doors * doorSizeM.widthM * doorSizeM.heightM + windows * windowSizeM.widthM * windowSizeM.heightM,
    1
  );
  const netOsbAreaM2 = Math.max(0, roundTo(grossOsbAreaM2 - openingsAreaM2, 1));
  const osbWidthM = input.osbFormat === '244x122' ? 1.22 : 1.2;
  const osbSheetAreaM2 = roundTo(OSB_SHEET_LENGTH_M * osbWidthM, 2);
  // Muro más alto que la plancha útil: cada banda deja una tira de coronación por recortar.
  const coronationFactor = heightM > OSB_SHEET_LENGTH_M ? OSB_CORONATION_FACTOR : 1;
  const osbWastePct = roundTo((coronationFactor * OSB_CUT_WASTE - 1) * 100, 1);
  const osbSheets = Math.max(1, Math.ceil((netOsbAreaM2 * coronationFactor * OSB_CUT_WASTE) / osbSheetAreaM2));

  // Regla orientativa de espesor (educativa, no es cálculo estructural):
  // 9 mm hasta 2,50 m, 10 mm hasta 3,00 m, 12 mm sobre 3,00 m o 2 pisos.
  const recommendedOsbMm = floors >= 2 || heightM > 3 ? 12 : heightM > 2.5 ? 10 : 9;
  const osbThicknessNote =
    `Referencia orientativa (no es cálculo estructural): 9 mm hasta 2,50 m de alto, 10 mm hasta 3,00 m y 12 mm sobre 3,00 m o en vivienda de 2 pisos. `
    + `Para ${heightM.toFixed(2).replace('.', ',')} m${floors > 1 ? ` y ${floors} pisos` : ''} corresponde ${recommendedOsbMm} mm; seleccionaste ${input.osbThicknessMm} mm.`;

  // --- Tornillos autoperforantes ---
  const screws = Math.ceil(netOsbAreaM2 * SCREWS_PER_M2 + studs * SCREWS_PER_STUD);

  const profileReference = getMetalconProfileReference({ cDepthMm: input.cDepthMm, thicknessMm: input.thicknessMm });
  const cLabel = profileReference.label.replace(/^C\s+/, 'C');
  const thicknessTag = input.thicknessMm.toFixed(2).replace('.', '');

  const materials: MaterialLine[] = [
    {
      sku: `MC-C${input.cDepthMm}-${thicknessTag}`,
      label: `${cLabel} · barra 6 m`,
      qty: studsBars,
      unit: 'barra 6 m',
      note: `${studs} montantes · ${studsBarra6M} por barra · alto ${heightM.toFixed(2).replace('.', ',')} m`,
    },
    {
      sku: `MC-${trackReference.label.replace(/\s+/g, '')}`,
      label: `${trackReference.label} · barra 6 m`,
      qty: trackBars6M,
      unit: 'barra 6 m',
      note: `${trackM.toFixed(1).replace('.', ',')} m · base + coronación${interiorPartitionsM > 0 ? ' + tabiques' : ''}`,
    },
    {
      sku: `MC-OSB-${input.osbFormat}-${input.osbThicknessMm}`,
      label: `OSB ${input.osbFormat.replace('x', '×')} · ${input.osbThicknessMm} mm`,
      qty: osbSheets,
      unit: 'plancha',
      note: `${netOsbAreaM2.toFixed(1).replace('.', ',')} m² netos · ${osbSheetAreaM2.toFixed(2).replace('.', ',')} m² por plancha · +${osbWastePct.toString().replace('.', ',')}% de cortes`,
    },
    {
      sku: 'MC-TAP',
      label: 'Tornillo autoperforante galvanizado',
      qty: screws,
      unit: 'unidad',
      note: `~${SCREWS_PER_M2} por m² de revestimiento + ${SCREWS_PER_STUD} por montante · norma AISI`,
    },
  ];

  const warnings: string[] = [];
  if (heightClamped) warnings.push(`La altura quedó limitada al rango de referencia 1,80–4,00 m.`);
  if (heightM > 3) {
    warnings.push(`Altura de ${heightM.toFixed(2).replace('.', ',')} m sobre 3,00 m: de cada barra de 6 m sale un solo montante y el corte estándar comercial de vivienda (2,50 m) no aplica; pide corte especial.`);
  }
  if (floors > 2) {
    warnings.push(`Vivienda de ${floors} pisos: requiere proyecto y memoria de cálculo estructural; el fabricante declara hasta 3 niveles.`);
  }
  if (doorSizeM.widthM > 1.2 || windowSizeM.widthM > 1.2) {
    warnings.push('Vano mayor a 1,20 m: requiere dintel compuesto o viga dimensionada por cálculo.');
  }
  if (steelWastePct > 25) {
    warnings.push(`Las barras de 6 m dejan un ${steelWastePct.toString().replace('.', ',')}% de sobrante (sobre 25%): revisa la altura del muro o pide corte a medida.`);
  }
  if (input.osbThicknessMm < recommendedOsbMm) {
    warnings.push(`Elegiste OSB de ${input.osbThicknessMm} mm: para esta altura${floors > 1 ? ' y número de pisos' : ''} la referencia orientativa es ${recommendedOsbMm} mm.`);
  }

  const notes: string[] = [];
  notes.push(
    heightM > OSB_SHEET_LENGTH_M
      ? `La plancha útil mide 2,44 m y el muro ${heightM.toFixed(2).replace('.', ',')} m: cada banda dejan una tira de coronación por recortar. Lo resumimos con un factor 1,04 sobre el área, más un 10% por cortes y traslapos (total +${osbWastePct.toString().replace('.', ',')}%).`
      : `La plancha de 2,44 m de alto alcanza para el muro completo: se aplica un 10% de desperdicio por cortes y traslapos.`
  );
  if (interiorPartitionsM > 0) {
    notes.push(`El área de los tabiques interiores se cuenta por una sola cara; si los revistes por ambos lados duplica ese tramo de plancha.`);
    if (input.cDepthMm !== 60) notes.push(`Los tabiques interiores no portantes suelen armarse en familia tabiquería (C 60 / U 61, 0,50 mm), distinta de la estructural usada en muros exteriores.`);
  }
  if (floors === 2) notes.push(`Vivienda de 2 pisos: el fabricante la permite, pero el dimensionado exige memoria de cálculo estructural.`);
  if (roofPitch != null) notes.push(`Pendiente de ${roofPitch.toString().replace('.', ',')}%: la techumbre, sus pendientes y estructura de techo no están incluidas en este estimado.`);
  notes.push(`Estimado orientativo de material, no cotización ni memoria de cálculo: los pesos de solera U y los rendimientos de corte son referencias de familia.`);

  return {
    input: resolved,
    perimetroM,
    studs,
    studBreakdown: { perimeter: perimeterStuds, corners: cornerStuds, partitions: partitionStuds, openings: openingStuds },
    studsBarra6M,
    studsBars,
    leftoverM,
    steelWastePct,
    trackM,
    trackBars6M,
    trackLabel: trackReference.label,
    wallAreaM2,
    partitionAreaM2,
    grossOsbAreaM2,
    openingsAreaM2,
    netOsbAreaM2,
    osbSheetAreaM2,
    osbSheets,
    osbWastePct,
    osbThicknessNote,
    screws,
    profileReference,
    trackReference,
    materials,
    warnings,
    notes,
  };
}

/**
 * Peso total de acero instalado de la vivienda (kg): montantes + soleras.
 * Usa los kg/m del Manual de Diseño para el perfil C y la referencia de familia de la solera U.
 * No incluye tornillos, dinteles ni refuerzos especiales.
 * Devuelve null si el perfil elegido no tiene kg/m publicado (p. ej. C 60 tabiquería 0,50 mm).
 */
export function estimateWeightKg(plan: HouseEstimate): number | null {
  const kgPerStudM = plan.profileReference.kgPerM;
  const kgPerTrackM = plan.trackReference.kgPerM;
  if (kgPerStudM == null || kgPerTrackM == null) return null;
  const studsKg = plan.studs * plan.input.heightM * kgPerStudM;
  const trackKg = plan.trackM * kgPerTrackM;
  return roundTo(studsKg + trackKg, 1);
}

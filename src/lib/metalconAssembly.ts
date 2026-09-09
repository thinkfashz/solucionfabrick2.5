export type MetalconHousePresetId = 'compact-5x5' | 'family-6x8' | 'studio-45x58';
export type MetalconWallRole = 'perimeter' | 'interior';
export type MetalconOpeningKind = 'door' | 'window';

export type MetalconPoint = { x: number; z: number };
export type MetalconAssemblyOpening = {
  id: string;
  kind: MetalconOpeningKind;
  offsetM: number;
  widthM: number;
  heightM: number;
  sillM: number;
  label: string;
};

export type MetalconAssemblyWall = {
  id: string;
  label: string;
  start: MetalconPoint;
  end: MetalconPoint;
  role: MetalconWallRole;
  structural: boolean;
  braced: boolean;
  openings: MetalconAssemblyOpening[];
};

export type MetalconHousePreset = {
  id: MetalconHousePresetId;
  label: string;
  shortLabel: string;
  widthM: number;
  depthM: number;
  heightM: number;
  terraceDepthM?: number;
  sourceNote: string;
  walls: MetalconAssemblyWall[];
};

const door = (
  id: string,
  offsetM: number,
  widthM = 0.8,
  heightM = 2.05,
  label = 'Puerta',
): MetalconAssemblyOpening => ({ id, kind: 'door', offsetM, widthM, heightM, sillM: 0, label });

const windowOpening = (
  id: string,
  offsetM: number,
  widthM = 1.2,
  heightM = 1.1,
  sillM = 0.9,
  label = 'Ventana',
): MetalconAssemblyOpening => ({ id, kind: 'window', offsetM, widthM, heightM, sillM, label });

const wall = (
  id: string,
  label: string,
  start: MetalconPoint,
  end: MetalconPoint,
  role: MetalconWallRole,
  openings: MetalconAssemblyOpening[] = [],
  options: Partial<Pick<MetalconAssemblyWall, 'structural' | 'braced'>> = {},
): MetalconAssemblyWall => ({
  id,
  label,
  start,
  end,
  role,
  openings,
  structural: options.structural ?? role === 'perimeter',
  braced: options.braced ?? role === 'perimeter',
});

export const METALCON_HOUSE_PRESETS: Record<MetalconHousePresetId, MetalconHousePreset> = {
  'compact-5x5': {
    id: 'compact-5x5',
    label: 'Vivienda compacta 5,00 × 5,00 m',
    shortLabel: '5 × 5 · 1D',
    widthM: 5,
    depthM: 5,
    heightM: 2.4,
    sourceNote: 'Basado en la referencia 5,00 × 5,00 m: dormitorio 3,00 m, baño de 2,00 × 1,80 m y modulación lateral 2,40 + 2,60 m.',
    walls: [
      wall('C5-N', 'P-01 · Norte · 5,00 m', { x: 0, z: 0 }, { x: 5, z: 0 }, 'perimeter', [
        windowOpening('C5-N-W1', 0.78, 0.85, 1.05, 0.9, 'Ventana dormitorio'),
        windowOpening('C5-N-W2', 3.72, 0.72, 0.9, 1.0, 'Ventana baño'),
      ]),
      wall('C5-E', 'P-02 · Oriente · 5,00 m', { x: 5, z: 0 }, { x: 5, z: 5 }, 'perimeter', [
        windowOpening('C5-E-W1', 0.7, 0.65, 0.75, 1.2, 'Ventana baño'),
        windowOpening('C5-E-W2', 2.9, 0.9, 1.05, 0.9, 'Ventana cocina'),
      ]),
      wall('C5-S', 'P-03 · Sur · 5,00 m', { x: 5, z: 5 }, { x: 0, z: 5 }, 'perimeter', [
        door('C5-S-D1', 1.05, 0.9, 2.05, 'Acceso principal'),
        windowOpening('C5-S-W1', 3.15, 1.05, 1.0, 0.9, 'Ventana estar'),
      ]),
      wall('C5-W', 'P-04 · Poniente · 5,00 m', { x: 0, z: 5 }, { x: 0, z: 0 }, 'perimeter', [
        windowOpening('C5-W-W1', 1.05, 1.1, 1.05, 0.9, 'Ventana estar'),
        windowOpening('C5-W-W2', 3.65, 0.9, 1.05, 0.9, 'Ventana dormitorio'),
      ]),
      wall('C5-I1', 'P-05 · Dormitorio · 3,00 m', { x: 0, z: 2.4 }, { x: 3, z: 2.4 }, 'interior', [
        door('C5-I1-D1', 2.05, 0.8, 2.05, 'Puerta dormitorio'),
      ], { structural: false, braced: false }),
      wall('C5-I2', 'P-06 · División dormitorio/baño · 2,40 m', { x: 3, z: 0 }, { x: 3, z: 2.4 }, 'interior', [
        door('C5-I2-D1', 1.42, 0.72, 2.05, 'Paso dormitorio'),
      ], { structural: false, braced: false }),
      wall('C5-I3', 'P-07 · Baño · 2,00 m', { x: 3, z: 1.8 }, { x: 5, z: 1.8 }, 'interior', [
        door('C5-I3-D1', 0.18, 0.72, 2.05, 'Puerta baño'),
      ], { structural: false, braced: false }),
    ],
  },
  'family-6x8': {
    id: 'family-6x8',
    label: 'Vivienda familiar 6,00 × 8,00 m',
    shortLabel: '6 × 8 · 2D',
    widthM: 6,
    depthM: 8,
    heightM: 2.4,
    sourceNote: 'Basado en la referencia 6,00 × 8,00 m: dos dormitorios de 3,00 × 3,00 m, baño 2,10 × 1,60 m y franja social de 3,00 m.',
    walls: [
      wall('F68-N', 'P-01 · Norte · 6,00 m', { x: 0, z: 0 }, { x: 6, z: 0 }, 'perimeter', [
        windowOpening('F68-N-W1', 1.15, 1.2, 1.0, 0.95, 'Ventana cocina'),
        windowOpening('F68-N-W2', 4.05, 1.15, 1.0, 0.95, 'Ventana dormitorio 1'),
      ]),
      wall('F68-E', 'P-02 · Oriente · 8,00 m', { x: 6, z: 0 }, { x: 6, z: 8 }, 'perimeter', [
        windowOpening('F68-E-W1', 0.95, 1.1, 1.05, 0.9, 'Ventana dormitorio 1'),
        windowOpening('F68-E-W2', 3.48, 0.75, 0.8, 1.1, 'Ventana baño'),
        windowOpening('F68-E-W3', 6.05, 1.1, 1.05, 0.9, 'Ventana dormitorio 2'),
      ]),
      wall('F68-S', 'P-03 · Sur · 6,00 m', { x: 6, z: 8 }, { x: 0, z: 8 }, 'perimeter', [
        windowOpening('F68-S-W1', 1.0, 1.25, 1.05, 0.9, 'Ventana dormitorio 2'),
        door('F68-S-D1', 3.28, 0.9, 2.05, 'Acceso principal'),
        windowOpening('F68-S-W2', 4.58, 0.95, 1.0, 0.9, 'Ventana sala'),
      ]),
      wall('F68-W', 'P-04 · Poniente · 8,00 m', { x: 0, z: 8 }, { x: 0, z: 0 }, 'perimeter', [
        windowOpening('F68-W-W1', 1.2, 1.25, 1.0, 0.9, 'Ventana sala'),
        windowOpening('F68-W-W2', 5.95, 1.05, 1.0, 0.9, 'Ventana cocina'),
      ]),
      wall('F68-I1', 'P-05 · Dormitorio 1 · 3,00 m', { x: 3, z: 0 }, { x: 3, z: 3 }, 'interior', [
        door('F68-I1-D1', 2.0, 0.8, 2.05, 'Puerta dormitorio 1'),
      ], { structural: false, braced: false }),
      wall('F68-I2', 'P-06 · Base dormitorio 1 · 3,00 m', { x: 3, z: 3 }, { x: 6, z: 3 }, 'interior', [], { structural: true, braced: false }),
      wall('F68-I3', 'P-07 · Baño · 2,10 m', { x: 3.9, z: 3 }, { x: 6, z: 3 }, 'interior', [], { structural: false, braced: false }),
      wall('F68-I4', 'P-08 · Lateral baño · 1,60 m', { x: 3.9, z: 3 }, { x: 3.9, z: 4.6 }, 'interior', [
        door('F68-I4-D1', 0.55, 0.72, 2.05, 'Puerta baño'),
      ], { structural: false, braced: false }),
      wall('F68-I5', 'P-09 · Base baño · 2,10 m', { x: 3.9, z: 4.6 }, { x: 6, z: 4.6 }, 'interior', [], { structural: false, braced: false }),
      wall('F68-I6', 'P-10 · Dormitorio 2 · 3,40 m', { x: 3, z: 4.6 }, { x: 3, z: 8 }, 'interior', [
        door('F68-I6-D1', 0.25, 0.8, 2.05, 'Puerta dormitorio 2'),
      ], { structural: false, braced: false }),
      wall('F68-I7', 'P-11 · Cabezal dormitorio 2 · 3,00 m', { x: 3, z: 4.6 }, { x: 6, z: 4.6 }, 'interior', [], { structural: true, braced: false }),
    ],
  },
  'studio-45x58': {
    id: 'studio-45x58',
    label: 'Vivienda 4,50 × 5,80 m + terraza',
    shortLabel: '4,5 × 5,8 · 1D',
    widthM: 4.5,
    depthM: 5.8,
    heightM: 2.4,
    terraceDepthM: 1.8,
    sourceNote: 'Basado en la referencia 4,50 × 5,80 m: dormitorio 3,00 × 3,00 m, baño 1,50 × 2,00 m y terraza frontal de 1,80 m.',
    walls: [
      wall('S45-N', 'P-01 · Norte · 4,50 m', { x: 0, z: 0 }, { x: 4.5, z: 0 }, 'perimeter', [
        windowOpening('S45-N-W1', 0.55, 1.25, 1.05, 0.9, 'Ventana dormitorio'),
        windowOpening('S45-N-W2', 3.48, 0.58, 0.72, 1.15, 'Ventana baño'),
      ]),
      wall('S45-E', 'P-02 · Oriente · 5,80 m', { x: 4.5, z: 0 }, { x: 4.5, z: 5.8 }, 'perimeter', [
        windowOpening('S45-E-W1', 0.7, 0.65, 0.75, 1.15, 'Ventana baño'),
        windowOpening('S45-E-W2', 3.25, 0.9, 1.0, 0.95, 'Ventana cocina'),
      ]),
      wall('S45-S', 'P-03 · Sur · 4,50 m', { x: 4.5, z: 5.8 }, { x: 0, z: 5.8 }, 'perimeter', [
        door('S45-S-D1', 3.35, 0.9, 2.05, 'Acceso desde terraza'),
        windowOpening('S45-S-W1', 0.95, 1.25, 1.0, 0.9, 'Ventana estar'),
      ]),
      wall('S45-W', 'P-04 · Poniente · 5,80 m', { x: 0, z: 5.8 }, { x: 0, z: 0 }, 'perimeter', [
        windowOpening('S45-W-W1', 1.2, 1.1, 1.0, 0.9, 'Ventana estar'),
        windowOpening('S45-W-W2', 4.1, 0.9, 1.0, 0.9, 'Ventana dormitorio'),
      ]),
      wall('S45-I1', 'P-05 · Dormitorio · 3,00 m', { x: 0, z: 3 }, { x: 3, z: 3 }, 'interior', [
        door('S45-I1-D1', 2.02, 0.8, 2.05, 'Puerta dormitorio'),
      ], { structural: false, braced: false }),
      wall('S45-I2', 'P-06 · División dormitorio/baño · 3,00 m', { x: 3, z: 0 }, { x: 3, z: 3 }, 'interior', [], { structural: false, braced: false }),
      wall('S45-I3', 'P-07 · Baño · 1,50 m', { x: 3, z: 2 }, { x: 4.5, z: 2 }, 'interior', [
        door('S45-I3-D1', 0.12, 0.72, 2.05, 'Puerta baño'),
      ], { structural: false, braced: false }),
      wall('S45-I4', 'P-08 · Hall técnico · 1,00 m', { x: 3, z: 2 }, { x: 3, z: 3 }, 'interior', [], { structural: false, braced: false }),
    ],
  },
};

export const METALCON_HOUSE_PRESET_ORDER: MetalconHousePresetId[] = ['compact-5x5', 'family-6x8', 'studio-45x58'];

export function wallLengthM(wall: MetalconAssemblyWall) {
  return Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
}

export function wallYawRad(wall: MetalconAssemblyWall) {
  return -Math.atan2(wall.end.z - wall.start.z, wall.end.x - wall.start.x);
}

export function wallMidpoint(wall: MetalconAssemblyWall) {
  return {
    x: (wall.start.x + wall.end.x) / 2,
    z: (wall.start.z + wall.end.z) / 2,
  };
}

export function regularStudOffsets(wall: MetalconAssemblyWall, spacingM: number) {
  const length = wallLengthM(wall);
  const count = Math.max(1, Math.floor(length / spacingM));
  const offsets = Array.from({ length: count + 1 }, (_, index) => Math.min(length, index * spacingM));
  if (Math.abs((offsets[offsets.length - 1] ?? 0) - length) > 0.03) offsets.push(length);
  return offsets.filter((offset) => !wall.openings.some((opening) => offset > opening.offsetM + 0.025 && offset < opening.offsetM + opening.widthM - 0.025));
}

export function clearWallIntervals(wall: MetalconAssemblyWall, excludeDoorsOnly = false) {
  const length = wallLengthM(wall);
  const openings = wall.openings
    .filter((opening) => !excludeDoorsOnly || opening.kind === 'door')
    .map((opening) => ({ start: Math.max(0, opening.offsetM), end: Math.min(length, opening.offsetM + opening.widthM) }))
    .filter((opening) => opening.end > opening.start)
    .sort((a, b) => a.start - b.start);

  const intervals: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const opening of openings) {
    if (opening.start > cursor) intervals.push({ start: cursor, end: opening.start });
    cursor = Math.max(cursor, opening.end);
  }
  if (cursor < length) intervals.push({ start: cursor, end: length });
  return intervals;
}

export function assemblySummary(preset: MetalconHousePreset, spacingCm: 40 | 60) {
  const spacingM = spacingCm / 100;
  let regularStuds = 0;
  let openingFrames = 0;
  let totalWallM = 0;
  let doors = 0;
  let windows = 0;

  for (const currentWall of preset.walls) {
    totalWallM += wallLengthM(currentWall);
    regularStuds += regularStudOffsets(currentWall, spacingM).length;
    openingFrames += currentWall.openings.length * 4;
    doors += currentWall.openings.filter((opening) => opening.kind === 'door').length;
    windows += currentWall.openings.filter((opening) => opening.kind === 'window').length;
  }

  return {
    panels: preset.walls.length,
    perimeterPanels: preset.walls.filter((currentWall) => currentWall.role === 'perimeter').length,
    interiorPanels: preset.walls.filter((currentWall) => currentWall.role === 'interior').length,
    totalWallM: Math.round(totalWallM * 10) / 10,
    regularStuds,
    openingFrames,
    doors,
    windows,
  };
}

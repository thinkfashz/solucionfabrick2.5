import { wallLengthM, type MetalconAssemblyWall, type MetalconHousePreset } from '@/lib/metalconAssembly';

export type WallFace = 'n' | 's' | 'e' | 'w';

export type WallOpeningSlice = {
  u0: number;
  u1: number;
  y0: number;
  y1: number;
  kind: 'door' | 'window';
};

const TOL = 0.02;

/** Vanos de la pared perimetral de una cara, en coordenadas locales de la cara (u centrado en la cara, y en metros sobre el terreno). */
export function perimeterWallOpenings(preset: MetalconHousePreset, face: WallFace): WallOpeningSlice[] {
  const w = preset.widthM;
  const d = preset.depthM;
  const wall = preset.walls.find((candidate) => {
    if (candidate.role !== 'perimeter') return false;
    const a = candidate.start;
    const b = candidate.end;
    if (face === 'n') return Math.abs(a.z) < TOL && Math.abs(b.z) < TOL && a.x < b.x;
    if (face === 's') return Math.abs(a.z - d) < TOL && Math.abs(b.z - d) < TOL && a.x > b.x;
    if (face === 'e') return Math.abs(a.x - w) < TOL && Math.abs(b.x - w) < TOL && a.z < b.z;
    return Math.abs(a.x) < TOL && Math.abs(b.x) < TOL && a.z > b.z;
  });
  if (!wall) return [];
  return wall.openings.map((opening) => {
    let u0: number;
    let u1: number;
    if (face === 'n') {
      u0 = opening.offsetM - w / 2;
      u1 = u0 + opening.widthM;
    } else if (face === 's') {
      u1 = w / 2 - opening.offsetM;
      u0 = u1 - opening.widthM;
    } else if (face === 'e') {
      u0 = opening.offsetM - d / 2;
      u1 = u0 + opening.widthM;
    } else {
      u1 = d / 2 - opening.offsetM;
      u0 = u1 - opening.widthM;
    }
    return { u0, u1, y0: opening.sillM, y1: opening.sillM + opening.heightM, kind: opening.kind };
  });
}

/** Vanos de una pared en su sistema local (u = offsetM - largo/2), tal como los usa WallPanel3D. */
export function wallLocalOpenings(wall: MetalconAssemblyWall): WallOpeningSlice[] {
  const length = wallLengthM(wall);
  return wall.openings.map((opening) => ({
    u0: opening.offsetM - length / 2,
    u1: opening.offsetM + opening.widthM - length / 2,
    y0: opening.sillM,
    y1: opening.sillM + opening.heightM,
    kind: opening.kind,
  }));
}

/**
 * Segmentos rectangulares que cubren un muro menos sus vanos:
 * tramos a izquierda/derecha de cada vano + dinteles arriba + umbrales abajo.
 */
export function wallCutSegments(
  length: number,
  height: number,
  openings: WallOpeningSlice[],
): Array<{ cx: number; cy: number; w: number; h: number }> {
  const segs: Array<{ cx: number; cy: number; w: number; h: number }> = [];
  const sorted = [...openings].sort((a, b) => a.u0 - b.u0);
  const left = -length / 2;
  const right = length / 2;
  let cursor = left;
  for (const opening of sorted) {
    const u0 = Math.max(left, opening.u0);
    const u1 = Math.min(right, opening.u1);
    if (u1 - u0 < 0.02) continue;
    if (u0 - cursor > 0.01) segs.push({ cx: (cursor + u0) / 2, cy: height / 2, w: u0 - cursor, h: height });
    if (opening.y0 > 0.01) segs.push({ cx: (u0 + u1) / 2, cy: opening.y0 / 2, w: u1 - u0, h: Math.min(opening.y0, height) });
    const top = Math.min(height, opening.y1);
    if (height - top > 0.01) segs.push({ cx: (u0 + u1) / 2, cy: (top + height) / 2, w: u1 - u0, h: height - top });
    cursor = Math.max(cursor, u1);
  }
  if (right - cursor > 0.01) segs.push({ cx: (cursor + right) / 2, cy: height / 2, w: right - cursor, h: height });
  return segs;
}

/** Recorta el intervalo [a,b] (eje u) contra los vanos que solapan el rango vertical [y0,y1]. */
export function clipIntervals(
  a: number,
  b: number,
  openings: WallOpeningSlice[],
  y0: number,
  y1: number,
): Array<[number, number]> {
  if (!openings.length) return [[a, b]];
  const blocked = openings
    .filter((opening) => opening.y1 > y0 + 0.01 && opening.y0 < y1 - 0.01)
    .sort((p, q) => p.u0 - q.u0);
  const out: Array<[number, number]> = [];
  let cursor = a;
  for (const opening of blocked) {
    const u0 = Math.max(a, opening.u0);
    const u1 = Math.min(b, opening.u1);
    if (u1 <= u0) continue;
    if (u0 > cursor + 0.01) out.push([cursor, u0]);
    cursor = Math.max(cursor, u1);
  }
  if (b > cursor + 0.01) out.push([cursor, b]);
  return out;
}

export function smoothstep01(value: number) {
  const c = Math.min(1, Math.max(0, value));
  return c * c * (3 - 2 * c);
}

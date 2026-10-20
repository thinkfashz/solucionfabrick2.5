/*
 * plano390Audit — capa de control geométrico del Proyecto 390-1.
 *
 * Es el equivalente liviano de la "capa vinculada" de AutoCAD: trabaja sobre el
 * MISMO contrato que el 3D y el plano 2D (`plano390Data.ts`) y devuelve una
 * lista de hallazgos con código estable (M-xx muro, F-xx mueble, A-xx ambiente).
 *
 * Reglas:
 *  - Un muro no puede cruzarse con otro ni duplicarse (las esquinas en L y los
 *    encuentros en T son válidos).
 *  - Toda puerta/ventana debe estar sostenida por muros a los lados o por un
 *    tramo de vidrio; no puede quedar enterrada en un muro.
 *  - Un ambiente no puede superponerse a otro, salvo que esté contenido
 *    (ensuite dentro del dormitorio, lavandería dentro del garaje).
 *  - El mobiliario debe caber en su ambiente, no atravesar muros, no montarse
 *    sobre otro mueble y dejar libre el barrido de las puertas.
 *  - Un mueble alto no puede tapar una ventana.
 *
 * Sin dependencias: se puede ejecutar en el cliente y en un test de Node.
 */
import { FURNITURE_2D, OPENINGS, PLAN, ROOMS, WALLS } from './plano390Data';
import type { Furniture2D, Opening, RoomBox, WallSeg } from './plano390Data';

export type AuditSeverity = 'error' | 'warn' | 'info';

export type AuditKind =
  | 'muro-cruzado'
  | 'muro-fuera'
  | 'abertura-sin-muro'
  | 'abertura-tapada'
  | 'abertura-solape'
  | 'ambiente-solape'
  | 'ambiente-contenido'
  | 'area-declarada'
  | 'borde-sin-muro'
  | 'mueble-fuera'
  | 'mueble-muro'
  | 'mueble-solape'
  | 'puerta-bloqueada'
  | 'mueble-ventana';

export type AuditIssue = {
  /** AUD-01, AUD-02… */
  code: string;
  severity: AuditSeverity;
  kind: AuditKind;
  title: string;
  detail: string;
  /** M-xx, F-xx, A-xx, id de abertura. */
  refs: string[];
  /** Centro del conflicto en planta [x, z]. */
  at: [number, number];
};

export type AuditSummary = {
  errors: number;
  warnings: number;
  infos: number;
  total: number;
};

type Box = { x0: number; z0: number; x1: number; z1: number };
type RectOverlap = { w: number; h: number; area: number; x0: number; z0: number; x1: number; z1: number };

const TOL = 0.03;

export const wallCode = (i: number) => `M-${String(i + 1).padStart(2, '0')}`;
export const roomCode = (r: RoomBox) => `A-${String(Number(r.id)).padStart(2, '0')}`;
export const openingCode = (o: Opening) => o.id;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const norm = (b: { x0: number; z0: number; x1: number; z1: number }): Box => ({
  x0: Math.min(b.x0, b.x1),
  x1: Math.max(b.x0, b.x1),
  z0: Math.min(b.z0, b.z1),
  z1: Math.max(b.z0, b.z1),
});

function overlap(a: Box, b: Box): RectOverlap | null {
  const x0 = Math.max(a.x0, b.x0);
  const x1 = Math.min(a.x1, b.x1);
  const z0 = Math.max(a.z0, b.z0);
  const z1 = Math.min(a.z1, b.z1);
  if (x1 - x0 <= TOL || z1 - z0 <= TOL) return null;
  return { w: x1 - x0, h: z1 - z0, area: (x1 - x0) * (z1 - z0), x0, x1, z0, z1 };
}

function contains(outer: Box, inner: Box) {
  return (
    inner.x0 >= outer.x0 - TOL &&
    inner.x1 <= outer.x1 + TOL &&
    inner.z0 >= outer.z0 - TOL &&
    inner.z1 <= outer.z1 + TOL
  );
}

function midpoint(b: Box): [number, number] {
  return [(b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2];
}

/** ¿El solape toca un extremo del muro? Una T o una L sí; un cruce no. */
function touchesEnd(seg: Box, inter: RectOverlap) {
  const horizontal = seg.x1 - seg.x0 >= seg.z1 - seg.z0;
  return horizontal
    ? Math.abs(inter.x0 - seg.x0) < 0.06 || Math.abs(inter.x1 - seg.x1) < 0.06
    : Math.abs(inter.z0 - seg.z0) < 0.06 || Math.abs(inter.z1 - seg.z1) < 0.06;
}

/**
 * ¿El muro corre sobre el mismo eje y banda que la abertura?
 * Es clave exigir la MISMA orientación: si no, un muro perpendicular que
 * cruza la línea de fachada se contaba como si tapara la ventana.
 */
function alignedWithOpening(w: WallSeg, o: Opening) {
  const b = norm(w);
  // El muro tiene que ser delgado en la dirección normal al vano.
  if (o.axis === 'z') {
    return b.z1 - b.z0 <= 0.4 && o.z >= b.z0 - 0.17 && o.z <= b.z1 + 0.17;
  }
  return b.x1 - b.x0 <= 0.4 && o.x >= b.x0 - 0.17 && o.x <= b.x1 + 0.17;
}

function openingSpan(o: Opening) {
  const c = o.axis === 'z' ? o.x : o.z;
  return { min: c - o.width / 2, max: c + o.width / 2, center: c };
}



/** Zona de barrido de una puerta / paso, en planta. */
function doorSweep(o: Opening): Box | null {
  const w = o.width;
  const depth = Math.min(0.95, Math.max(0.8, w));
  if (o.kind === 'pass') {
    if (o.axis === 'z') return { x0: o.x - w / 2, x1: o.x + w / 2, z0: o.z - depth, z1: o.z + depth };
    return { x0: o.x - depth, x1: o.x + depth, z0: o.z - w / 2, z1: o.z + w / 2 };
  }
  if (o.axis === 'z') {
    const hinge = o.x + (o.hinge === 'right' ? w / 2 : -w / 2);
    const free = o.hinge === 'right' ? -w : w;
    const swing = o.swing ?? 1;
    return {
      x0: Math.min(hinge, hinge + free),
      x1: Math.max(hinge, hinge + free),
      z0: Math.min(o.z, o.z + swing * depth),
      z1: Math.max(o.z, o.z + swing * depth),
    };
  }
  const hinge = o.z + (o.hinge === 'right' ? w / 2 : -w / 2);
  const free = o.hinge === 'right' ? -w : w;
  const swing = o.swing ?? 1;
  return {
    x0: Math.min(o.x, o.x + swing * depth),
    x1: Math.max(o.x, o.x + swing * depth),
    z0: Math.min(hinge, hinge + free),
    z1: Math.max(hinge, hinge + free),
  };
}

function furnitureHeight(f: Furniture2D) {
  if (typeof f.h === 'number') return f.h;
  switch (f.kind) {
    case 'wardrobe':
      return 2.2;
    case 'fridge':
      return 1.85;
    case 'tv':
      return 2.4;
    case 'car':
      return 1.5;
    case 'quincho':
      return 2.5;
    case 'bed':
      return 0.55;
    case 'sofa':
      return 0.85;
    case 'chair':
      return 0.9;
    case 'desk':
      return 0.78;
    case 'counter':
    case 'island':
      return 0.9;
    case 'bath':
      return 1.0;
    case 'rug':
      return 0.02;
    default:
      return 1.0;
  }
}

const WINDOW_KINDS: Opening['kind'][] = ['window', 'slider'];

/**
 * Ejecuta la auditoría completa. Coste O(muros² + muebles²), despreciable
 * para 48 muros y 45 muebles.
 */
export function auditPlano(): AuditIssue[] {
  const out: Omit<AuditIssue, 'code'>[] = [];
  const push = (issue: Omit<AuditIssue, 'code'>) => out.push(issue);

  const wallsBox = WALLS.map(norm);
  const roomsBox = ROOMS.map(norm);
  const furnBox = FURNITURE_2D.map(norm);

  // ── 1. Muros: cruces y duplicados ────────────────────────────────
  for (let i = 0; i < wallsBox.length; i++) {
    for (let j = i + 1; j < wallsBox.length; j++) {
      const o = overlap(wallsBox[i], wallsBox[j]);
      if (!o || o.area < 0.008) continue;
      const iEnd = touchesEnd(wallsBox[i], o);
      const jEnd = touchesEnd(wallsBox[j], o);
      if (iEnd || jEnd) continue; // esquina en L o encuentro en T
      push({
        severity: 'error',
        kind: 'muro-cruzado',
        title: 'Muros cruzados',
        detail: `${wallCode(i)} y ${wallCode(j)} se atraviesan en ${o.w.toFixed(2)} × ${o.h.toFixed(2)} m. Uno de los dos debe terminar antes del encuentro.`,
        refs: [wallCode(i), wallCode(j)],
        at: midpoint(o),
      });
    }
  }

  // Muros fuera de la envolvente (los del porche/quincho no están en WALLS).
  for (let i = 0; i < wallsBox.length; i++) {
    const b = wallsBox[i];
    if (b.x0 < -0.001 || b.z0 < -0.001 || b.x1 > PLAN.widthM + 0.001 || b.z1 > PLAN.depthM + 0.001) {
      push({
        severity: 'error',
        kind: 'muro-fuera',
        title: 'Muro fuera de la envolvente',
        detail: `${wallCode(i)} sale del rectángulo ${PLAN.widthM.toFixed(2)} × ${PLAN.depthM.toFixed(2)} m.`,
        refs: [wallCode(i)],
        at: midpoint(b),
      });
    }
  }

  // ── 2. Aberturas: apoyo, tapado y solape ────────────────────────
  for (let k = 0; k < OPENINGS.length; k++) {
    const o = OPENINGS[k];
    const span = openingSpan(o);
    const jambs: number[] = [];
    let cover = 0;
    let glassSupport = false;

    for (let i = 0; i < WALLS.length; i++) {
      const w = WALLS[i];
      if (!alignedWithOpening(w, o)) continue;
      const b = norm(w);
      const ws = o.axis === 'z' ? { min: b.x0, max: b.x1 } : { min: b.z0, max: b.z1 };
      const inter = Math.max(0, Math.min(span.max, ws.max) - Math.max(span.min, ws.min));
      if (w.window) {
        if (inter / o.width > 0.75) glassSupport = true;
        continue;
      }
      cover += inter;
      // Un jamba no se solapa con el vano: termina justo en su borde.
      const touchesStart = Math.abs(ws.max - span.min) < 0.06;
      const touchesEnd = Math.abs(ws.min - span.max) < 0.06;
      if (touchesStart || touchesEnd) jambs.push(i);
    }

    if (cover / o.width > 0.45) {
      push({
        severity: 'error',
        kind: 'abertura-tapada',
        title: 'Abertura enterrada en un muro',
        detail: `${openingCode(o)} (${o.kind}) está tapada por un muro en ${(cover / o.width * 100).toFixed(0)} % de su ancho.`,
        refs: [openingCode(o)],
        at: [o.x, o.z],
      });
    } else if (!glassSupport && jambs.length < 2) {
      push({
        severity: 'error',
        kind: 'abertura-sin-muro',
        title: 'Abertura sin apoyo',
        detail: `${openingCode(o)} (${o.kind}) no tiene muros en ambos lados ni un tramo de vidrio que la sostenga.`,
        refs: [openingCode(o)],
        at: [o.x, o.z],
      });
    }
  }

  for (let i = 0; i < OPENINGS.length; i++) {
    for (let j = i + 1; j < OPENINGS.length; j++) {
      const a = OPENINGS[i];
      const b = OPENINGS[j];
      if (a.axis !== b.axis) continue;
      const lineA = a.axis === 'z' ? a.z : a.x;
      const lineB = b.axis === 'z' ? b.z : b.x;
      if (Math.abs(lineA - lineB) > 0.1) continue;
      const ca = a.axis === 'z' ? a.x : a.z;
      const cb = b.axis === 'z' ? b.x : b.z;
      if (Math.abs(ca - cb) < (a.width + b.width) / 2 - 0.02) {
        push({
          severity: 'warn',
          kind: 'abertura-solape',
          title: 'Aberturas superpuestas',
          detail: `${openingCode(a)} y ${openingCode(b)} comparten el mismo vano.`,
          refs: [openingCode(a), openingCode(b)],
          at: [a.x, a.z],
        });
      }
    }
  }

  // ── 3. Ambientes: contención válida y solapes ───────────────────
  for (let i = 0; i < ROOMS.length; i++) {
    for (let j = i + 1; j < ROOMS.length; j++) {
      const a = roomsBox[i];
      const b = roomsBox[j];
      const o = overlap(a, b);
      if (!o || o.area < 0.05) continue;
      const aInB = contains(b, a);
      const bInA = contains(a, b);
      if (aInB || bInA) {
        const inner = aInB ? ROOMS[i] : ROOMS[j];
        const outer = aInB ? ROOMS[j] : ROOMS[i];
        push({
          severity: 'info',
          kind: 'ambiente-contenido',
          title: 'Ambiente contenido',
          detail: `${inner.name} (${roomCode(inner)}) vive dentro de ${outer.name} (${roomCode(outer)}); es válido si tiene muro y puerta propios.`,
          refs: [roomCode(inner), roomCode(outer)],
          at: midpoint(o),
        });
      } else {
        push({
          severity: 'error',
          kind: 'ambiente-solape',
          title: 'Ambientes superpuestos',
          detail: `${ROOMS[i].name} (${roomCode(ROOMS[i])}) y ${ROOMS[j].name} (${roomCode(ROOMS[j])}) se pisan en ${o.area.toFixed(2)} m².`,
          refs: [roomCode(ROOMS[i]), roomCode(ROOMS[j])],
          at: midpoint(o),
        });
      }
    }
  }

  // ── 3b. Superficie declarada = bruta − ambientes contenidos ─────
  for (let i = 0; i < ROOMS.length; i++) {
    const r = ROOMS[i];
    const gross = (r.x1 - r.x0) * (r.z1 - r.z0);
    let nested = 0;
    for (let j = 0; j < ROOMS.length; j++) {
      if (i === j) continue;
      if (contains(roomsBox[i], roomsBox[j])) nested += (ROOMS[j].x1 - ROOMS[j].x0) * (ROOMS[j].z1 - ROOMS[j].z0);
    }
    const net = gross - nested;
    if (Math.abs(net - r.areaM2) > 0.12) {
      push({
        severity: 'error',
        kind: 'area-declarada',
        title: 'Superficie declarada incoherente',
        detail: `${r.name} (${roomCode(r)}) declara ${r.areaM2.toFixed(2)} m² pero la geometría da ${net.toFixed(2)} m² netos (${gross.toFixed(2)} brutos − ${nested.toFixed(2)} contenidos).`,
        refs: [roomCode(r)],
        at: midpoint(roomsBox[i]),
      });
    }
  }

  // ── 4. Bordes de ambiente sin muro ni paso ──────────────────────
  const step = 0.1;
  for (let r = 0; r < ROOMS.length; r++) {
    if (ROOMS[r].id === '12') continue; // porche: abierto por definición
    const room = ROOMS[r];
    const edges = [
      { axis: 'z' as const, at: room.z0, from: room.x0, to: room.x1 },
      { axis: 'z' as const, at: room.z1, from: room.x0, to: room.x1 },
      { axis: 'x' as const, at: room.x0, from: room.z0, to: room.z1 },
      { axis: 'x' as const, at: room.x1, from: room.z0, to: room.z1 },
    ];
    for (const e of edges) {
      const len = e.to - e.from;
      if (len < 0.3) continue;
      const gaps: { a: number; b: number }[] = [];
      let run: { a: number; b: number } | null = null;
      for (let t = e.from; t <= e.to + 1e-6; t += step) {
        let covered = false;
        for (let i = 0; i < WALLS.length && !covered; i++) {
          const b = wallsBox[i];
          if (e.axis === 'z') {
            if (Math.abs(e.at - b.z0) < 0.06 || Math.abs(e.at - b.z1) < 0.06) {
              if (t >= b.x0 - 0.04 && t <= b.x1 + 0.04) covered = true;
            } else if (e.at >= b.z0 - 0.04 && e.at <= b.z1 + 0.04 && t >= b.x0 - 0.04 && t <= b.x1 + 0.04) {
              covered = true; // el borde cae dentro del muro (muro perpendicular)
            }
          } else if (Math.abs(e.at - b.x0) < 0.06 || Math.abs(e.at - b.x1) < 0.06) {
            if (t >= b.z0 - 0.04 && t <= b.z1 + 0.04) covered = true;
          } else if (e.at >= b.x0 - 0.04 && e.at <= b.x1 + 0.04 && t >= b.z0 - 0.04 && t <= b.z1 + 0.04) {
            covered = true;
          }
        }
        for (let i = 0; i < OPENINGS.length && !covered; i++) {
          const o = OPENINGS[i];
          const c = e.axis === 'z' ? o.x : o.z;
          if (e.axis === 'z') {
            if (o.axis === 'z' && Math.abs(o.z - e.at) < 0.2 && Math.abs(t - c) <= o.width / 2 + 0.02) covered = true;
          } else if (o.axis === 'x' && Math.abs(o.x - e.at) < 0.2 && Math.abs(t - c) <= o.width / 2 + 0.02) {
            covered = true;
          }
        }
        for (let i = 0; i < ROOMS.length && !covered; i++) {
          if (i === r) continue;
          const b = roomsBox[i];
          if (e.axis === 'z') {
            if ((Math.abs(e.at - b.z0) < 0.06 || Math.abs(e.at - b.z1) < 0.06) && t >= b.x0 - 0.04 && t <= b.x1 + 0.04) covered = true;
            else if (e.at >= b.z0 - 0.04 && e.at <= b.z1 + 0.04 && t >= b.x0 - 0.04 && t <= b.x1 + 0.04) covered = true;
          } else if (Math.abs(e.at - b.x0) < 0.06 || Math.abs(e.at - b.x1) < 0.06) {
            if (t >= b.z0 - 0.04 && t <= b.z1 + 0.04) covered = true;
          } else if (e.at >= b.x0 - 0.04 && e.at <= b.x1 + 0.04 && t >= b.z0 - 0.04 && t <= b.z1 + 0.04) covered = true;
        }
        if (!covered) {
          if (!run) run = { a: t, b: t };
          else run.b = t;
        } else if (run) {
          if (run.b - run.a > 0.4) gaps.push(run);
          run = null;
        }
      }
      if (run && run.b - run.a > 0.4) gaps.push(run);
      for (const g of gaps) {
        push({
          severity: 'error',
          kind: 'borde-sin-muro',
          title: 'Borde de ambiente abierto',
          detail: `${ROOMS[r].name} (${roomCode(ROOMS[r])}) tiene ${(g.b - g.a).toFixed(2)} m sin muro, ventana ni paso declarado en ${e.axis} = ${e.at.toFixed(2)}.`,
          refs: [roomCode(ROOMS[r])],
          at: e.axis === 'z' ? [(g.a + g.b) / 2, e.at] : [e.at, (g.a + g.b) / 2],
        });
      }
    }
  }

  // ── 5. Mobiliario: ambiente, muros, solapes ─────────────────────
  for (let i = 0; i < FURNITURE_2D.length; i++) {
    const f = FURNITURE_2D[i];
    const box = furnBox[i];
    if (f.room) {
      const room = ROOMS.find((r) => r.id === f.room);
      if (!room) {
        push({
          severity: 'error',
          kind: 'mueble-fuera',
          title: 'Mueble sin ambiente',
          detail: `${f.id} ${f.name} apunta al ambiente ${f.room}, que no existe.`,
          refs: [f.id],
          at: midpoint(box),
        });
      } else if (!contains(norm(room), box)) {
        // Una silla puede entrar bajo la mesa o cruzar un borde abierto hasta 12 cm.
        const tol = f.kind === 'chair' ? 0.12 : TOL;
        const r = norm(room);
        const fits = box.x0 >= r.x0 - tol && box.x1 <= r.x1 + tol && box.z0 >= r.z0 - tol && box.z1 <= r.z1 + tol;
        if (fits) continue;
        push({
          severity: 'error',
          kind: 'mueble-fuera',
          title: 'Mueble fuera de su ambiente',
          detail: `${f.id} ${f.name} se sale de ${room.name} (${roomCode(room)}).`,
          refs: [f.id, roomCode(room)],
          at: midpoint(box),
        });
      }
    }

    if (!f.soft && !f.onWall) {
      for (let w = 0; w < WALLS.length; w++) {
        const o = overlap(box, wallsBox[w]);
        if (o && o.area > 0.012) {
          push({
            severity: 'error',
            kind: 'mueble-muro',
            title: 'Mueble atravesando un muro',
            detail: `${f.id} ${f.name} entra ${o.area.toFixed(2)} m² en ${wallCode(w)}.`,
            refs: [f.id, wallCode(w)],
            at: midpoint(o),
          });
          break;
        }
      }
    }
  }

  for (let i = 0; i < FURNITURE_2D.length; i++) {
    if (FURNITURE_2D[i].soft) continue;
    for (let j = i + 1; j < FURNITURE_2D.length; j++) {
      if (FURNITURE_2D[j].soft) continue;
      const o = overlap(furnBox[i], furnBox[j]);
      if (!o || o.area < 0.02) continue;
      push({
        severity: 'error',
        kind: 'mueble-solape',
        title: 'Muebles montados',
        detail: `${FURNITURE_2D[i].id} ${FURNITURE_2D[i].name} y ${FURNITURE_2D[j].id} ${FURNITURE_2D[j].name} comparten ${o.area.toFixed(2)} m².`,
        refs: [FURNITURE_2D[i].id, FURNITURE_2D[j].id],
        at: midpoint(o),
      });
    }
  }

  // ── 6. Barrido de puertas y pasos ──────────────────────────────
  for (const o of OPENINGS) {
    if (!['door', 'double', 'pass'].includes(o.kind)) continue;
    const sweep = doorSweep(o);
    if (!sweep) continue;
    for (let i = 0; i < FURNITURE_2D.length; i++) {
      const f = FURNITURE_2D[i];
      if (f.soft || f.onWall) continue;
      const hit = overlap(sweep, furnBox[i]);
      if (hit && hit.area > 0.12) {
        push({
          severity: 'warn',
          kind: 'puerta-bloqueada',
          title: 'Puerta con barrido ocupado',
          detail: `${openingCode(o)} no puede abrir del todo: ${f.id} ${f.name} ocupa ${hit.area.toFixed(2)} m² del barrido.`,
          refs: [openingCode(o), f.id],
          at: midpoint(hit),
        });
        break;
      }
    }
  }

  // ── 7. Mueble alto delante de una ventana ──────────────────────
  for (const o of OPENINGS) {
    if (!WINDOW_KINDS.includes(o.kind)) continue;
    const sill = o.sill ?? 0;
    if (sill <= 0.2) continue; // ventanal a piso: se puede amoblar en parte
    const span = openingSpan(o);
    const band: Box =
      o.axis === 'z'
        ? { x0: span.min, x1: span.max, z0: o.z - 0.35, z1: o.z + 0.35 }
        : { x0: o.x - 0.35, x1: o.x + 0.35, z0: span.min, z1: span.max };
    for (let i = 0; i < FURNITURE_2D.length; i++) {
      const f = FURNITURE_2D[i];
      if (f.soft) continue;
      if (f.kind === 'bath') continue; // ducha/baño: el vidrio y la ventana alta conviven
      const h = furnitureHeight(f);
      if (h <= sill + 0.05) continue;
      const hit = overlap(band, furnBox[i]);
      if (hit && hit.area > 0.04) {
        push({
          severity: 'warn',
          kind: 'mueble-ventana',
          title: 'Mueble alto delante de ventana',
          detail: `${f.id} ${f.name} (${h.toFixed(2)} m) tapa ${openingCode(o)} con alféizar ${sill.toFixed(2)} m.`,
          refs: [f.id, openingCode(o)],
          at: midpoint(hit),
        });
        break;
      }
    }
  }

  // Orden estable: errores → avisos → info, y por ubicación.
  const rank: Record<AuditSeverity, number> = { error: 0, warn: 1, info: 2 };
  out.sort((a, b) => rank[a.severity] - rank[b.severity] || a.at[1] - b.at[1] || a.at[0] - b.at[0]);

  return out.map((issue, i) => ({ ...issue, code: `AUD-${String(i + 1).padStart(2, '0')}` }));
}

export function auditSummary(issues: AuditIssue[]): AuditSummary {
  return {
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warn').length,
    infos: issues.filter((i) => i.severity === 'info').length,
    total: issues.length,
  };
}

/** Redondeo de cotas para la capa de anotación (2 decimales, coma chilena). */
export function fmtM(v: number) {
  return v.toFixed(2).replace('.', ',');
}

export { clamp };

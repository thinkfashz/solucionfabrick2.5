/*
 * plano390Data.ts — Casa Fabrick "Mediterránea 148" (v2, plano del cliente).
 * Origen en esquina NO de los muros exteriores.
 * x → Este (0..14,60), z → Sur (0..11,00); z negativo = jardín norte.
 *
 * Distribución (plano capturado, 2026-10-20):
 *   Norte:  Dorm. 2 · Cocina · Dorm. 1
 *   Medio:  Baño · Pasillo · Comedor · Ensuite · Vestíbulo
 *   Sur:    Dorm. 3 · Living doble altura · Garaje
 *   Exterior: porche centrado, garaje al oriente, jardín y adoquín al frente.
 *
 * Contrato compartido por la escena, el recorrido y el HUD.
 */

export type FloorKind = 'porcelain' | 'wood' | 'tile' | 'terrace' | 'concrete';

export type RoomBox = {
  id: string;
  name: string;
  areaM2: number;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  floor: FloorKind;
  /** altura libre (el living se dibuja con 2,80 m) */
  ceiling?: number;
};

export type WallSeg = {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  kind: 'ext' | 'int';
  /** tramo de vidrio: bloquea el paso y la escena lo dibuja como abertura */
  window?: boolean;
};

export type PhotoSpot = {
  id: string;
  label: string;
  pos: [number, number, number];
  look: [number, number, number];
  color: string;
};

export type TourStop = {
  label: string;
  note: string;
  /** Ficha técnica corta que se muestra durante el recorrido. */
  meta: string;
  pos: [number, number, number];
  look: [number, number, number];
};

/** Vista directa a una escena (selector inferior "Escena"). */
export type SceneView = {
  id: string;
  label: string;
  pos: [number, number, number];
  look: [number, number, number];
};

/**
 * Aberturas: puertas, ventanas corredizas y portón de garaje.
 * `axis: 'z'` = muro que corre en X (la abertura se mide en X sobre `z`).
 * `axis: 'x'` = muro que corre en Z (la abertura se mide en Z sobre `x`).
 */
export type Opening = {
  id: string;
  kind: 'door' | 'double' | 'slider' | 'window' | 'garage' | 'pass';
  axis: 'x' | 'z';
  /** centro de la abertura */
  x: number;
  z: number;
  width: number;
  height: number;
  /** alféizar (ventanas y ventanillas) */
  sill?: number;
  /** 1 = abre hacia +x/+z, -1 = hacia -x/-z */
  swing?: 1 | -1;
  /** bisagra: izquierda o derecha vista desde dentro */
  hinge?: 'left' | 'right';
  ext?: boolean;
  glass?: boolean;
};

export const PLAN = {
  widthM: 14.6,
  depthM: 11,
  wallH: 2.8,
  extT: 0.25,
  intT: 0.12,
  ridgeExtra: 0,
  terraceDepthM: 1.8,
  stepH: 0.18,
  /** sol al S a 50° → sombra = h / tan(50°) ≈ 0,84·h */
  sunElevationDeg: 50,
  sunSombraFactor: 0.84,
  eyeH: 1.62,
} as const;

/** Ambientes del plano (numerados como la lista del proyecto). */
export const ROOMS: RoomBox[] = [
  { id: '1', name: 'Dormitorio 2', areaM2: 10.01, x0: 0.25, z0: 0.25, x1: 3.34, z1: 3.49, floor: 'wood' },
  { id: '2', name: 'Cocina', areaM2: 13.24, x0: 3.46, z0: 0.25, x1: 7.4, z1: 3.61, floor: 'porcelain' },
  { id: '3', name: 'Dormitorio 1', areaM2: 15.84, x0: 9.46, z0: 0.25, x1: 14.35, z1: 3.49, floor: 'wood' },
  { id: '4', name: 'Comedor', areaM2: 13.76, x0: 3.46, z0: 3.61, x1: 9.34, z1: 5.95, floor: 'porcelain' },
  { id: '5', name: 'Baño', areaM2: 4.56, x0: 0.25, z0: 3.61, x1: 2.2, z1: 5.95, floor: 'porcelain' },
  { id: '6', name: 'Pasillo', areaM2: 2.39, x0: 2.32, z0: 3.61, x1: 3.34, z1: 5.95, floor: 'porcelain' },
  { id: '7', name: 'Ensuite', areaM2: 3.11, x0: 9.46, z0: 3.61, x1: 11.2, z1: 5.4, floor: 'porcelain' },
  { id: '8', name: 'Vestíbulo', areaM2: 5.42, x0: 11.32, z0: 3.61, x1: 14.35, z1: 5.4, floor: 'porcelain' },
  { id: '9', name: 'Living', areaM2: 28.22, x0: 3.46, z0: 5.95, x1: 9.34, z1: 10.75, floor: 'porcelain' },
  { id: '10', name: 'Dormitorio 3', areaM2: 14.46, x0: 0.25, z0: 6.07, x1: 3.34, z1: 10.75, floor: 'wood' },
  { id: '11', name: 'Garaje', areaM2: 25.57, x0: 9.46, z0: 5.52, x1: 14.35, z1: 10.75, floor: 'concrete' },
  { id: '12', name: 'Porche', areaM2: 6.12, x0: 5.65, z0: 10.75, x1: 9.05, z1: 12.55, floor: 'terrace' },
];

/**
 * Muros como cajas (x0,z0 → x1,z1). Los vanos son saltos entre cajas.
 * `window: true` = tramo de vidrio: bloquea colisión y la escena lo deja a
 * OPENINGS (que dibuja el vidrio animado).
 */
export const WALLS: WallSeg[] = [
  // ── Fachada sur (z 10,75…11,00) ─────────────────────────────────
  { x0: 0, z0: 10.75, x1: 1.0, z1: 11.0, kind: 'ext' },
  { x0: 1.0, z0: 10.75, x1: 2.6, z1: 11.0, kind: 'ext', window: true },   // ventana dorm. 3
  { x0: 2.6, z0: 10.75, x1: 3.95, z1: 11.0, kind: 'ext' },
  { x0: 3.95, z0: 10.75, x1: 5.75, z1: 11.0, kind: 'ext', window: true }, // ventanal living
  { x0: 5.75, z0: 10.75, x1: 6.35, z1: 11.0, kind: 'ext' },
  // vano 6,35…7,75 = puerta principal (doble vidrio)
  { x0: 7.75, z0: 10.75, x1: 10.15, z1: 11.0, kind: 'ext' },
  { x0: 10.15, z0: 10.75, x1: 13.75, z1: 11.0, kind: 'ext', window: true }, // portón garaje
  { x0: 13.75, z0: 10.75, x1: 14.6, z1: 11.0, kind: 'ext' },
  // ── Fachada norte (z 0…0,25) ────────────────────────────────────
  { x0: 0, z0: 0, x1: 1.1, z1: 0.25, kind: 'ext' },
  { x0: 1.1, z0: 0, x1: 2.5, z1: 0.25, kind: 'ext', window: true },       // dorm. 2
  { x0: 2.5, z0: 0, x1: 4.4, z1: 0.25, kind: 'ext' },
  { x0: 4.4, z0: 0, x1: 6.0, z1: 0.25, kind: 'ext', window: true },       // cocina
  { x0: 6.0, z0: 0, x1: 11.2, z1: 0.25, kind: 'ext' },
  { x0: 11.2, z0: 0, x1: 13.0, z1: 0.25, kind: 'ext', window: true },     // dorm. 1
  { x0: 13.0, z0: 0, x1: 14.6, z1: 0.25, kind: 'ext' },
  // ── Poniente (x 0…0,25) ─────────────────────────────────────────
  { x0: 0, z0: 0, x1: 0.25, z1: 1.4, kind: 'ext' },
  { x0: 0, z0: 1.4, x1: 0.25, z1: 2.8, kind: 'ext', window: true },       // dorm. 2
  { x0: 0, z0: 2.8, x1: 0.25, z1: 4.2, kind: 'ext' },
  { x0: 0, z0: 4.2, x1: 0.25, z1: 5.1, kind: 'ext', window: true },       // baño
  { x0: 0, z0: 5.1, x1: 0.25, z1: 11.0, kind: 'ext' },
  // ── Oriente (x 14,35…14,60) ─────────────────────────────────────
  { x0: 14.35, z0: 0, x1: 14.6, z1: 4.0, kind: 'ext' },
  { x0: 14.35, z0: 4.0, x1: 14.6, z1: 4.8, kind: 'ext', window: true },   // ensuite
  { x0: 14.35, z0: 4.8, x1: 14.6, z1: 11.0, kind: 'ext' },

  // ── Tabiques ────────────────────────────────────────────────────
  // Bloque poniente | centro (x 3,34…3,46), con paso al living en 5,20…6,00
  { x0: 3.34, z0: 0.25, x1: 3.46, z1: 3.49, kind: 'int' },
  { x0: 3.34, z0: 3.61, x1: 3.46, z1: 5.2, kind: 'int' },
  { x0: 3.34, z0: 6.0, x1: 3.46, z1: 10.75, kind: 'int' },
  // Norte | medio, lado poniente (z 3,49…3,61), puerta dorm. 2 en 2,45…3,20
  { x0: 0.25, z0: 3.49, x1: 2.45, z1: 3.61, kind: 'int' },
  { x0: 3.2, z0: 3.49, x1: 3.34, z1: 3.61, kind: 'int' },
  // Baño | pasillo (x 2,20…2,32), puerta en 4,15…5,00
  { x0: 2.2, z0: 3.61, x1: 2.32, z1: 4.15, kind: 'int' },
  { x0: 2.2, z0: 5.0, x1: 2.32, z1: 5.95, kind: 'int' },
  // Pasillo/baño | dorm. 3 (z 5,95…6,07), puerta dorm. 3 en 2,45…3,20
  { x0: 0.25, z0: 5.95, x1: 2.45, z1: 6.07, kind: 'int' },
  { x0: 3.2, z0: 5.95, x1: 3.34, z1: 6.07, kind: 'int' },
  // Centro | oriente (x 9,34…9,46), paso al vestíbulo en 3,80…5,20
  { x0: 9.34, z0: 0.25, x1: 9.46, z1: 3.8, kind: 'int' },
  { x0: 9.34, z0: 5.2, x1: 9.46, z1: 10.75, kind: 'int' },
  // Norte | medio, lado oriente, puerta dorm. 1 en 12,50…13,35
  { x0: 9.46, z0: 3.49, x1: 12.5, z1: 3.61, kind: 'int' },
  { x0: 13.35, z0: 3.49, x1: 14.35, z1: 3.61, kind: 'int' },
  // Ensuite | vestíbulo (x 11,20…11,32), puerta en 4,30…5,15
  { x0: 11.2, z0: 3.61, x1: 11.32, z1: 4.3, kind: 'int' },
  { x0: 11.2, z0: 5.15, x1: 11.32, z1: 5.4, kind: 'int' },
  // Vestíbulo/ensuite | garaje (z 5,40…5,52), puerta en 13,20…14,05
  { x0: 9.46, z0: 5.4, x1: 13.2, z1: 5.52, kind: 'int' },
  { x0: 14.05, z0: 5.4, x1: 14.35, z1: 5.52, kind: 'int' },
];

/** Aberturas animables (puertas, ventanas corredizas y portón de garaje). */
export const OPENINGS: Opening[] = [
  // Fachada sur
  { id: 'd-main', kind: 'double', axis: 'z', x: 7.05, z: 10.875, width: 1.4, height: 2.25, ext: true, glass: true, swing: -1 },
  { id: 'w-sala', kind: 'slider', axis: 'z', x: 4.85, z: 10.875, width: 1.8, height: 2.15, sill: 0.35, ext: true, glass: true },
  { id: 'w-d3', kind: 'slider', axis: 'z', x: 1.8, z: 10.875, width: 1.6, height: 1.35, sill: 0.95, ext: true, glass: true },
  { id: 'd-garage', kind: 'garage', axis: 'z', x: 11.95, z: 10.875, width: 3.6, height: 2.35, ext: true },
  // Fachada norte
  { id: 'w-d2', kind: 'window', axis: 'z', x: 1.8, z: 0.125, width: 1.4, height: 1.3, sill: 0.95, ext: true, glass: true },
  { id: 'w-kitchen', kind: 'window', axis: 'z', x: 5.2, z: 0.125, width: 1.6, height: 1.1, sill: 1.05, ext: true, glass: true },
  { id: 'w-d1', kind: 'window', axis: 'z', x: 12.1, z: 0.125, width: 1.8, height: 1.35, sill: 0.95, ext: true, glass: true },
  // Poniente
  { id: 'w-d2w', kind: 'window', axis: 'x', x: 0.125, z: 2.1, width: 1.4, height: 1.3, sill: 0.95, ext: true, glass: true },
  { id: 'w-bath', kind: 'window', axis: 'x', x: 0.125, z: 4.65, width: 0.9, height: 0.6, sill: 1.6, ext: true, glass: true },
  // Oriente
  { id: 'w-ensuite', kind: 'window', axis: 'x', x: 14.475, z: 4.4, width: 0.8, height: 0.65, sill: 1.55, ext: true, glass: true },
  // Puertas interiores
  { id: 'd-d2', kind: 'door', axis: 'z', x: 2.825, z: 3.55, width: 0.75, height: 2.05, hinge: 'right', swing: 1 },
  { id: 'd-d3', kind: 'door', axis: 'z', x: 2.825, z: 6.01, width: 0.75, height: 2.05, hinge: 'left', swing: 1 },
  { id: 'd-bath', kind: 'door', axis: 'x', x: 2.26, z: 4.575, width: 0.85, height: 2.05, hinge: 'left', swing: -1 },
  { id: 'd-d1', kind: 'door', axis: 'z', x: 12.925, z: 3.55, width: 0.85, height: 2.05, hinge: 'right', swing: 1 },
  { id: 'd-ensuite', kind: 'door', axis: 'x', x: 11.26, z: 4.725, width: 0.85, height: 2.05, hinge: 'left', swing: 1 },
  { id: 'd-garage-int', kind: 'door', axis: 'z', x: 13.625, z: 5.46, width: 0.85, height: 2.05, hinge: 'left', swing: -1 },
  // Pasos sin hoja (solo dintel)
  { id: 'p-hall', kind: 'pass', axis: 'x', x: 3.4, z: 5.6, width: 0.8, height: 2.2 },
  { id: 'p-vest', kind: 'pass', axis: 'x', x: 9.4, z: 4.5, width: 1.4, height: 2.2 },
];

/** Muro de TV del living: 3,80 m de largo (captura del cliente). */
export const TV_WALL = {
  /** plano del muro (cara interior del tabique poniente) */
  x: 3.46,
  z0: 7.0,
  z1: 10.8,
  /** panel de piedra central de 2,20 m */
  panelZ0: 7.75,
  panelZ1: 9.95,
  tv: { w: 1.4, h: 0.79, y: 1.2, z: 8.85 },
  unit: { len: 2.6, h: 0.45, d: 0.5, y: 0.45, z: 8.85 },
  panelH: 1.8,
} as const;

/** Cocina: isla 2,40 × 1,00 × 0,90 + barra 1,05 (captura de alturas). */
export const KITCHEN = {
  counterH: 0.9,
  counterD: 0.62,
  upperY: 1.4,
  upperH: 0.7,
  island: { x: 5.5, z: 2.55, w: 2.4, d: 1.0, h: 0.9, barH: 1.05, overhang: 0.3 },
  fridge: { w: 0.9, h: 1.85, d: 0.7 },
  stools: 3,
} as const;

/** Garaje: 4,89 × 5,23 m, portón de 3,60 × 2,35 m. */
export const GARAGE = {
  x0: 9.46,
  x1: 14.35,
  z0: 5.52,
  z1: 10.75,
  door: { x0: 10.15, x1: 13.75, h: 2.35 },
} as const;

/** Apliques de muro exteriores (x, y, z, giro). */
export const SCONCES: { x: number; y: number; z: number; rot: number }[] = [
  { x: 3.55, y: 2.25, z: 11.03, rot: 0 },
  { x: 5.72, y: 2.35, z: 11.36, rot: 0 },
  { x: 8.68, y: 2.35, z: 11.36, rot: 0 },
  { x: 10.35, y: 2.25, z: 11.03, rot: 0 },
  { x: 3.58, y: 1.95, z: 7.15, rot: Math.PI / 2 },
  { x: 3.58, y: 1.95, z: 10.65, rot: Math.PI / 2 },
];

/** Interruptores y enchufes: placa 0,09 × 0,12 m. y 1,10 / 0,30. */
export const SWITCHES: { x: number; y: number; z: number; rot: number; outlet?: boolean }[] = [
  { x: 6.6, y: 1.1, z: 10.69, rot: Math.PI },           // entrada (junto a la puerta)
  { x: 3.6, y: 1.1, z: 10.69, rot: Math.PI },           // living, muro sur
  { x: 9.28, y: 1.1, z: 10.0, rot: -Math.PI / 2 },      // living, muro oriente
  { x: 3.55, y: 0.3, z: 10.2, rot: Math.PI / 2, outlet: true },
  { x: 3.75, y: 1.2, z: 0.38, rot: 0, outlet: true },   // cocina, muro norte
  { x: 6.2, y: 1.2, z: 0.38, rot: 0, outlet: true },
  { x: 3.55, y: 0.3, z: 2.9, rot: Math.PI / 2, outlet: true }, // cocina, muro poniente
  { x: 2.55, y: 1.1, z: 3.44, rot: Math.PI },           // dormitorio 2
  { x: 0.4, y: 0.3, z: 2.9, rot: Math.PI / 2, outlet: true },
  { x: 2.55, y: 1.1, z: 6.12, rot: 0 },                 // dormitorio 3
  { x: 0.4, y: 0.3, z: 9.9, rot: Math.PI / 2, outlet: true },
  { x: 12.9, y: 1.1, z: 3.44, rot: Math.PI },           // dormitorio 1
  { x: 14.2, y: 0.3, z: 1.2, rot: -Math.PI / 2, outlet: true },
  { x: 11.4, y: 1.1, z: 4.2, rot: 0 },                  // vestíbulo
  { x: 2.15, y: 1.1, z: 5.8, rot: Math.PI },            // baño
  { x: 11.25, y: 1.1, z: 4.05, rot: -Math.PI / 2 },     // ensuite
  { x: 13.7, y: 1.1, z: 6.0, rot: 0 },                  // garaje
];

/** Volúmenes que bloquean el paso (muebles grandes y auto). */
export const BLOCKERS: { x0: number; z0: number; x1: number; z1: number }[] = [
  { x0: 4.25, z0: 2.0, x1: 6.75, z1: 3.1 },    // isla
  { x0: 7.35, z0: 7.9, x1: 8.95, z1: 10.3 },   // sofá
  { x0: 5.6, z0: 4.1, x1: 7.4, z1: 5.4 },      // mesa de comedor
  { x0: 10.6, z0: 7.6, x1: 13.0, z1: 10.1 },   // auto
];

/** Puntos de foto con cuña/dirección. */
export const PHOTO_SPOTS: PhotoSpot[] = [
  { id: '41', label: 'Foto 41 · living y muro de TV', pos: [8.7, 1.55, 9.8], look: [3.7, 1.2, 8.9], color: '#C56A3A' },
  { id: '44', label: 'Foto 44 · cocina e isla', pos: [7.0, 1.55, 3.4], look: [4.4, 1.0, 1.2], color: '#2E6FA0' },
  { id: '50', label: 'Foto 50 · comedor', pos: [8.6, 1.55, 5.6], look: [5.6, 1.0, 4.5], color: '#2E6FA0' },
  { id: '58', label: 'Foto 58 · dormitorio 1', pos: [13.9, 1.55, 3.2], look: [11.0, 1.0, 0.9], color: '#C56A3A' },
];

/** Recorrido guiado: cámara a 1,62 m, 16 paradas. */
export const TOUR_STOPS: TourStop[] = [
  { label: 'Fachada sur', note: 'Casa mediterránea de una planta, 148 m²', meta: '3 dorm · 2 baños · garaje · porche · 148 m²', pos: [7.2, 1.7, 17.6], look: [7.2, 2.4, 11.3] },
  { label: 'Porche de acceso', note: 'Paso cubierto y puerta de doble vidrio', meta: 'Porche 3,40 × 1,80 m · puerta 1,40 m', pos: [7.05, 1.68, 13.1], look: [7.05, 1.95, 10.9] },
  { label: 'Recibidor', note: 'El living se abre en doble altura hacia el jardín', meta: 'Living 27,52 m² · frente de 3,95 m', pos: [7.05, 1.62, 10.15], look: [7.0, 1.55, 6.6] },
  { label: 'Muro de TV', note: 'Panel de piedra de 2,20 m y mueble flotante de 2,60 m', meta: 'Muro 3,80 m · TV 1,40 × 0,79 m · mueble 2,60 m', pos: [8.7, 1.6, 9.7], look: [3.7, 1.25, 8.85] },
  { label: 'Comedor', note: 'Mesa para seis junto a la cocina abierta', meta: 'Comedor 13,76 m² · mesa 1,80 × 0,90 m', pos: [8.55, 1.62, 5.75], look: [5.9, 1.0, 4.55] },
  { label: 'Cocina', note: 'Línea de muebles de 0,90 m y alacenas a 1,40 m', meta: 'Cocina 12,77 m² · alacenas 0,70 m a 1,40 m', pos: [6.7, 1.62, 3.4], look: [4.7, 1.15, 0.7] },
  { label: 'Isla de cocina', note: 'Encimera 0,90 m y barra de 1,05 m con tres taburetes', meta: 'Isla 2,40 × 1,00 m · barra 1,05 m · overhang 0,30', pos: [6.95, 1.55, 3.35], look: [5.3, 0.95, 2.3] },
  { label: 'Pasillo poniente', note: 'Distribución a los dormitorios y el baño', meta: 'Pasillo 2,39 m² · ancho 1,02 m', pos: [2.92, 1.62, 5.65], look: [2.92, 1.5, 3.75] },
  { label: 'Dormitorio 3', note: 'Cama de 1,60 m y escritorio de 1,20 m', meta: 'Dorm. 3 · 14,46 m² · cama 1,60 × 2,00 m', pos: [2.85, 1.62, 10.1], look: [1.1, 1.05, 6.8] },
  { label: 'Baño', note: 'Ducha de 0,90 m, vanitorio de 0,80 m y espejo retroiluminado', meta: 'Baño 1,95 × 2,34 m · ducha 0,90 · vanitorio 0,80', pos: [1.95, 1.55, 5.6], look: [0.7, 1.15, 4.2] },
  { label: 'Dormitorio 2', note: 'Cama de 1,60 m, clóset y escritorio', meta: 'Dorm. 2 · 10,01 m² · cama 1,60 × 2,00 m', pos: [2.9, 1.62, 3.25], look: [1.0, 1.05, 0.9] },
  { label: 'Dormitorio 1', note: '15,8 m² con clóset y salida a la ensuite', meta: 'Dorm. 1 · 15,84 m² · cama 1,80 × 2,00 m', pos: [13.95, 1.62, 3.25], look: [10.9, 1.05, 0.8] },
  { label: 'Ensuite', note: 'Ducha, vanitorio y espejo de 1,00 m a 1,40 m', meta: 'Ensuite 1,74 × 1,79 m · espejo 1,00 m', pos: [11.1, 1.55, 5.15], look: [9.8, 1.15, 3.85] },
  { label: 'Garaje', note: 'Un auto, 4,89 × 5,23 m y portón seccional de 3,60 m', meta: 'Garaje 25,57 m² · portón 3,60 × 2,35 m', pos: [13.9, 1.62, 10.4], look: [10.6, 1.1, 6.1] },
  { label: 'Jardín y fachada', note: 'Apliques, adoquín y vegetación mediterránea', meta: 'Adoquín 4,90 m · apliques de muro · césped', pos: [13.9, 1.7, 15.8], look: [8.4, 2.2, 11.2] },
  { label: 'Vista aérea', note: 'Cierre: casa, porche, garaje y jardín', meta: 'Casa + porche + garaje · 148 m²', pos: [7.3, 8.4, 21.2], look: [7.3, 1.4, 6.0] },
];

/** Selector de escena: salto directo con tween corto desde el HUD. */
export const SCENES: SceneView[] = [
  { id: 'living', label: 'Living', pos: [8.4, 1.62, 9.9], look: [3.7, 1.15, 9.0] },
  { id: 'tv', label: 'Muro TV', pos: [6.6, 1.55, 8.9], look: [3.5, 1.2, 8.85] },
  { id: 'comedor', label: 'Comedor', pos: [8.4, 1.62, 5.8], look: [5.9, 1.0, 4.6] },
  { id: 'cocina', label: 'Cocina', pos: [6.6, 1.62, 3.4], look: [4.5, 1.1, 0.7] },
  { id: 'isla', label: 'Isla', pos: [6.9, 1.55, 3.35], look: [5.3, 0.95, 2.3] },
  { id: 'dorm1', label: 'Dorm. 1', pos: [13.9, 1.62, 3.3], look: [10.9, 1.0, 0.8] },
  { id: 'dorm2', label: 'Dorm. 2', pos: [2.9, 1.62, 3.3], look: [1.0, 1.0, 0.8] },
  { id: 'dorm3', label: 'Dorm. 3', pos: [2.9, 1.62, 10.1], look: [1.0, 1.0, 6.7] },
  { id: 'bano', label: 'Baño', pos: [1.9, 1.55, 5.6], look: [0.6, 1.15, 4.0] },
  { id: 'ensuite', label: 'Ensuite', pos: [11.05, 1.55, 5.15], look: [9.8, 1.15, 3.8] },
  { id: 'garaje', label: 'Garaje', pos: [13.9, 1.62, 10.3], look: [10.6, 1.0, 6.2] },
  { id: 'fachada', label: 'Fachada', pos: [7.2, 1.7, 17.0], look: [7.2, 2.2, 11.2] },
];

/** Spots de patrulla para los personajes. */
export const NPC_SPOTS: { pos: [number, number, number]; door: [number, number] }[] = [
  { pos: [6.6, 0, 8.9], door: [7.0, 10.2] },
  { pos: [5.4, 0, 4.4], door: [3.9, 5.4] },
];

export type CctvCamera = {
  id: string;
  name: string;
  zone: string;
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
};

/** Circuito CCTV: 12 cámaras interiores/exteriores. */
export const CCTV_CAMERAS: CctvCamera[] = [
  { id: 'CAM-01', name: 'Living · muro de TV', zone: 'Living', pos: [9.1, 2.55, 10.4], look: [4.2, 1.2, 8.6], fov: 62 },
  { id: 'CAM-02', name: 'Cocina · isla', zone: 'Cocina', pos: [7.0, 2.55, 3.3], look: [4.2, 1.1, 1.0], fov: 60 },
  { id: 'CAM-03', name: 'Comedor', zone: 'Comedor', pos: [9.1, 2.55, 6.2], look: [5.0, 1.1, 4.6], fov: 60 },
  { id: 'CAM-04', name: 'Fachada · porche', zone: 'Exterior', pos: [2.2, 3.2, 16.5], look: [7.2, 1.8, 11.2], fov: 50 },
  { id: 'CAM-05', name: 'Dormitorio 1', zone: 'Dormitorio', pos: [13.9, 2.55, 0.9], look: [10.4, 1.0, 3.2], fov: 60 },
  { id: 'CAM-06', name: 'Baño', zone: 'Baño', pos: [2.0, 2.5, 5.7], look: [0.6, 1.0, 3.9], fov: 62 },
  { id: 'CAM-07', name: 'Ensuite', zone: 'Ensuite', pos: [11.05, 2.45, 5.2], look: [9.7, 1.0, 3.8], fov: 62 },
  { id: 'CAM-08', name: 'Dormitorio 2', zone: 'Dormitorio', pos: [3.0, 2.55, 0.9], look: [0.9, 1.0, 3.2], fov: 60 },
  { id: 'CAM-09', name: 'Dormitorio 3', zone: 'Dormitorio', pos: [3.0, 2.55, 10.4], look: [0.9, 1.0, 6.8], fov: 60 },
  { id: 'CAM-10', name: 'Garaje', zone: 'Garaje', pos: [13.9, 2.55, 10.4], look: [10.2, 0.9, 6.0], fov: 64 },
  { id: 'CAM-11', name: 'Jardín · acceso', zone: 'Exterior', pos: [11.0, 1.9, 18.6], look: [6.0, 2.0, 11.0], fov: 52 },
  { id: 'CAM-12', name: 'Pasillo poniente', zone: 'Pasillo', pos: [2.9, 2.5, 5.9], look: [2.9, 1.1, 3.6], fov: 58 },
];

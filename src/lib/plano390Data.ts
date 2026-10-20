/*
* plano390Data.ts — datos del plano "Proyecto №390-1" (127 m², 14,00 × 11,00 m).
* Origen en esquina NO de los muros exteriores. x → Este (0..14), z → Sur (0..11).
* z negativo = fuera hacia el norte (terraza). Muro 2,70 m de alto.
* Exteriores 0,25 m; tabiques 0,14 m. Contrato compartido por la escena,
* el recorrido y el HUD de /herramientas/proyecto-390-1.
*/

export type RoomBox = {
  id: string;
  name: string;
  areaM2: number;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  floor: 'wood' | 'tile' | 'porcelain' | 'terrace' | 'corridor';
};

export type WallSeg = {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  kind: 'ext' | 'int';
  /** tramo de vidrio (ventana o paño corredizo) */
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

/** Vista directa a una escena (selector inferior "Escenas"). */
export type SceneView = {
  id: string;
  label: string;
  pos: [number, number, number];
  look: [number, number, number];
};

export const PLAN = {
  widthM: 14,
  depthM: 11,
  wallH: 2.7,
  extT: 0.25,
  intT: 0.14,
  ridgeExtra: 2.35,
  terraceDepthM: 3.16,
  stepH: 0.2,
  /** sol al S a 50° → sombra = h / tan(50°) ≈ 0,84·h (diagrama del usuario) */
  sunElevationDeg: 50,
  sunSombraFactor: 0.84,
  eyeH: 1.65,
} as const;

/** Habitaciones del plano con nombres y superficies (lista 1..11 del proyecto). */
export const ROOMS: RoomBox[] = [
  { id: '1', name: 'Recibidor', areaM2: 7.17, x0: 3.62, z0: 6.85, x1: 6.34, z1: 10.75, floor: 'porcelain' },
  { id: '2', name: 'Vestidor', areaM2: 7.53, x0: 0.25, z0: 8.65, x1: 3.62, z1: 10.75, floor: 'wood' },
  { id: '3', name: 'Cocina · Comedor', areaM2: 44.21, x0: 0.25, z0: 0.25, x1: 8.4, z1: 5.55, floor: 'porcelain' },
  { id: '4', name: 'Pasillo', areaM2: 8.73, x0: 3.62, z0: 5.69, x1: 11.7, z1: 6.85, floor: 'porcelain' },
  { id: '5', name: 'Dormitorio 2', areaM2: 14.0, x0: 6.48, z0: 6.99, x1: 10.3, z1: 10.75, floor: 'wood' },
  { id: '6', name: 'Dormitorio 3', areaM2: 14.0, x0: 10.44, z0: 6.99, x1: 13.75, z1: 10.75, floor: 'wood' },
  { id: '7', name: 'Dormitorio principal', areaM2: 16.0, x0: 11.09, z0: 0.25, x1: 13.75, z1: 5.55, floor: 'wood' },
  { id: '8', name: 'Clóset', areaM2: 3.96, x0: 11.7, z0: 5.69, x1: 13.75, z1: 6.85, floor: 'porcelain' },
  { id: '9', name: 'Baño', areaM2: 5.32, x0: 8.54, z0: 0.25, x1: 10.95, z1: 2.42, floor: 'porcelain' },
  { id: '10', name: 'Sauna', areaM2: 5.6, x0: 8.54, z0: 2.56, x1: 10.95, z1: 4.86, floor: 'wood' },
  { id: '11', name: 'Terraza', areaM2: 21.45, x0: 0.25, z0: -2.91, x1: 6.4, z1: 0, floor: 'terrace' },
];

/**
 * Muros como cajas (x0,z0 → x1,z1). Los vanos quedan como saltos entre cajas.
 * window: el tramo se pinta como vidrio de piso a 2,1 m.
 */
export const WALLS: WallSeg[] = [
  // ── Exteriores ──────────────────────────────────────────────────
  { x0: 0, z0: 10.75, x1: 4.6, z1: 11, kind: 'ext' },   // S oeste
  { x0: 5.6, z0: 10.75, x1: 14, z1: 11, kind: 'ext' },  // S este (gap 4,6..5,6 = puerta principal)
  { x0: 0, z0: 0, x1: 0.25, z1: 11, kind: 'ext' },      // O
  { x0: 13.75, z0: 0, x1: 14, z1: 11, kind: 'ext' },    // E
  { x0: 6.4, z0: 0, x1: 11.9, z1: 0.25, kind: 'ext' },  // N centro sólido
  { x0: 13.3, z0: 0, x1: 14, z1: 0.25, kind: 'ext' },   // N este
  { x0: 0.25, z0: 0, x1: 6.4, z1: 0.25, kind: 'ext', window: true },  // paño corredizo living↔terraza
  { x0: 11.9, z0: 0, x1: 13.3, z1: 0.25, kind: 'ext', window: true }, // ventana dorm. principal (sofá bajo ella)
  // ── Tabiques ───────────────────────────────────────────────────
  { x0: 8.4, z0: 0.25, x1: 8.54, z1: 5.55, kind: 'int' },                      // living | baño+sauna
  { x0: 8.54, z0: 2.42, x1: 10.95, z1: 2.56, kind: 'int' },                    // baño | sauna
  { x0: 8.54, z0: 4.86, x1: 10.95, z1: 5.0, kind: 'int' },                     // sauna | pasillo
  { x0: 10.95, z0: 0.25, x1: 11.09, z1: 3.9, kind: 'int' },                    // dorm7 | baño (sin puerta)
  { x0: 10.95, z0: 5.0, x1: 11.09, z1: 5.55, kind: 'int' },                    // (gap 3,9..5,0 puerta dorm7)
  { x0: 10.95, z0: 5.55, x1: 11.7, z1: 5.69, kind: 'int' },                    // pasillo | clóset oeste
  { x0: 12.2, z0: 5.55, x1: 13.75, z1: 5.69, kind: 'int' },                    // este (gap 11,7..12,2 puerta clóset)
  { x0: 11.7, z0: 6.81, x1: 12.35, z1: 6.95, kind: 'int' },                    // clóset | dorm3 arriba
  { x0: 13.05, z0: 6.81, x1: 13.75, z1: 6.95, kind: 'int' },
  { x0: 3.62, z0: 5.55, x1: 6.5, z1: 5.69, kind: 'int' },                      // living | pasillo oeste
  { x0: 7.5, z0: 5.55, x1: 8.4, z1: 5.69, kind: 'int' },                       // este (gap 6,5..7,5 paso living)
  { x0: 6.34, z0: 6.85, x1: 7.35, z1: 6.99, kind: 'int' },                     // pasillo | dorm2 oeste
  { x0: 8.45, z0: 6.85, x1: 10.3, z1: 6.99, kind: 'int' },                     // este (gaps: puerta dorm2 7,35..8,45)
  { x0: 10.44, z0: 6.85, x1: 11.7, z1: 6.99, kind: 'int' },                    // pasillo | dorm3 oeste (gap 10,3..10,44 puerta dorm3)
  { x0: 6.34, z0: 6.99, x1: 6.48, z1: 9.3, kind: 'int' },                      // recibidor | dorm2
  { x0: 6.34, z0: 10.2, x1: 6.48, z1: 10.75, kind: 'int' },
  { x0: 10.44, z0: 6.99, x1: 10.58, z1: 9.6, kind: 'int' },                    // dorm2 | dorm3
  { x0: 10.44, z0: 10.5, x1: 10.58, z1: 10.75, kind: 'int' },                  // (gap 9,6..10,5)
  { x0: 3.62, z0: 8.65, x1: 3.76, z1: 9.5, kind: 'int' },                      // recibidor | vestidor
  { x0: 3.62, z0: 10.3, x1: 3.76, z1: 10.75, kind: 'int' },                    // (gap 9,5..10,3)
  { x0: 0.25, z0: 8.65, x1: 3.62, z1: 8.79, kind: 'int' },                     // vestidor | recibidor-oeste abierto
];

/**
 * Puntos de foto con cuña/dirección (como los diagramas del usuario):
 * cada spot tiene posición, blanco de mirada y color (naranja/azul).
 */
export const PHOTO_SPOTS: PhotoSpot[] = [
  { id: '41', label: 'Foto 41 · sala desde el SO', pos: [1.5, 1.5, 4.2], look: [4.2, 1.05, 1.6], color: '#C56A3A' },
  { id: '44', label: 'Foto 44 · sala desde el SE', pos: [6.9, 1.5, 4.2], look: [4.2, 1.05, 1.6], color: '#2E6FA0' },
  { id: '50', label: 'Foto 50 · recibidor', pos: [5.0, 1.5, 10.4], look: [5.0, 1.3, 7.6], color: '#2E6FA0' },
  { id: '58', label: 'Foto 58 · dormitorio bajo la ventana', pos: [12.4, 1.5, 4.9], look: [12.4, 1.05, 1.2], color: '#C56A3A' },
];

/** Recorrido guiado (walkthrough): cámara en primera persona suavizada por parada. */
export const TOUR_STOPS: TourStop[] = [
  { label: 'Fachada sur', note: 'Presentación de la casa y su acceso principal', meta: 'Casa 390-1 · 127 m² · 3 dormitorios · 1 baño · sauna', pos: [7, 1.72, 18.4], look: [7, 2.2, 11.2] },
  { label: 'Acceso principal', note: 'Umbral del recibidor, 7,17 m²', meta: 'Recibidor 7,17 m² · circulación principal', pos: [5.1, 1.68, 13.1], look: [5.1, 1.5, 10.8] },
  { label: 'Recibidor', note: 'Circulación que reparte la casa', meta: 'Recibidor 7,17 m² · vestidor 7,53 m²', pos: [4.95, 1.65, 9.5], look: [5.6, 1.4, 7.2] },
  { label: 'Sala de estar', note: '44,2 m² de cocina-comedor con paño corredizo a la terraza', meta: 'Cocina · Comedor 44,21 m² · paño corredizo norte', pos: [7.6, 1.65, 4.4], look: [3.2, 1.15, 1.5] },
  { label: 'Cocina', note: 'L de 4,50 × 3,50 m con isla de 1,80 × 0,90 m', meta: 'Cocina en L 4,50 × 3,50 m · muebles 0,90 m', pos: [4.6, 1.62, 3.2], look: [0.8, 1.0, 2.7] },
  { label: 'Detalle de cocina', note: 'Alacenas con LED, campana y torre de hornos', meta: 'Alacenas 0,90 m desde 1,50 m · campana + ducto', pos: [3.6, 1.42, 4.9], look: [0.6, 1.25, 2.4] },
  { label: 'Isla de cocina', note: 'Encimera de 0,95 m y tres taburetes', meta: 'Isla 1,80 × 0,90 m · alto 0,95 m · 3 taburetes', pos: [3.95, 1.55, 4.55], look: [2.9, 0.9, 2.8] },
  { label: 'Terraza', note: '21,5 m² al norte con pérgola y paso de 20 cm', meta: 'Terraza 21,50 m² · pérgola de listones', pos: [3.2, 1.65, -1.8], look: [3.6, 1.3, 2.1] },
  { label: 'Pasillo', note: 'Luz fría continua hacia los dormitorios', meta: 'Pasillo 8,73 m² · luz fría continua', pos: [10.7, 1.65, 6.3], look: [4.6, 1.35, 6.25] },
  { label: 'Dormitorio 3', note: '14 m² al sur oriente', meta: 'Dormitorio 3 · 14,00 m² · cama 1,80 × 2,00 m', pos: [12.1, 1.65, 9.9], look: [12.1, 1.05, 7.3] },
  { label: 'Dormitorio 2', note: '14 m² al sur poniente', meta: 'Dormitorio 2 · 14,00 m²', pos: [8.3, 1.65, 9.9], look: [8.3, 1.05, 7.3] },
  { label: 'Baño y sauna', note: 'Sanitarios y sauna de 5,6 m²', meta: 'Baño 5,32 m² · sauna 5,60 m²', pos: [9.55, 1.63, 2.25], look: [9.15, 1.05, 0.75] },
  { label: 'Dormitorio principal', note: '16 m² con ventana norte y sofá', meta: 'Dormitorio principal · 16,00 m² · ventana norte', pos: [12.6, 1.65, 4.6], look: [12.4, 1.05, 1.0] },
  { label: 'Quincho', note: '6,00 × 3,20 m con parrilla, horno y barra de 3,60 m', meta: 'Quincho 6,00 × 3,20 m · 19,2 m² · cubierta 2,70 m', pos: [15.9, 1.62, 7.9], look: [18.6, 1.35, 3.4] },
  { label: 'Parrilla del quincho', note: 'Parrilla, campana y horno de barro sobre piedra', meta: 'Mesón 5,60 m · parrilla + horno de barro', pos: [17.0, 1.55, 3.15], look: [19.7, 1.15, 2.25] },
  { label: 'Barra del quincho', note: 'Barra de 1,05 m y cinco taburetes, 5,40 m de espacio libre', meta: 'Barra 3,60 × 1,00 × 1,05 m · 5 taburetes', pos: [17.4, 1.55, 6.6], look: [18.3, 1.05, 2.5] },
  { label: 'Vista aérea', note: 'Cierre del recorrido: casa, terraza y quincho', meta: 'Casa + terraza + quincho · 127 m² construidos', pos: [7.5, 7.8, 20.5], look: [9.0, 1.5, 6.5] },
];

/** Selector de escena: salto directo con tween corto desde el HUD. */
export const SCENES: SceneView[] = [
  { id: 'sala', label: 'Sala', pos: [7.4, 1.65, 4.6], look: [2.6, 1.05, 1.8] },
  { id: 'cocina', label: 'Cocina', pos: [4.7, 1.62, 3.5], look: [0.7, 1.0, 2.8] },
  { id: 'isla', label: 'Isla', pos: [4.4, 1.55, 4.5], look: [3.0, 0.95, 2.9] },
  { id: 'terraza', label: 'Terraza', pos: [3.2, 1.65, -1.9], look: [3.8, 1.25, 2.0] },
  { id: 'pasillo', label: 'Pasillo', pos: [10.7, 1.65, 6.3], look: [4.4, 1.35, 6.25] },
  { id: 'dorm3', label: 'Dorm. 3', pos: [12.1, 1.65, 9.9], look: [12.1, 1.0, 7.2] },
  { id: 'dorm2', label: 'Dorm. 2', pos: [8.3, 1.65, 9.9], look: [8.3, 1.0, 7.2] },
  { id: 'principal', label: 'Principal', pos: [12.6, 1.65, 4.7], look: [12.4, 1.0, 1.0] },
  { id: 'bano', label: 'Baño', pos: [9.4, 1.65, 2.05], look: [9.2, 1.05, 0.6] },
  { id: 'quincho', label: 'Quincho', pos: [15.6, 1.6, 7.4], look: [18.6, 1.2, 2.9] },
  { id: 'exterior', label: 'Exterior', pos: [7, 1.7, 17.5], look: [7, 2.0, 11] },
];

/**
 * Quincho exterior (cubierto) — medidas de la referencia del cliente:
 * 6,00 m de largo × 3,20 m de fondo × 2,70 m de alto de cubierta,
 * barra de 3,60 × 1,00 × 1,05 m y 5,40 m de espacio útil al frente.
 */
export const QUINCHO = {
  x0: 14.9,
  x1: 20.9,
  z0: 1.9,
  z1: 5.1,
  height: 2.7,
  bar: { x0: 15.6, x1: 19.2, z0: 3.95, z1: 4.95, h: 1.05 },
  stools: 5,
  frontSpaceM: 5.4,
} as const;

/** Spots de patrulla para los personajes (AnimatedFigure del simulador sísmico). */
export const NPC_SPOTS: { pos: [number, number, number]; door: [number, number] }[] = [
  { pos: [3.0, 0, 7.6], door: [3.0, 6.4] },   // recibidor/pasillo
  { pos: [6.3, 0, 3.4], door: [6.0, 0.8] },   // living
];

/**
 * Circuito de cámaras CCTV (modo Cine). Cada cámara tiene su montaje real en la
 * escena (Plano3903D dibuja carcasa + lente + LED) y su encuadre para el rig.
 */
export type CctvCamera = {
  id: string;
  name: string;
  zone: string;
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
};

export const CCTV_CAMERAS: CctvCamera[] = [
  { id: 'CAM-01', name: 'Sala · cocina-comedor', zone: 'Sala', pos: [7.85, 2.4, 0.62], look: [2.2, 0.9, 3.9], fov: 63 },
  { id: 'CAM-02', name: 'Pasillo · distribución', zone: 'Pasillo', pos: [10.95, 2.36, 6.08], look: [4.3, 1.15, 6.35], fov: 58 },
  { id: 'CAM-03', name: 'Terraza · pérgola', zone: 'Terraza', pos: [5.85, 2.32, -2.5], look: [1.6, 1.0, 0.6], fov: 66 },
  { id: 'CAM-04', name: 'Fachada · acceso principal', zone: 'Exterior', pos: [1.3, 3.05, 15.1], look: [7.0, 1.7, 10.6], fov: 52 },
  { id: 'CAM-05', name: 'Dormitorio principal', zone: 'Dormitorio', pos: [13.3, 2.38, 0.9], look: [11.9, 1.05, 4.7], fov: 60 },
  { id: 'CAM-06', name: 'Quincho · barra y parrilla', zone: 'Quincho', pos: [20.4, 2.42, 2.15], look: [16.5, 1.15, 4.35], fov: 64 },
  { id: 'CAM-07', name: 'Cocina · isla y alacenas', zone: 'Cocina', pos: [7.9, 2.42, 2.4], look: [1.4, 0.95, 3.5], fov: 60 },
  { id: 'CAM-08', name: 'Terraza · deck exterior', zone: 'Terraza', pos: [6.4, 2.2, -3.2], look: [2.0, 1.0, 0.4], fov: 64 },
  { id: 'CAM-09', name: 'Baño', zone: 'Baño', pos: [10.6, 2.35, 2.15], look: [8.8, 0.95, 0.6], fov: 62 },
  { id: 'CAM-10', name: 'Sauna', zone: 'Sauna', pos: [10.7, 2.25, 4.55], look: [8.8, 1.0, 3.1], fov: 60 },
  { id: 'CAM-11', name: 'Quincho · parrilla', zone: 'Quincho', pos: [15.35, 2.15, 3.0], look: [19.8, 1.15, 2.4], fov: 55 },
  { id: 'CAM-12', name: 'Jardín · fachada', zone: 'Exterior', pos: [9.5, 1.9, 19.0], look: [6.6, 2.1, 11.0], fov: 50 },
  { id: 'CAM-13', name: 'Dormitorio 2', zone: 'Dormitorio', pos: [10.15, 2.35, 7.35], look: [7.2, 1.0, 10.3], fov: 58 },
];


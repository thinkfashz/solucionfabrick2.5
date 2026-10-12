/**
 * Ficha técnica de Metalcon® para la guía pública.
 *
 * Regla de contenido: aquí solo entra información publicada por el fabricante o por norma.
 * No se publican capacidades de carga, luces ni números de diseño inventados: la resistencia
 * de un muro Metalcon depende del perfil, espesor, modulación, altura, revestimiento y
 * arriostramiento, y se obtiene de las tablas del manual de diseño más la memoria de cálculo
 * del proyecto. Este módulo existe para explicar el sistema, no para dimensionarlo.
 */

import { METALCON_C_PROFILE_TABLE } from './metalconCalculator';

export type MetalconSource = { label: string; href: string; note: string };

export const METALCON_SOURCES: MetalconSource[] = [
  {
    label: 'Cintac · Perfiles y Accesorios Metalcon®',
    href: 'https://www.cintac.cl/perfiles-y-accesorios-metalcon/',
    note: 'Define las tres familias del sistema (Estructural, Tabiquería y Cielos) con sus espesores, y publica el material técnico oficial.',
  },
  {
    label: 'Cintac · ¿Cuáles son las características del Metalcon®?',
    href: 'https://www.cintac.cl/las-caracteristicas-del-metalcon/',
    note: 'Origen de las propiedades declaradas: no combustible, sismo-resistente, sin mantención, reciclable y viviendas de hasta tres niveles.',
  },
  {
    label: 'Cintac · Manual de Construcción Perfiles y Estructuras',
    href: 'https://www.cintac.cl/wp-content/uploads/2026/08/Metalcon/manual%20construccion%20metalcon%202026%20web.pdf',
    note: 'Secuencia de montaje, soleras, montantes a 40/60 cm, vanos, alturas y perfiles para tabiques.',
  },
  {
    label: 'Cintac · Manual de Diseño Metalcon',
    href: 'https://www.cintac.cl/wp-content/uploads/2023/08/Manual-de-Diseno-Metalcon.pdf',
    note: 'Criterios de diseño y tablas de capacidad. Es la fuente para dimensionar; esta guía no las reemplaza.',
  },
  {
    label: 'Cintac · Metalcon Cielos',
    href: 'https://www.cintac.cl/wp-content/uploads/2026/08/Metalcon/metalcon%20cielos%202026%20web.pdf',
    note: 'Sistema de cielos: estructura liviana bajo techumbre o entrepiso que recibe el revestimiento de cielo.',
  },
];

/** Las tres familias que el fabricante publica para el sistema. */
export const METALCON_FAMILIES = [
  {
    id: 'estructural',
    name: 'Estructural',
    thickness: '0,85 · 1,00 · 1,60 mm',
    purpose: 'Muros estructurales que dan soporte a la vivienda.',
    usedIn: 'Vivienda de 1 a 3 niveles y estructuras que reciben carga.',
    detail: 'Es la familia que aparece en las tablas de cálculo. Su espesor y separación se definen por memoria estructural, no por catálogo.',
  },
  {
    id: 'tabiqueria',
    name: 'Tabiquería',
    thickness: '0,50 mm',
    purpose: 'Divisiones interiores no estructurales, además de aislación térmica y acústica entre recintos.',
    usedIn: 'Interiores de vivienda, oficina y local.',
    detail: 'Perfil liviano. No debe interpretarse como muro soportante aunque se le agregue revestimiento.',
  },
  {
    id: 'cielos',
    name: 'Cielos',
    thickness: '0,50 mm',
    purpose: 'Estructura liviana bajo la techumbre o entrepiso, que recibe el revestimiento de cielo.',
    usedIn: 'Cielos y entrepisos livianos.',
    detail: 'Se calcula como sistema propio: separación de maestras, colgadores y encuentros son parte de la solución.',
  },
  {
    id: 'accesorios',
    name: 'Accesorios',
    thickness: 'Según fijación',
    purpose: 'Tornillos autoperforantes galvanizados y fijaciones del sistema.',
    usedIn: 'Todas las uniones.',
    detail: 'El fabricante remite a la norma AISI, Specification for the Design of Cold Formed Steel Structural Members, para las fijaciones.',
  },
] as const;

/** Perfiles C: dimensiones, peso publicado y largos comerciales. Fuente: Manual de Diseño Metalcon, Cintac. */
export const METALCON_PROFILES = METALCON_C_PROFILE_TABLE.map((profile) => ({
  label: profile.label,
  kgPerM: profile.kgPerM as number,
  lengths: profile.commonLengthsM,
}));

/** Solera U que el sistema declara compatible con cada altura de perfil C. */
export const METALCON_TRACKS = [
  { forProfile: 'C 60', track: 'U 61', family: 'Tabiquería' },
  { forProfile: 'C 90', track: 'U 92', family: 'Estructural' },
  { forProfile: 'C 100', track: 'U 103', family: 'Estructural' },
  { forProfile: 'C 150', track: 'U 153', family: 'Estructural' },
] as const;

/** Aplicaciones por escala. El límite de cada fila importa tanto como la aplicación. */
export const METALCON_APPLICATIONS = [
  {
    id: 'tabique',
    scope: 'Tabique interior',
    profile: 'C 60 / U 61',
    thickness: '0,50 mm',
    lengths: '2,40 – 3,00 m',
    condition: 'No portante',
    note: 'Separa recintos y aporta aislación. No sostiene la estructura.',
  },
  {
    id: 'vivienda1',
    scope: 'Vivienda 1 piso',
    profile: 'C 90 × 38 × 12 / U 92',
    thickness: '0,85 mm referencial',
    lengths: '3,00 – 6,00 m',
    condition: 'Según cálculo',
    note: 'Muro estructural: perfil, modulación y anclajes salen de la memoria de cálculo.',
  },
  {
    id: 'vivienda2',
    scope: 'Vivienda 2 a 3 pisos',
    profile: 'C 90 – 150 / U compatible',
    thickness: '0,85 – 1,60 mm',
    lengths: '4,00 – 7,10 m',
    condition: 'Ingeniería obligatoria',
    note: 'El fabricante declara viviendas de hasta tres niveles. Ese límite exige proyecto estructural, no una receta de catálogo.',
  },
  {
    id: 'comercio',
    scope: 'Comercio y ampliación liviana',
    profile: 'C 90 – 150 sobre tabiquería y cielos',
    thickness: '0,85 – 1,60 mm',
    lengths: 'Según proyecto',
    condition: 'Revisión profesional',
    note: 'Local comercial de baja altura y ampliaciones resueltas con sistema liviano. Luces grandes y cargas de uso intenso se salen del sistema.',
  },
  {
    id: 'industrial',
    scope: 'Industrial / nave',
    profile: 'Fuera del alcance de Metalcon',
    thickness: '—',
    lengths: '—',
    condition: 'Acero laminado estructural',
    note: 'Una nave industrial no se resuelve con perfiles livianos. Requiere estructura de acero laminado (perfiles y tubulares) con cálculo propio.',
  },
] as const;

/** Propiedades declaradas por el fabricante. Se citan como referencia, no como garantía. */
export const METALCON_PROPERTIES = [
  { title: 'No combustible', text: 'El acero no aporta material combustible al incendio y resiste altas temperaturas por un tiempo razonable.' },
  { title: 'No absorbe humedad', text: 'No le afectan hongos, moho ni termitas. El acero galvanizado no absorbe agua.' },
  { title: 'Sismo-resistente', text: 'Es dúctil: ante un sismo se deforma en vez de quebrarse y gana tiempo para evacuar.' },
  { title: 'Liviano', text: 'Se manipula sin maquinaria pesada y las piezas se atornillan entre sí.' },
  { title: 'Sin mantención', text: 'El fabricante declara que no requiere mantención en el tiempo.' },
  { title: 'Reciclable', text: 'El acero es uno de los materiales con mayor porcentaje de reciclaje.' },
] as const;

/**
 * Modulación de montantes. Es la variable que más cambia el comportamiento del panel:
 * a 40 cm la placa trabaja sobre más apoyos, a 60 cm se usan menos perfiles.
 */
export const METALCON_SPACING = [
  { value: '40 cm', use: 'Modulación reforzada', detail: 'Más montantes por metro. Es la separación que se muestra por defecto en el visor.' },
  { value: '60 cm', use: 'Modulación estándar', detail: 'Menos perfiles por metro; el revestimiento y el cálculo definen si es admisible.' },
] as const;

/**
 * Orden real de armado del muro. Coincide con las etapas del laboratorio 4D:
 * la estructura se cierra de afuera hacia adentro y termina en el revestimiento exterior.
 */
export const METALCON_WALL_LAYERS = [
  { id: 'structure', label: 'Estructura', layer: 'Soleras U + montantes C', text: 'Solera inferior y superior ancladas, montantes a 40 o 60 cm. Refuerzos en vanos.' },
  { id: 'osb', label: 'OSB estructural', layer: 'Tablero exterior', text: 'Plancha de OSB atornillada a los montantes. Es lo que rigidiza el panel.' },
  { id: 'membrane', label: 'Barrera hidrófuga', layer: 'Cortaviento', text: 'Membrana que impide el paso de agua y viento, con traslapos.' },
  { id: 'battens', label: 'Listones', layer: 'Cámara ventilada', text: 'Subestructura vertical que separa el siding del muro y deja drenar.' },
  { id: 'insulation', label: 'Lana aislante', layer: 'Aislación en la cámara', text: 'Aislación entre montantes. Su espesor viene de la solución térmica, no de esta guía.' },
  { id: 'gypsum', label: 'Vulcanita', layer: 'Revestimiento interior', text: 'Placa de yeso cartón al interior, sobre la estructura.' },
  { id: 'siding', label: 'Siding exterior', layer: 'Revestimiento final', text: 'Última capa: es la cara visible y la que recibe la lluvia.' },
] as const;

export type MetalconWallLayerId = (typeof METALCON_WALL_LAYERS)[number]['id'];

export const METALCON_CAPACITY_NOTE = {
  title: 'Cuánto soporta: por qué no hay un solo número',
  body: 'La capacidad de un muro Metalcon no depende del perfil aislado, sino de la combinación de perfil, espesor, modulación, altura libre, revestimiento que rigidiza, arriostramiento y tipo de fijación. Por eso el fabricante publica tablas de diseño y no una cifra única por perfil.',
  bullets: [
    'El mismo C 90 cambia su capacidad según esté a 40 o a 60 cm y según la altura del muro.',
    'El OSB atornillado aporta rigidización; sin él el panel se comporta distinto.',
    'Vanos, dinteles, anclajes y fundaciones se dimensionan aparte.',
    'La cifra que vale para tu obra sale de la memoria de cálculo y de la revisión profesional del proyecto.',
  ],
  link: { label: 'Ver tablas en el Manual de Diseño de Cintac', href: 'https://www.cintac.cl/wp-content/uploads/2023/08/Manual-de-Diseno-Metalcon.pdf' },
} as const;

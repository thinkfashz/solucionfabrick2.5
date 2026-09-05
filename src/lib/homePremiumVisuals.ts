const CLOUDINARY_BASE = 'https://res.cloudinary.com/disghf6xc/image/upload';

type PremiumVisualKey =
  | 'metalcon'
  | 'bedroom'
  | 'kitchen'
  | 'bathroom'
  | 'terrace'
  | 'planning'
  | 'living'
  | 'house'
  | 'architecture'
  | 'foundation';

type PremiumVisualSource = {
  publicId: string;
  version: number;
  alt: string;
  format: 'png';
};

const SOURCES: Record<PremiumVisualKey, PremiumVisualSource> = {
  metalcon: {
    publicId: 'fabrick/inspiraciones/soluciones-constructivas-fabrick/lipcqzj8cduni5qq4p4z',
    version: 1788576758,
    alt: 'Estructura metálica de referencia para soluciones Steel Frame y Metalcon',
    format: 'png',
  },
  bedroom: {
    publicId: 'fabrick/inspiraciones/soluciones-constructivas-fabrick/vfs3gu7bys4w6uzwxczp',
    version: 1788576776,
    alt: 'Ampliación modular de vivienda con estructura liviana',
    format: 'png',
  },
  kitchen: {
    publicId: 'fabrick/inspiraciones/soluciones-constructivas-fabrick/omvwj3xo1fbfdggdb6gh',
    version: 1788576760,
    alt: 'Remodelación integral de cocina',
    format: 'png',
  },
  bathroom: {
    publicId: 'fabrick/inspiraciones/soluciones-constructivas-fabrick/hnsturtgbn59vcbulebd',
    version: 1788576764,
    alt: 'Instalación sanitaria y fosa séptica para vivienda',
    format: 'png',
  },
  terrace: {
    publicId: 'fabrick/inspiraciones/soluciones-constructivas-fabrick/ahjepmbwdfn1ssm5eqff',
    version: 1788576773,
    alt: 'Instalación de techumbre metálica',
    format: 'png',
  },
  planning: {
    publicId: 'fabrick/inspiraciones/soluciones-constructivas-fabrick/jrywfzyxfj67xi1dahlo',
    version: 1788576791,
    alt: 'Herramientas de construcción organizadas para ejecución de obra',
    format: 'png',
  },
  living: {
    publicId: 'fabrick/inspiraciones/soluciones-constructivas-fabrick/zyhy19suipjwe6uig46o',
    version: 1788576770,
    alt: 'Aislación térmica instalada en estructura de vivienda',
    format: 'png',
  },
  house: {
    publicId: 'fabrick/inspiraciones/soluciones-constructivas-fabrick/do0t4rhd9msr6fztfekk',
    version: 1788576754,
    alt: 'Casa terminada con diseño contemporáneo',
    format: 'png',
  },
  architecture: {
    publicId: 'fabrick/inspiraciones/soluciones-constructivas-fabrick/rjxdub89a9yn2yumhikl',
    version: 1788576785,
    alt: 'Perfiles Metalcon para estructura de vivienda',
    format: 'png',
  },
  foundation: {
    publicId: 'fabrick/inspiraciones/soluciones-constructivas-fabrick/vjdsqq3fxqinofacq1qc',
    version: 1788576767,
    alt: 'Instalación eléctrica durante la construcción de una vivienda',
    format: 'png',
  },
};

function cloudinaryHomeVisual(source: PremiumVisualSource, width = 1600, height = 1000) {
  return `${CLOUDINARY_BASE}/c_fill,g_auto,h_${height},w_${width}/f_auto,q_auto/v${source.version}/${source.publicId}.${source.format}`;
}

export const HOME_PREMIUM_VISUALS = {
  hero: cloudinaryHomeVisual(SOURCES.house, 1200, 1500),
  metalcon: cloudinaryHomeVisual(SOURCES.metalcon, 1200, 1500),
  construction: cloudinaryHomeVisual(SOURCES.architecture, 1100, 1350),
  remodel: cloudinaryHomeVisual(SOURCES.kitchen, 1100, 1350),
  finishes: cloudinaryHomeVisual(SOURCES.living, 1100, 1350),
  bedroom: cloudinaryHomeVisual(SOURCES.bedroom),
  kitchen: cloudinaryHomeVisual(SOURCES.kitchen),
  bathroom: cloudinaryHomeVisual(SOURCES.bathroom),
  terrace: cloudinaryHomeVisual(SOURCES.terrace),
  planning: cloudinaryHomeVisual(SOURCES.planning),
  living: cloudinaryHomeVisual(SOURCES.living),
  house: cloudinaryHomeVisual(SOURCES.house),
  architecture: cloudinaryHomeVisual(SOURCES.architecture),
  foundation: cloudinaryHomeVisual(SOURCES.foundation),
} as const;

export const HOME_PREMIUM_GALLERY = (Object.keys(SOURCES) as PremiumVisualKey[]).map((key) => ({
  key,
  src: cloudinaryHomeVisual(SOURCES[key]),
  alt: SOURCES[key].alt,
  publicId: SOURCES[key].publicId,
}));

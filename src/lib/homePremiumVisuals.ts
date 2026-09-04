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
};

const SOURCES: Record<PremiumVisualKey, PremiumVisualSource> = {
  metalcon: {
    publicId: 'home-metalcon-estructura',
    version: 1788557201,
    alt: 'Estructura metálica de referencia para soluciones Steel Frame y Metalcon',
  },
  bedroom: {
    publicId: 'home-habitacion-premium',
    version: 1788557214,
    alt: 'Dormitorio contemporáneo con madera y luz natural',
  },
  kitchen: {
    publicId: 'home-cocina-premium',
    version: 1788557223,
    alt: 'Cocina contemporánea con mobiliario oscuro y madera',
  },
  bathroom: {
    publicId: 'home-bano-premium',
    version: 1788557233,
    alt: 'Baño contemporáneo con revestimientos de piedra',
  },
  terrace: {
    publicId: 'home-terraza-premium',
    version: 1788557248,
    alt: 'Terraza exterior con pérgola y mobiliario contemporáneo',
  },
  planning: {
    publicId: 'home-planificacion-proyecto',
    version: 1788557260,
    alt: 'Planificación de proyecto y revisión de planos de construcción',
  },
  living: {
    publicId: 'home-living-premium',
    version: 1788557270,
    alt: 'Living contemporáneo de tonos cálidos y composición minimalista',
  },
  house: {
    publicId: 'home-casa-piscina-premium',
    version: 1788557281,
    alt: 'Vivienda contemporánea con terraza y piscina',
  },
  architecture: {
    publicId: 'home-arquitectura-premium',
    version: 1788557295,
    alt: 'Arquitectura residencial contemporánea de líneas limpias',
  },
  foundation: {
    publicId: 'home-radier-fundacion',
    version: 1788557304,
    alt: 'Preparación de radier y fundación con refuerzo estructural',
  },
};

function cloudinaryHomeVisual(source: PremiumVisualSource, width = 1600, height = 1000) {
  return `${CLOUDINARY_BASE}/c_fill,g_auto,h_${height},w_${width}/f_auto,q_auto/v${source.version}/${source.publicId}.jpg`;
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

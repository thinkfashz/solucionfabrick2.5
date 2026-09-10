type VisualProduct = {
  name?: string | null;
  image_url?: string | null;
  img?: string | null;
  category?: string | null;
  category_name?: string | null;
  specifications?: Record<string, unknown> | null;
};

const CLOUD = 'https://res.cloudinary.com/disghf6xc/image/upload';

export const STORE_VISUALS = {
  hero: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=82&w=2200&auto=format&fit=crop',
  airCalculatorPng: `${CLOUD}/c_limit,w_1200/f_png/q_auto:best/v1788843315/air-split-premium-v10.png`,
  air9k: `${CLOUD}/c_limit,w_900/f_png/q_auto:best/v1788677205/air-9k-v7.png`,
  air12k: `${CLOUD}/c_limit,w_900/f_png/q_auto:best/v1788677189/air-12k-v7.png`,
  air18k: `${CLOUD}/c_limit,w_900/f_png/q_auto:best/v1788674152/air-18k-v7.png`,
  air24k: `${CLOUD}/c_limit,w_900/f_png/q_auto:best/v1788674161/air-24k-v7.png`,
  cement: `${CLOUD}/c_limit,w_900/f_auto/q_auto/v1788843289/cemento-melon-25kg-v10.jpg`,
  mesh: `${CLOUD}/c_limit,w_900/f_auto/q_auto/v1788934498/malla-acma.png`,
  gravel: `${CLOUD}/c_limit,w_900/f_auto/q_auto/v1788934539/gravilla.png`,
  base: `${CLOUD}/c_limit,w_900/f_auto/q_auto/v1788934560/base-compactada.png`,
  barrier: `${CLOUD}/c_limit,w_900/f_auto/q_auto/v1788934517/barrera-humedad.png`,
  timber: `${CLOUD}/c_limit,w_900/f_auto/q_auto/v1788934828/moldaje-madera.png`,
  additive: 'https://images.unsplash.com/photo-1531835551805-16d864c8d311?q=80&w=1000&auto=format&fit=crop',
  trowel: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=1000&auto=format&fit=crop',
  laser: 'https://images.unsplash.com/photo-1586864387789-628af9feed72?q=80&w=1000&auto=format&fit=crop',
  installationKit: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?q=80&w=1000&auto=format&fit=crop',
  airSupport: 'https://images.unsplash.com/photo-1631545806609-954c37f4c1f9?q=80&w=1000&auto=format&fit=crop',
  electricalCable: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1000&auto=format&fit=crop',
  floodlight: 'https://images.unsplash.com/photo-1565814329452-e1efa11c5e8a?q=80&w=1000&auto=format&fit=crop',
  pendant: 'https://images.unsplash.com/photo-1540932239986-30128078f3c5?q=80&w=1000&auto=format&fit=crop',
  ceilingLight: 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?q=80&w=1000&auto=format&fit=crop',
  construction: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1000&auto=format&fit=crop',
} as const;

const TCL_REAL_PRODUCT_VISUALS: Array<[RegExp, string]> = [
  [/TCL\s+BreezeIN\s+18000\s+BTU/i, `${CLOUD}/c_limit,w_1000/f_auto/q_auto:best/v1789069389/soluciones-fabrick/productos/aire-tcl/tcl-breezein-18000-btu-wifi.jpg`],
  [/TCL\s+FreshIN\s+3(?:\.0)?\s+12000\s+BTU/i, `${CLOUD}/c_limit,w_1000/f_auto/q_auto:best/v1789069401/soluciones-fabrick/productos/aire-tcl/tcl-freshin-3-12000-btu-wifi.jpg`],
  [/TCL\s+BreezeIN\s+24000\s+BTU/i, `${CLOUD}/c_limit,w_1000/f_auto/q_auto:best/v1789069413/soluciones-fabrick/productos/aire-tcl/tcl-breezein-24000-btu-wifi.jpg`],
  [/TCL\s+SaveIN\s+12000\s+BTU/i, `${CLOUD}/c_limit,w_1000/f_auto/q_auto:best/v1789069424/soluciones-fabrick/productos/aire-tcl/tcl-savein-12000-btu-wifi.jpg`],
  [/TCL\s+SaveIN\s+18000\s+BTU/i, `${CLOUD}/c_limit,w_1000/f_auto/q_auto:best/v1789069435/soluciones-fabrick/productos/aire-tcl/tcl-savein-18000-btu-wifi.jpg`],
];

const NAME_VISUALS: Array<[RegExp, string]> = [
  [/cemento especial/i, STORE_VISUALS.cement],
  [/malla acma/i, STORE_VISUALS.mesh],
  [/gravilla/i, STORE_VISUALS.gravel],
  [/base estabilizada/i, STORE_VISUALS.base],
  [/barrera de humedad/i, STORE_VISUALS.barrier],
  [/(tabla pino|estacas de madera)/i, STORE_VISUALS.timber],
  [/aditivo impermeabilizante/i, STORE_VISUALS.additive],
  [/llana met[aá]lica/i, STORE_VISUALS.trowel],
  [/nivel l[aá]ser/i, STORE_VISUALS.laser],
  [/9\.?000\s*btu|9k/i, STORE_VISUALS.air9k],
  [/12\.?000\s*btu|12k/i, STORE_VISUALS.air12k],
  [/18\.?000\s*btu|18k/i, STORE_VISUALS.air18k],
  [/24\.?000\s*btu|24k/i, STORE_VISUALS.air24k],
  [/kit de instalaci[oó]n split/i, STORE_VISUALS.installationKit],
  [/soporte mural.*unidad exterior/i, STORE_VISUALS.airSupport],
  [/cable el[eé]ctrico thhn/i, STORE_VISUALS.electricalCable],
  [/foco led exterior/i, STORE_VISUALS.floodlight],
  [/l[aá]mpara colgante/i, STORE_VISUALS.pendant],
  [/plaf[oó]n led/i, STORE_VISUALS.ceilingLight],
];

function cleanUrl(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function galleryImage(specifications: unknown) {
  if (!specifications || typeof specifications !== 'object' || Array.isArray(specifications)) return null;
  const specs = specifications as Record<string, unknown>;
  for (const key of ['gallery_assets', 'gallery_images', 'gallery', 'images', 'imagenes', 'imágenes']) {
    const value = specs[key];
    if (!Array.isArray(value)) continue;
    for (const entry of value) {
      const direct = cleanUrl(entry);
      if (direct) return direct;
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        const record = entry as Record<string, unknown>;
        const nested = cleanUrl(record.secure_url) || cleanUrl(record.url);
        if (nested) return nested;
      }
    }
  }
  return null;
}

function mirroredTclImage(name: string, storedImage: string) {
  if (!/tclstore\.cl/i.test(storedImage)) return null;
  return TCL_REAL_PRODUCT_VISUALS.find(([pattern]) => pattern.test(name))?.[1] ?? null;
}

export function isAirProduct(product?: VisualProduct | null) {
  if (!product) return false;
  return /climat|aire acondicionado|btu|split/i.test(`${product.name || ''} ${product.category_name || product.category || ''}`);
}

export function resolveStoreProductImage(product?: VisualProduct | null) {
  if (!product) return STORE_VISUALS.construction;

  const name = product.name || '';
  const storedImage = cleanUrl(product.image_url) || cleanUrl(product.img) || galleryImage(product.specifications);

  // The catalog/database image is the source of truth. This prevents capacity-based
  // reference artwork (Samsung/Midea/etc.) from replacing the real product photo.
  if (storedImage) {
    if (/res\.cloudinary\.com/i.test(storedImage)) return storedImage;
    return mirroredTclImage(name, storedImage) || storedImage;
  }

  // Curated assets are fallbacks only for legacy/reference products with no media.
  const curated = NAME_VISUALS.find(([pattern]) => pattern.test(name));
  if (curated) return curated[1];
  if (isAirProduct(product)) return STORE_VISUALS.airCalculatorPng;
  return STORE_VISUALS.construction;
}

export function storeProductImageFallback(product?: VisualProduct | null) {
  return isAirProduct(product) ? STORE_VISUALS.airCalculatorPng : STORE_VISUALS.construction;
}

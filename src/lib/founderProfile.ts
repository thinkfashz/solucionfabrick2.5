export const PUBLIC_FOUNDER_PATH = '/fundador';
export const PUBLIC_FOUNDER_URL = 'https://www.solucionesfabrick.com/fundador';

export type FounderPublicProfile = {
  enabled: boolean;
  is_owner: boolean;
  role: string;
  headline: string;
  summary: string;
  biography: string;
  origin: string;
  mission: string;
  vision: string;
  projection: string;
  stack: string[];
  services: string[];
  values: string[];
};

export const DEFAULT_FOUNDER_PUBLIC_PROFILE: FounderPublicProfile = {
  enabled: true,
  is_owner: true,
  role: 'Fundador · Constructor · Desarrollador de soluciones digitales',
  headline: 'Construcción real, tecnología útil y herramientas creadas para resolver problemas concretos.',
  summary:
    'Soluciones Fabrick une experiencia práctica de obra, desarrollo de software y automatización para hacer más clara la forma de cotizar, planificar, construir, comprar y administrar un proyecto.',
  biography:
    'Soy el creador de Soluciones Fabrick. Mi trabajo combina dos mundos que normalmente se desarrollan por separado: la experiencia directa en construcción y la creación de herramientas digitales. He ido convirtiendo necesidades reales de obra —presupuestos, cubicaciones, materiales, seguimiento, presentación de proyectos, ventas y administración— en aplicaciones que una persona pueda entender y utilizar desde el teléfono o el computador. Soluciones Fabrick es también mi laboratorio de aprendizaje: cada nueva función busca simplificar un proceso, entregar más información al cliente y permitir que el trabajo técnico se vea, se mida y se gestione mejor.',
  origin:
    'La iniciativa nació al observar que gran parte de la construcción todavía depende de información dispersa, presupuestos difíciles de comparar y procesos que el cliente no siempre puede visualizar. La idea fue crear una plataforma capaz de reunir servicios, productos, calculadoras, visores, presupuestos y administración en un mismo lugar, manteniendo la experiencia humana y práctica de quien conoce la obra desde dentro.',
  mission:
    'Acercar construcción y tecnología de una forma simple: entregar información comprensible, presupuestos más transparentes, herramientas visuales y procesos digitales que ayuden a tomar mejores decisiones antes, durante y después de una obra.',
  vision:
    'Convertir Soluciones Fabrick en un ecosistema tecnológico para construcción y hogar, donde clientes, trabajadores y proveedores puedan consultar, cotizar, comprar, planificar y dar seguimiento a proyectos desde una misma plataforma.',
  projection:
    'La proyección es seguir incorporando automatización, inteligencia artificial, visores 3D, herramientas de cálculo, comercio electrónico, gestión operativa y experiencias móviles, manteniendo una arquitectura que pueda crecer desde proyectos particulares hasta operaciones más completas.',
  stack: [
    'Next.js',
    'React',
    'TypeScript',
    'NestJS',
    'GraphQL',
    'PostgreSQL',
    'Supabase',
    'PocketBase',
    'Three.js',
    'GSAP',
    'Vercel',
    'Cloudinary',
    'IA local y cloud',
    'Automatización',
  ],
  services: [
    'Construcción y ampliaciones',
    'Remodelación y terminaciones',
    'Kits y soluciones prefabricadas',
    'Radier, fundaciones y obra gruesa',
    'Techumbre y revestimientos',
    'Electricidad y gasfitería',
    'Aire acondicionado e instalaciones',
    'Tienda, presupuestos y herramientas digitales',
  ],
  values: [
    'Información clara antes de ejecutar',
    'Tecnología aplicada a necesidades reales',
    'Mejora continua de procesos',
    'Diseño pensado para móvil y terreno',
    'Transparencia entre servicio, material y alcance',
  ],
};

function cleanString(value: unknown, fallback: string, max = 5000) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}

function cleanList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const next = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, 160))
    .filter(Boolean)
    .slice(0, 30);
  return next.length ? next : fallback;
}

export function normalizeFounderPublicProfile(value: unknown): FounderPublicProfile {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const defaults = DEFAULT_FOUNDER_PUBLIC_PROFILE;

  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : defaults.enabled,
    is_owner: typeof source.is_owner === 'boolean' ? source.is_owner : defaults.is_owner,
    role: cleanString(source.role, defaults.role, 180),
    headline: cleanString(source.headline, defaults.headline, 320),
    summary: cleanString(source.summary, defaults.summary, 900),
    biography: cleanString(source.biography, defaults.biography, 6000),
    origin: cleanString(source.origin, defaults.origin, 4000),
    mission: cleanString(source.mission, defaults.mission, 2600),
    vision: cleanString(source.vision, defaults.vision, 2600),
    projection: cleanString(source.projection, defaults.projection, 3000),
    stack: cleanList(source.stack, defaults.stack),
    services: cleanList(source.services, defaults.services),
    values: cleanList(source.values, defaults.values),
  };
}

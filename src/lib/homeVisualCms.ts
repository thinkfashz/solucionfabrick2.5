export type HomeVisualAnimation = 'none' | 'fade-up' | 'fade' | 'scale' | 'slide-left' | 'slide-right';

export type HomeVisualSectionType =
  | 'hero'
  | 'price-guide'
  | 'calculator'
  | 'process'
  | 'story'
  | 'inspiration'
  | 'seismic'
  | 'store'
  | 'contact'
  | 'footer';

export interface HomeVisualSectionStyle {
  background?: string;
  textColor?: string;
  accent?: string;
  backgroundImage?: string;
  overlay?: number;
  animation?: HomeVisualAnimation;
  duration?: number;
}

export interface HomeVisualSection {
  id: string;
  type: HomeVisualSectionType;
  label: string;
  enabled: boolean;
  order: number;
  style: HomeVisualSectionStyle;
  content: Record<string, unknown>;
}

export interface HomePageContent {
  schemaVersion: 1 | 2;
  sections: HomeVisualSection[];
}

const dark = { background: '#0E0E10', textColor: '#F6F1E8', accent: '#D77A2D', animation: 'fade-up' as const, duration: 0.6 };
const light = { background: '#F6F1E8', textColor: '#111214', accent: '#9A5B22', animation: 'fade-up' as const, duration: 0.6 };

export const DEFAULT_HOME_PAGE: HomePageContent = {
  schemaVersion: 2,
  sections: [
    {
      id: 'home-hero',
      type: 'hero',
      label: 'Portada',
      enabled: true,
      order: 10,
      style: { ...dark, accent: '#D77A2D', backgroundImage: '', overlay: 58 },
      content: {
        eyebrow: 'Diseño · construcción · remodelación',
        title: 'Diseñamos y ejecutamos espacios que funcionan mejor.',
        description: 'Desde una mejora puntual hasta una transformación completa, te ayudamos a ordenar la idea, estimar el alcance y avanzar con una propuesta clara.',
        primaryLabel: 'Cotizar proyecto',
        primaryHref: '/presupuesto',
        secondaryLabel: 'Ver inspiraciones',
        secondaryHref: '/proyectos',
        highlights: ['Diseño y ejecución', 'Soluciones a medida', 'Presupuesto claro'],
        sideEyebrow: 'Empieza por lo que necesitas',
        needs: [
          { title: 'Construir', text: 'Casas, ampliaciones, radier y estructuras.' },
          { title: 'Renovar', text: 'Cocinas, baños, terrazas e interiores.' },
          { title: 'Resolver', text: 'Instalaciones, terminaciones y mejoras puntuales.' },
        ],
        whatsappLabel: 'Hablar por WhatsApp',
        whatsappHref: 'https://wa.me/56930121625?text=Hola%20Soluciones%20Fabrick%2C%20quiero%20cotizar%20un%20proyecto.',
      },
    },
    {
      id: 'home-price-guide',
      type: 'price-guide',
      label: 'Confianza y claridad',
      enabled: true,
      order: 20,
      style: { ...light, background: '#EEE7DD' },
      content: {
        eyebrow: 'Una forma más clara de avanzar',
        title: 'Primero claridad. Después, ejecución.',
        description: 'Ordenamos decisiones antes de sumar complejidad: qué quieres lograr, qué incluye el trabajo y cuál es el siguiente paso.',
        benefits: [
          { title: 'Diseño y ejecución', text: 'Pensamos la solución y también cómo llevarla a obra.' },
          { title: 'Atención directa', text: 'Hablamos de tu espacio, tus prioridades y lo que realmente necesitas.' },
          { title: 'Referencias claras', text: 'Separamos conceptos para que puedas comparar y decidir con contexto.' },
          { title: 'Soluciones a medida', text: 'Cada proyecto se ajusta al lugar, alcance y nivel de terminación esperado.' },
        ],
      },
    },
    {
      id: 'home-story',
      type: 'story',
      label: 'Servicios destacados',
      enabled: true,
      order: 30,
      style: { ...light, background: '#FAF8F4' },
      content: {
        eyebrow: 'Qué podemos hacer por tu espacio',
        title: 'Servicios que parten de una necesidad real.',
        description: 'No vendemos una lista de partidas: organizamos soluciones para construir, renovar o terminar mejor cada ambiente.',
        areas: [
          { title: 'Construcción y ampliaciones', text: 'Casas, ampliaciones, estructuras, radier y obra base.' },
          { title: 'Remodelación e interiores', text: 'Cocinas, baños, terrazas, revestimientos y mejoras de distribución.' },
          { title: 'Instalaciones y terminaciones', text: 'Electricidad, gasfitería, climatización, carpintería y detalles finales.' },
        ],
        primaryLabel: 'Ver servicios',
        primaryHref: '/servicios',
        secondaryLabel: 'Cotizar proyecto',
        secondaryHref: '/presupuesto',
      },
    },
    {
      id: 'home-calculator',
      type: 'calculator',
      label: 'Calculadora',
      enabled: true,
      order: 40,
      style: { ...light, background: '#F6F1E8' },
      content: {
        eyebrow: 'Calculadora de referencia',
        title: 'Calcula una referencia y decide con más contexto.',
        description: 'Elige el trabajo, ingresa tus medidas y compara mano de obra con trabajo vendido sin mezclar conceptos.',
        note: 'Son rangos orientativos. La cotización final depende de medidas, condiciones, materiales y alcance real.',
      },
    },
    {
      id: 'home-inspiration',
      type: 'inspiration',
      label: 'Inspiraciones',
      enabled: true,
      order: 50,
      style: { ...dark, background: '#121315', accent: '#D77A2D' },
      content: {
        eyebrow: 'Ideas para empezar',
        title: 'Encuentra una dirección visual para tu proyecto.',
        description: 'Desliza entre referencias de nuestra biblioteca y abre solo las ideas que quieras explorar con más detalle.',
        ctaLabel: 'Explorar todas',
        ctaHref: '/proyectos',
        emptyText: 'Sube imágenes desde Proyectos en el administrador para mostrarlas automáticamente aquí.',
        servicesEyebrow: 'Referencias visuales',
        servicesTitle: 'Ideas para construir, renovar y terminar mejor.',
        servicesDescription: 'Las imágenes se organizan desde la biblioteca de Inspiración.',
      },
    },
    {
      id: 'home-seismic',
      type: 'seismic',
      label: 'Criterio constructivo',
      enabled: true,
      order: 60,
      style: { ...dark, background: '#171819', accent: '#C69A52' },
      content: {
        eyebrow: 'Criterio constructivo',
        title: 'La seguridad empieza antes del acabado.',
        paragraph1: 'En Chile, una solución bien resuelta debe considerar cómo trabajan juntos base, estructura, uniones y ejecución.',
        paragraph2: 'Por eso hablamos de desempeño y criterio constructivo sin promesas absolutas: cada proyecto se confirma según su condición real.',
        steps: [
          { title: 'Base adecuada', text: 'Terreno, fundación y cargas definen el punto de partida.' },
          { title: 'Sistema coherente', text: 'Estructura, anclajes y uniones deben trabajar como un conjunto.' },
          { title: 'Materiales correctos', text: 'Cada producto debe cumplir una función compatible con el sistema.' },
          { title: 'Ejecución controlada', text: 'El montaje y la revisión importan tanto como la especificación.' },
        ],
        primaryLabel: 'Ver solución Metalcon',
        primaryHref: '/servicios/metalcon',
        secondaryLabel: 'Cotizar estructura',
        secondaryHref: '/presupuesto?servicio=metalcon',
        note: 'Toda solución estructural se confirma según proyecto, cálculo profesional, terreno y normativa aplicable.',
        supportTitle: 'Qué revisamos',
        supportText: 'Alcance, sistema, compatibilidad de materiales y condiciones de ejecución antes de cerrar una propuesta.',
      },
    },
    {
      id: 'home-store',
      type: 'store',
      label: 'Productos',
      enabled: true,
      order: 70,
      style: { ...light, background: '#F2ECE3' },
      content: {
        eyebrow: 'Selección Fabrick',
        title: 'Productos que complementan el proyecto sin distraer del objetivo.',
        description: 'Una selección breve para terminaciones, equipamiento y mejoras. Lo importante sigue siendo resolver bien el espacio.',
        listTitle: 'Destacados',
        listDescription: 'Precio, stock y detalle antes de comprar.',
        ctaLabel: 'Ver tienda',
      },
    },
    {
      id: 'home-process',
      type: 'process',
      label: 'Cómo trabajamos',
      enabled: true,
      order: 80,
      style: { ...dark, background: '#101113' },
      content: {
        eyebrow: 'Así avanzamos',
        title: 'Un proceso claro, sin pasos innecesarios.',
        description: 'Partimos de tu necesidad, ordenamos opciones y definimos una forma concreta de avanzar.',
        options: [
          { title: 'Cuéntanos tu idea', text: 'Compártenos el espacio, la necesidad y cualquier referencia que ya tengas.' },
          { title: 'Revisamos opciones', text: 'Analizamos alcance, solución, materiales y nivel de terminación.' },
          { title: 'Organizamos la propuesta', text: 'Definimos una referencia clara para que puedas decidir el siguiente paso.' },
          { title: 'Lo llevamos a obra', text: 'Ejecutamos con foco en orden, funcionalidad y resultado final.' },
        ],
        ctaTitle: '¿Ya tienes una idea en mente?',
        ctaText: 'Puedes empezar con una foto, una medida aproximada o una referencia visual.',
        ctaLabel: 'Cotizar mi proyecto',
        ctaHref: '/presupuesto',
      },
    },
    {
      id: 'home-contact',
      type: 'contact',
      label: 'Contacto',
      enabled: true,
      order: 90,
      style: { background: '#D9CCBF', textColor: '#111214', accent: '#111214', animation: 'fade-up', duration: 0.6 },
      content: {
        eyebrow: 'Tu proyecto puede empezar aquí',
        title: 'Cuéntanos qué quieres transformar.',
        description: 'Con una foto, una medida aproximada y tu comuna podemos entender el punto de partida y ayudarte a ordenar el siguiente paso.',
        whatsappLabel: 'Hablar por WhatsApp',
        whatsappHref: 'https://wa.me/56930121625?text=Hola%20Soluciones%20Fabrick%2C%20quiero%20cotizar%20un%20proyecto.',
        formTitle: 'Háblanos de tu proyecto',
        formSubtitle: 'Formulario breve · solo pedimos la información necesaria',
      },
    },
    {
      id: 'home-footer',
      type: 'footer',
      label: 'Footer',
      enabled: true,
      order: 100,
      style: { ...dark, animation: 'none' },
      content: {
        description: 'Construcción, remodelación e instalaciones con una forma más clara de planificar y ejecutar.',
        regionText: 'Soluciones Fabrick · Maule y proyectos seleccionados en Santiago',
      },
    },
  ],
};

const LEGACY_ORDERS: Record<string, number[]> = {
  'home-hero': [10],
  'home-price-guide': [20, 30],
  'home-calculator': [20, 30],
  'home-process': [40],
  'home-story': [50],
  'home-inspiration': [55],
  'home-seismic': [60],
  'home-store': [70],
  'home-contact': [80],
  'home-footer': [90],
};

const LEGACY_TEXT: Record<string, Record<string, string[]>> = {
  'home-hero': {
    eyebrow: ['Construcción · remodelación · soluciones para el hogar'],
    title: ['Haz realidad tu proyecto sin perderte entre mil cotizaciones.', 'Haz realidad tu proyecto sin perderte entre medidas.'],
    description: ['Calcula una referencia, compara mano de obra con servicio completo y encuentra productos para avanzar. Puedes resolver una partida puntual o construir el proyecto completo con Fabrick.'],
    primaryLabel: ['Calcular referencia'],
    secondaryLabel: ['Ver proyectos'],
    sideEyebrow: ['¿Qué quieres hacer?'],
  },
  'home-price-guide': {
    eyebrow: ['Una referencia sin vueltas'],
    title: ['Mira el costo sin mezclar conceptos.'],
    description: ['Un precio puede parecer alto cuando mezcla instalación, materiales y terminaciones. Por eso separamos mano de obra de trabajo vendido para que compares lo mismo con lo mismo.'],
  },
  'home-calculator': {
    eyebrow: ['Referencias 2026'],
    title: ['Calcula una referencia y entiende qué estás pagando.'],
    description: ['Elige un trabajo y anota tus medidas. Mostramos mano de obra y trabajo vendido por separado para que una instalación no se confunda con un servicio que además incluye materiales.'],
  },
  'home-process': {
    eyebrow: ['Tú eliges hasta dónde avanzar'],
    title: ['Una partida puntual o el proyecto completo.'],
    description: ['No necesitas seguir un proceso largo para empezar. Puedes mirar una referencia, pedir un trabajo específico o agrupar varias partidas cuando el proyecto lo necesite.'],
    ctaTitle: ['¿Quieres juntar varios trabajos?'],
    ctaText: ['Crea una referencia única y elige mano de obra o trabajo vendido por partida.'],
    ctaLabel: ['Armar mi presupuesto'],
  },
  'home-story': {
    eyebrow: ['Soluciones Fabrick'],
    title: ['Construcción, mejoras y productos en un mismo lugar.'],
    description: ['Fabrick reúne trabajos de construcción y hogar con herramientas simples para estimar, comprar y solicitar ejecución sin saltar entre distintas plataformas.'],
    primaryLabel: ['Calcular un trabajo'],
    secondaryLabel: ['Ver proyectos'],
  },
  'home-inspiration': {
    eyebrow: ['Inspiración Fabrick'],
    title: ['Encuentra una idea y conviértela en tu proyecto.'],
    description: ['Explora ambientes, terminaciones y soluciones relacionadas con los servicios que ofrecemos. Abre cada álbum para ver más imágenes del mismo proyecto.'],
    ctaLabel: ['Ver todas las inspiraciones'],
  },
  'home-seismic': {
    eyebrow: ['Criterio sísmico'],
    title: ['En Chile, la seguridad no puede ser una terminación.'],
    paragraph1: ['La resistencia no depende de una sola placa, un perfil o una promesa comercial. Depende de cómo suelo, fundación, estructura, anclajes, uniones y ejecución trabajan juntos.'],
    paragraph2: ['Una vivienda bien proyectada busca proteger a las personas y controlar fallas esperables. No existe una casa invulnerable; existe un sistema que se diseña y se ejecuta con criterio.'],
    primaryLabel: ['Estimar estructura Metalcon'],
    secondaryLabel: ['Conocer el sistema'],
    supportTitle: ['Respaldo verificable'],
  },
  'home-store': {
    eyebrow: ['Tienda Fabrick'],
    title: ['Productos para terminar, equipar y mejorar tu hogar.'],
    description: ['Materiales, equipamiento y soluciones seleccionadas para complementar una obra o resolver mejoras puntuales. Precio publicado con IVA incluido.'],
    listTitle: ['Selección disponible'],
    listDescription: ['Revisa precio, stock, despacho y detalles antes de comprar.'],
    ctaLabel: ['Ver catálogo completo'],
  },
  'home-contact': {
    eyebrow: ['Hablemos'],
    title: ['Cuéntanos qué quieres hacer.'],
    description: ['Construcción, remodelación, instalación o una reparación puntual. Con una foto, una medida aproximada y tu comuna podemos empezar.'],
    whatsappLabel: ['Escribir por WhatsApp'],
    formTitle: ['Cuéntanos tu proyecto'],
    formSubtitle: ['Formulario breve · respondemos con la información que falte'],
  },
};

const LEGACY_ARRAY_KEYS: Record<string, string[]> = {
  'home-hero': ['highlights', 'needs'],
  'home-price-guide': ['benefits'],
  'home-process': ['options'],
  'home-story': ['areas'],
  'home-seismic': ['steps'],
};

function cloneDefaultHomePage(): HomePageContent {
  return {
    schemaVersion: 2,
    sections: DEFAULT_HOME_PAGE.sections.map((section) => ({
      ...section,
      style: { ...section.style },
      content: JSON.parse(JSON.stringify(section.content)) as Record<string, unknown>,
    })),
  };
}

function migrateContent(fallback: HomeVisualSection, current: HomeVisualSection): Record<string, unknown> {
  const next = { ...fallback.content, ...(current.content || {}) };
  const legacyText = LEGACY_TEXT[fallback.id] || {};
  for (const [key, values] of Object.entries(legacyText)) {
    const value = current.content?.[key];
    if (typeof value === 'string' && values.includes(value)) next[key] = fallback.content[key];
  }

  for (const key of LEGACY_ARRAY_KEYS[fallback.id] || []) {
    const value = current.content?.[key];
    const oldDefault = getLegacyDefaultArray(fallback.id, key);
    if (Array.isArray(value) && oldDefault && JSON.stringify(value) === JSON.stringify(oldDefault)) next[key] = fallback.content[key];
  }
  return next;
}

function getLegacyDefaultArray(sectionId: string, key: string): unknown[] | null {
  const values: Record<string, Record<string, unknown[]>> = {
    'home-hero': {
      highlights: ['Mano de obra separada', 'Servicio completo', 'Precios con IVA de referencia'],
      needs: [
        { title: 'Construir', text: 'Casas, ampliaciones, radier y estructuras.' },
        { title: 'Renovar', text: 'Baños, pisos, revestimientos, pintura y techumbre.' },
        { title: 'Instalar', text: 'Electricidad, gasfitería, climatización y equipamiento.' },
      ],
    },
    'home-price-guide': {
      benefits: [
        { title: 'Mano de obra', text: 'Muestra cuánto puede costar ejecutar o instalar el trabajo sin sumar los materiales principales.' },
        { title: 'Trabajo vendido', text: 'Muestra una referencia con ejecución más los materiales o insumos base descritos para esa partida.' },
        { title: 'Medida real', text: 'Calcula por m², metro lineal, volumen, punto o unidad según el trabajo que elijas.' },
      ],
    },
    'home-process': {
      options: [
        { title: 'Solo quiero una referencia', text: 'Usa la calculadora para entender un rango sin pedir una cotización todavía.' },
        { title: 'Quiero ejecutar un trabajo', text: 'Elige una partida y conversemos sobre su ejecución.' },
        { title: 'Tengo varias partidas', text: 'Reúne los trabajos en un mismo presupuesto y revisa el proyecto como conjunto.' },
      ],
    },
    'home-story': {
      areas: [
        { title: 'Construcción y remodelación', text: 'Casas, ampliaciones, radier, estructuras, baños, techumbre y mejoras del hogar.' },
        { title: 'Instalaciones y terminaciones', text: 'Electricidad, gasfitería, climatización, pisos, pintura, revestimientos y carpintería.' },
        { title: 'Tienda y herramientas', text: 'Productos, calculadoras y referencias de costo para ayudarte a decidir y avanzar con más claridad.' },
      ],
    },
    'home-seismic': {
      steps: [
        { title: 'Suelo y fundación', text: 'La respuesta de la vivienda empieza en una base adecuada al terreno, las cargas y el proyecto.' },
        { title: 'Estructura y conexiones', text: 'Perfiles, anclajes, arriostramientos y fijaciones deben trabajar como un conjunto.' },
        { title: 'Materiales especificados', text: 'Cada producto debe tener una función clara y ser compatible con el sistema que se está ejecutando.' },
        { title: 'Ejecución controlada', text: 'Una buena solución necesita montaje preciso, revisión y decisiones técnicas antes de cerrar muros y techumbre.' },
      ],
    },
  };
  return values[sectionId]?.[key] || null;
}

export function normalizeHomePage(value: unknown): HomePageContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return cloneDefaultHomePage();
  const raw = value as Partial<HomePageContent>;
  const input = Array.isArray(raw.sections) ? raw.sections : [];
  const migrateLegacyOrder = raw.schemaVersion !== 2;
  const byId = new Map(input.filter(Boolean).map((section) => [section.id, section]));
  const sections = DEFAULT_HOME_PAGE.sections.map((fallback) => {
    const current = byId.get(fallback.id);
    if (!current) return fallback;
    const knownLegacyOrder = migrateLegacyOrder && LEGACY_ORDERS[fallback.id]?.includes(Number(current.order));
    return {
      ...fallback,
      ...current,
      order: knownLegacyOrder ? fallback.order : current.order,
      style: { ...fallback.style, ...(current.style || {}) },
      content: migrateContent(fallback, current),
    } as HomeVisualSection;
  });
  for (const current of input) {
    if (!current || sections.some((section) => section.id === current.id)) continue;
    sections.push(current);
  }
  return { schemaVersion: 2, sections: sections.sort((a, b) => a.order - b.order) };
}

export function getHomeSection(config: HomePageContent, type: HomeVisualSectionType): HomeVisualSection {
  return config.sections.find((section) => section.type === type) || DEFAULT_HOME_PAGE.sections.find((section) => section.type === type)!;
}

export function textContent(section: HomeVisualSection, key: string, fallback = ''): string {
  const value = section.content[key];
  return typeof value === 'string' ? value : fallback;
}

export function objectList(section: HomeVisualSection, key: string): Array<{ title: string; text: string }> {
  const value = section.content[key];
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const obj = item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : {};
    return {
      title: typeof obj.title === 'string' ? obj.title : '',
      text: typeof obj.text === 'string' ? obj.text : '',
    };
  });
}

export function stringList(section: HomeVisualSection, key: string): string[] {
  const value = section.content[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

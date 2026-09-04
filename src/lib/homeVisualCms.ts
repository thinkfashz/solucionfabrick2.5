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
  schemaVersion: 1;
  sections: HomeVisualSection[];
}

const dark = { background: '#08090A', textColor: '#FFF9EE', accent: '#FFB000', animation: 'fade-up' as const, duration: 0.6 };
const light = { background: '#FFF9EE', textColor: '#08090A', accent: '#B96F00', animation: 'fade-up' as const, duration: 0.6 };

export const DEFAULT_HOME_PAGE: HomePageContent = {
  schemaVersion: 1,
  sections: [
    {
      id: 'home-hero',
      type: 'hero',
      label: 'Portada',
      enabled: true,
      order: 10,
      style: { ...dark, accent: '#F5871F', backgroundImage: '', overlay: 58 },
      content: {
        eyebrow: 'Construcción · remodelación · soluciones para el hogar',
        title: 'Haz realidad tu proyecto sin perderte entre mil cotizaciones.',
        description: 'Calcula una referencia, compara mano de obra con servicio completo y encuentra productos para avanzar. Puedes resolver una partida puntual o construir el proyecto completo con Fabrick.',
        primaryLabel: 'Calcular referencia',
        primaryHref: '#cotizador',
        secondaryLabel: 'Ver proyectos',
        secondaryHref: '/proyectos',
        highlights: ['Mano de obra separada', 'Servicio completo', 'Precios con IVA de referencia'],
        sideEyebrow: '¿Qué quieres hacer?',
        needs: [
          { title: 'Construir', text: 'Casas, ampliaciones, radier y estructuras.' },
          { title: 'Renovar', text: 'Baños, pisos, revestimientos, pintura y techumbre.' },
          { title: 'Instalar', text: 'Electricidad, gasfitería, climatización y equipamiento.' },
        ],
        whatsappLabel: 'Hablar por WhatsApp',
        whatsappHref: 'https://wa.me/56930121625?text=Hola%20Soluciones%20Fabrick%2C%20quiero%20cotizar%20un%20proyecto.',
      },
    },
    {
      id: 'home-price-guide',
      type: 'price-guide',
      label: 'Precios de referencia',
      enabled: true,
      order: 20,
      style: { ...light },
      content: {
        eyebrow: 'Una referencia sin vueltas',
        title: 'Mira el costo sin mezclar conceptos.',
        description: 'Un precio puede parecer alto cuando mezcla instalación, materiales y terminaciones. Por eso separamos mano de obra de trabajo vendido para que compares lo mismo con lo mismo.',
        benefits: [
          { title: 'Mano de obra', text: 'Muestra cuánto puede costar ejecutar o instalar el trabajo sin sumar los materiales principales.' },
          { title: 'Trabajo vendido', text: 'Muestra una referencia con ejecución más los materiales o insumos base descritos para esa partida.' },
          { title: 'Medida real', text: 'Calcula por m², metro lineal, volumen, punto o unidad según el trabajo que elijas.' },
        ],
      },
    },
    {
      id: 'home-calculator',
      type: 'calculator',
      label: 'Calculadora',
      enabled: true,
      order: 30,
      style: { ...light },
      content: {
        eyebrow: 'Referencias 2026',
        title: 'Calcula una referencia y entiende qué estás pagando.',
        description: 'Elige un trabajo y anota tus medidas. Mostramos mano de obra y trabajo vendido por separado para que una instalación no se confunda con un servicio que además incluye materiales.',
        note: 'Son rangos orientativos. Las exclusiones específicas aparecen dentro de cada servicio.',
      },
    },
    {
      id: 'home-process',
      type: 'process',
      label: 'Cómo avanzar',
      enabled: true,
      order: 40,
      style: { ...dark },
      content: {
        eyebrow: 'Tú eliges hasta dónde avanzar',
        title: 'Una partida puntual o el proyecto completo.',
        description: 'No necesitas seguir un proceso largo para empezar. Puedes mirar una referencia, pedir un trabajo específico o agrupar varias partidas cuando el proyecto lo necesite.',
        options: [
          { title: 'Solo quiero una referencia', text: 'Usa la calculadora para entender un rango sin pedir una cotización todavía.' },
          { title: 'Quiero ejecutar un trabajo', text: 'Elige una partida y conversemos sobre su ejecución.' },
          { title: 'Tengo varias partidas', text: 'Reúne los trabajos en un mismo presupuesto y revisa el proyecto como conjunto.' },
        ],
        ctaTitle: '¿Quieres juntar varios trabajos?',
        ctaText: 'Crea una referencia única y elige mano de obra o trabajo vendido por partida.',
        ctaLabel: 'Armar mi presupuesto',
        ctaHref: '/presupuesto',
      },
    },
    {
      id: 'home-story',
      type: 'story',
      label: 'Historia y propuesta',
      enabled: true,
      order: 50,
      style: { ...light },
      content: {
        eyebrow: 'Soluciones Fabrick',
        title: 'Construcción, mejoras y productos en un mismo lugar.',
        description: 'Fabrick reúne trabajos de construcción y hogar con herramientas simples para estimar, comprar y solicitar ejecución sin saltar entre distintas plataformas.',
        areas: [
          { title: 'Construcción y remodelación', text: 'Casas, ampliaciones, radier, estructuras, baños, techumbre y mejoras del hogar.' },
          { title: 'Instalaciones y terminaciones', text: 'Electricidad, gasfitería, climatización, pisos, pintura, revestimientos y carpintería.' },
          { title: 'Tienda y herramientas', text: 'Productos, calculadoras y referencias de costo para ayudarte a decidir y avanzar con más claridad.' },
        ],
        primaryLabel: 'Calcular un trabajo',
        primaryHref: '/presupuesto',
        secondaryLabel: 'Ver proyectos',
        secondaryHref: '/proyectos',
      },
    },
    {
      id: 'home-inspiration',
      type: 'inspiration',
      label: 'Inspiraciones y proyectos',
      enabled: true,
      order: 55,
      style: { ...dark, background: '#111214' },
      content: {
        eyebrow: 'Inspiración Fabrick',
        title: 'Encuentra una idea y conviértela en tu proyecto.',
        description: 'Explora ambientes, terminaciones y soluciones relacionadas con los servicios que ofrecemos. Abre cada álbum para ver más imágenes del mismo proyecto.',
        ctaLabel: 'Ver todas las inspiraciones',
        ctaHref: '/proyectos',
        emptyText: 'Sube imágenes desde Proyectos en el administrador para mostrarlas automáticamente aquí.',
        servicesEyebrow: 'Servicios + referencias visuales',
        servicesTitle: 'Mira una idea y reconoce qué podemos construir o transformar.',
        servicesDescription: 'Las imágenes se reutilizan automáticamente desde la biblioteca de Inspiración para relacionar cada servicio con una referencia visual realmente compatible.',
      },
    },
    {
      id: 'home-seismic',
      type: 'seismic',
      label: 'Criterio sísmico',
      enabled: true,
      order: 60,
      style: { ...dark },
      content: {
        eyebrow: 'Criterio sísmico',
        title: 'En Chile, la seguridad no puede ser una terminación.',
        paragraph1: 'La resistencia no depende de una sola placa, un perfil o una promesa comercial. Depende de cómo suelo, fundación, estructura, anclajes, uniones y ejecución trabajan juntos.',
        paragraph2: 'Una vivienda bien proyectada busca proteger a las personas y controlar fallas esperables. No existe una casa invulnerable; existe un sistema que se diseña y se ejecuta con criterio.',
        steps: [
          { title: 'Suelo y fundación', text: 'La respuesta de la vivienda empieza en una base adecuada al terreno, las cargas y el proyecto.' },
          { title: 'Estructura y conexiones', text: 'Perfiles, anclajes, arriostramientos y fijaciones deben trabajar como un conjunto.' },
          { title: 'Materiales especificados', text: 'Cada producto debe tener una función clara y ser compatible con el sistema que se está ejecutando.' },
          { title: 'Ejecución controlada', text: 'Una buena solución necesita montaje preciso, revisión y decisiones técnicas antes de cerrar muros y techumbre.' },
        ],
        primaryLabel: 'Estimar estructura Metalcon',
        primaryHref: '/presupuesto?servicio=metalcon',
        secondaryLabel: 'Conocer el sistema',
        secondaryHref: '/servicios/metalcon',
        note: 'Toda solución estructural se confirma según proyecto, cálculo profesional, terreno y normativa aplicable.',
        supportTitle: 'Respaldo verificable',
        supportText: 'Cuando un material tenga garantía de fabricante, la propuesta debe identificar marca, alcance, vigencia y condiciones. La garantía se explica; no se usa como sustituto del diseño correcto.',
      },
    },
    {
      id: 'home-store',
      type: 'store',
      label: 'Productos',
      enabled: true,
      order: 70,
      style: { ...light },
      content: {
        eyebrow: 'Tienda Fabrick',
        title: 'Productos para terminar, equipar y mejorar tu hogar.',
        description: 'Materiales, equipamiento y soluciones seleccionadas para complementar una obra o resolver mejoras puntuales. Precio publicado con IVA incluido.',
        listTitle: 'Selección disponible',
        listDescription: 'Revisa precio, stock, despacho y detalles antes de comprar.',
        ctaLabel: 'Ver catálogo completo',
      },
    },
    {
      id: 'home-contact',
      type: 'contact',
      label: 'Contacto',
      enabled: true,
      order: 80,
      style: { background: '#F5871F', textColor: '#08090A', accent: '#08090A', animation: 'fade-up', duration: 0.6 },
      content: {
        eyebrow: 'Hablemos',
        title: 'Cuéntanos qué quieres hacer.',
        description: 'Construcción, remodelación, instalación o una reparación puntual. Con una foto, una medida aproximada y tu comuna podemos empezar.',
        whatsappLabel: 'Escribir por WhatsApp',
        whatsappHref: 'https://wa.me/56930121625?text=Hola%20Soluciones%20Fabrick%2C%20quiero%20cotizar%20un%20proyecto.',
        formTitle: 'Cuéntanos tu proyecto',
        formSubtitle: 'Formulario breve · respondemos con la información que falte',
      },
    },
    {
      id: 'home-footer',
      type: 'footer',
      label: 'Footer',
      enabled: true,
      order: 90,
      style: { ...dark, animation: 'none' },
      content: {
        description: 'Construcción, remodelación, instalaciones, productos y herramientas para mejorar tu hogar.',
        regionText: 'Soluciones Fabrick · Maule y proyectos seleccionados en Santiago',
      },
    },
  ],
};

function cloneDefaultHomePage(): HomePageContent {
  return {
    schemaVersion: 1,
    sections: DEFAULT_HOME_PAGE.sections.map((section) => ({
      ...section,
      style: { ...section.style },
      content: JSON.parse(JSON.stringify(section.content)) as Record<string, unknown>,
    })),
  };
}

export function normalizeHomePage(value: unknown): HomePageContent {
  // Never expose the module-level defaults as a mutable editor draft. Both the
  // live preview and local recovery update nested section content frequently.
  if (!value || typeof value !== 'object' || Array.isArray(value)) return cloneDefaultHomePage();
  const raw = value as Partial<HomePageContent>;
  const input = Array.isArray(raw.sections) ? raw.sections : [];
  const byId = new Map(input.filter(Boolean).map((section) => [section.id, section]));
  const sections = DEFAULT_HOME_PAGE.sections.map((fallback) => {
    const current = byId.get(fallback.id);
    if (!current) return fallback;
    return {
      ...fallback,
      ...current,
      style: { ...fallback.style, ...(current.style || {}) },
      content: { ...fallback.content, ...(current.content || {}) },
    } as HomeVisualSection;
  });
  for (const current of input) {
    if (!current || sections.some((section) => section.id === current.id)) continue;
    sections.push(current);
  }
  return { schemaVersion: 1, sections: sections.sort((a, b) => a.order - b.order) };
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
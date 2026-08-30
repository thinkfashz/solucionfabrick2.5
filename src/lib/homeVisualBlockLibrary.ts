import type { HomeVisualSection, HomeVisualSectionStyle, HomeVisualSectionType } from './homeVisualCms';

export type HomeVisualBlockTemplateId =
  | 'promo-hero'
  | 'editorial'
  | 'info-cards'
  | 'gallery'
  | 'cta-process'
  | 'products'
  | 'services'
  | 'testimonials';

export interface HomeVisualBlockTemplate {
  id: HomeVisualBlockTemplateId;
  label: string;
  description: string;
  icon: string;
  sectionType: HomeVisualSectionType;
  style: HomeVisualSectionStyle;
  content: Record<string, unknown>;
}

const dark: HomeVisualSectionStyle = {
  background: '#08090A',
  textColor: '#FFF9EE',
  accent: '#FFB000',
  animation: 'fade-up',
  duration: 0.6,
};

const light: HomeVisualSectionStyle = {
  background: '#FFF9EE',
  textColor: '#08090A',
  accent: '#B96F00',
  animation: 'fade-up',
  duration: 0.6,
};

export const HOME_VISUAL_BLOCK_TEMPLATES: HomeVisualBlockTemplate[] = [
  {
    id: 'promo-hero',
    label: 'Portada / promoción',
    description: 'Título grande, descripción, dos acciones, destacados y tarjetas laterales.',
    icon: '✦',
    sectionType: 'hero',
    style: { ...dark, accent: '#F5871F', overlay: 58 },
    content: {
      eyebrow: 'Nueva sección destacada',
      title: 'Presenta una idea importante con impacto.',
      description: 'Edita este texto directamente desde el Visual CMS y adapta la sección a tu campaña, servicio o proyecto.',
      primaryLabel: 'Acción principal',
      primaryHref: '/presupuesto',
      secondaryLabel: 'Ver más',
      secondaryHref: '/proyectos',
      highlights: ['Editable desde el CMS', 'Responsive', 'Borrador antes de publicar'],
      sideEyebrow: 'Puntos destacados',
      needs: [
        { title: 'Beneficio uno', text: 'Explica aquí el primer beneficio o propuesta.' },
        { title: 'Beneficio dos', text: 'Explica aquí el segundo beneficio o propuesta.' },
        { title: 'Beneficio tres', text: 'Explica aquí el tercer beneficio o propuesta.' },
      ],
      whatsappLabel: 'Hablar por WhatsApp',
      whatsappHref: 'https://wa.me/56930121625',
    },
  },
  {
    id: 'editorial',
    label: 'Texto + imagen',
    description: 'Bloque editorial propio con imagen, dos acciones y puntos secundarios.',
    icon: '◫',
    sectionType: 'story',
    style: { ...light, accent: '#F5871F' },
    content: {
      _cmsTemplate: 'editorial',
      eyebrow: 'Sección editorial',
      title: 'Combina una historia clara con una imagen protagonista.',
      description: 'Usa este bloque para explicar una propuesta, servicio, proyecto o historia sin depender de la estructura de otra sección de Home.',
      image: '',
      imageAlt: 'Imagen principal de la sección',
      imageCaption: 'Selecciona esta imagen desde el Visual CMS y reemplázala por un recurso de Cloudinary.',
      imagePosition: 'right',
      primaryLabel: 'Acción principal',
      primaryHref: '/presupuesto',
      secondaryLabel: 'Ver proyectos',
      secondaryHref: '/proyectos',
      points: [
        { title: 'Mensaje directo', text: 'Resume aquí un beneficio o argumento importante.' },
        { title: 'Contenido flexible', text: 'Cambia texto, imagen y presentación desde el editor.' },
      ],
    },
  },
  {
    id: 'info-cards',
    label: 'Cards informativas',
    description: 'Grid visual propio con cards repetidas, numeración y contenido editable.',
    icon: '▦',
    sectionType: 'price-guide',
    style: { ...light },
    content: {
      _cmsTemplate: 'info-cards',
      eyebrow: 'Información destacada',
      title: 'Organiza la información en tarjetas claras.',
      description: 'Cada tarjeta es administrada y puede reordenarse, duplicarse y editarse directamente desde el preview.',
      cards: [
        { number: '01', title: 'Tarjeta uno', text: 'Describe el primer beneficio, característica o dato.' },
        { number: '02', title: 'Tarjeta dos', text: 'Describe el segundo beneficio, característica o dato.' },
        { number: '03', title: 'Tarjeta tres', text: 'Describe el tercer beneficio, característica o dato.' },
      ],
    },
  },
  {
    id: 'gallery',
    label: 'Galería visual',
    description: 'Galería responsive con imágenes, títulos y descripciones independientes.',
    icon: '▤',
    sectionType: 'story',
    style: { ...dark, accent: '#F5871F' },
    content: {
      _cmsTemplate: 'gallery',
      eyebrow: 'Galería',
      title: 'Muestra proyectos, ambientes o resultados.',
      description: 'Cada pieza puede tener su propia imagen y texto. Las imágenes vacías quedan preparadas para seleccionarlas desde el CMS.',
      gallery: [
        { title: 'Proyecto destacado', text: 'Añade una descripción breve de esta imagen.', image: '', alt: 'Proyecto destacado' },
        { title: 'Detalle de trabajo', text: 'Usa esta tarjeta para mostrar terminaciones, procesos o detalles.', image: '', alt: 'Detalle de trabajo' },
        { title: 'Resultado final', text: 'Completa la galería con otra vista o resultado.', image: '', alt: 'Resultado final' },
      ],
    },
  },
  {
    id: 'cta-process',
    label: 'CTA visual',
    description: 'Bloque de llamada a la acción propio con dos botones y tres argumentos breves.',
    icon: '→',
    sectionType: 'process',
    style: { ...dark },
    content: {
      _cmsTemplate: 'cta-process',
      eyebrow: 'Siguiente paso',
      title: 'Convierte una visita en una acción clara.',
      description: 'Usa este bloque para llevar a presupuesto, contacto, compra, registro o cualquier objetivo concreto.',
      ctaLabel: 'Continuar',
      ctaHref: '/presupuesto',
      secondaryLabel: 'Hablar con Fabrick',
      secondaryHref: '/contacto',
      highlights: [
        { title: 'Sin compromiso', text: 'Explica una ventaja breve antes del clic.' },
        { title: 'Respuesta clara', text: 'Agrega una segunda razón para continuar.' },
        { title: 'Proceso simple', text: 'Cierra con otro argumento de confianza.' },
      ],
    },
  },
  {
    id: 'products',
    label: 'Productos',
    description: 'Sección conectada al catálogo real de la tienda con encabezado editable.',
    icon: '▣',
    sectionType: 'store',
    style: { ...light },
    content: {
      eyebrow: 'Productos recomendados',
      title: 'Muestra productos dentro de la página.',
      description: 'El catálogo mantiene su lógica real; desde el CMS editas la presentación de la sección.',
      listTitle: 'Selección disponible',
      listDescription: 'Revisa precio, stock, despacho y detalles antes de comprar.',
      ctaLabel: 'Ver catálogo completo',
    },
  },
  {
    id: 'services',
    label: 'Servicios',
    description: 'Listado visual propio con enlaces independientes por servicio.',
    icon: '⌂',
    sectionType: 'story',
    style: { ...light, accent: '#F5871F' },
    content: {
      _cmsTemplate: 'services',
      eyebrow: 'Servicios',
      title: 'Presenta tus servicios principales.',
      description: 'Cada fila funciona como un bloque administrado con título, descripción y enlace independiente.',
      services: [
        { number: '01', title: 'Construcción y ampliaciones', text: 'Casas, ampliaciones, estructuras y partidas de obra gruesa.', label: 'Ver servicio', href: '/servicios/ampliaciones' },
        { number: '02', title: 'Instalaciones', text: 'Electricidad, gasfitería, climatización y soluciones técnicas para el hogar.', label: 'Ver servicios', href: '/servicios' },
        { number: '03', title: 'Terminaciones y mejoras', text: 'Revestimientos, pintura, pisos, techumbre y mejoras de espacios existentes.', label: 'Cotizar', href: '/presupuesto' },
      ],
    },
  },
  {
    id: 'testimonials',
    label: 'Testimonios',
    description: 'Sección visual propia para opiniones o casos breves, sin datos inventados publicados por defecto.',
    icon: '“”',
    sectionType: 'price-guide',
    style: { ...dark },
    content: {
      _cmsTemplate: 'testimonials',
      eyebrow: 'Experiencias',
      title: 'Agrega testimonios reales que generen confianza.',
      description: 'Reemplaza los textos de ejemplo por experiencias verificables antes de publicar esta sección.',
      testimonials: [
        { title: 'Cliente / proyecto', role: 'Testimonio por completar', text: '“Reemplaza este texto por una experiencia real y verificable.”' },
        { title: 'Cliente / proyecto', role: 'Testimonio por completar', text: '“Agrega una segunda experiencia cuando tengas autorización para publicarla.”' },
        { title: 'Cliente / proyecto', role: 'Testimonio por completar', text: '“Usa esta tercera tarjeta para otro comentario o caso breve.”' },
      ],
      note: 'No publiques nombres, fotografías ni opiniones de clientes sin autorización correspondiente.',
    },
  },
];

export function getHomeVisualBlockTemplate(id: string | null | undefined) {
  return HOME_VISUAL_BLOCK_TEMPLATES.find((template) => template.id === id) || null;
}

export function isHomeVisualLibraryBlockId(id: string | null | undefined) {
  return typeof id === 'string' && /^cms-(promo-hero|editorial|info-cards|gallery|cta-process|products|services|testimonials|duplicate)-/.test(id);
}

export function createHomeBlockFromTemplate(id: string, order = 0): HomeVisualSection | null {
  const template = getHomeVisualBlockTemplate(id);
  if (!template) return null;
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id: `cms-${template.id}-${unique}`,
    type: template.sectionType,
    label: template.label,
    enabled: true,
    order,
    style: clone(template.style),
    content: clone(template.content),
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

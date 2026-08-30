import type { HomeVisualSection, HomeVisualSectionStyle, HomeVisualSectionType } from './homeVisualCms';

export type HomeVisualBlockTemplateId =
  | 'promo-hero'
  | 'editorial'
  | 'info-cards'
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
    label: 'Texto editorial',
    description: 'Bloque de historia/propuesta con título, texto, botones y filas editables.',
    icon: 'T',
    sectionType: 'story',
    style: { ...light },
    content: {
      eyebrow: 'Sección editorial',
      title: 'Cuenta una historia o explica una propuesta.',
      description: 'Usa este bloque para desarrollar una idea con jerarquía clara y contenido que puedas modificar directamente.',
      areas: [
        { title: 'Primer punto', text: 'Explica el primer aspecto de esta sección.' },
        { title: 'Segundo punto', text: 'Agrega información complementaria o un beneficio.' },
        { title: 'Tercer punto', text: 'Cierra con una idea útil para la persona que visita la página.' },
      ],
      primaryLabel: 'Acción principal',
      primaryHref: '/presupuesto',
      secondaryLabel: 'Acción secundaria',
      secondaryHref: '/proyectos',
    },
  },
  {
    id: 'info-cards',
    label: 'Cards informativas',
    description: 'Título, descripción y grupo de tarjetas repetidas que puedes mover o duplicar.',
    icon: '▦',
    sectionType: 'price-guide',
    style: { ...light },
    content: {
      eyebrow: 'Información destacada',
      title: 'Organiza la información en tarjetas claras.',
      description: 'Cada tarjeta es administrada y puede reordenarse, duplicarse y editarse desde el preview.',
      benefits: [
        { title: 'Tarjeta uno', text: 'Describe el primer beneficio, característica o dato.' },
        { title: 'Tarjeta dos', text: 'Describe el segundo beneficio, característica o dato.' },
        { title: 'Tarjeta tres', text: 'Describe el tercer beneficio, característica o dato.' },
      ],
    },
  },
  {
    id: 'cta-process',
    label: 'Proceso + CTA',
    description: 'Tres opciones o pasos y un llamado a la acción final con botón.',
    icon: '→',
    sectionType: 'process',
    style: { ...dark },
    content: {
      eyebrow: 'Cómo funciona',
      title: 'Explica el camino y termina con una acción clara.',
      description: 'Este bloque sirve para procesos, pasos de compra, modalidades o comparaciones simples.',
      options: [
        { title: 'Paso uno', text: 'Explica qué ocurre primero.' },
        { title: 'Paso dos', text: 'Explica la segunda decisión o etapa.' },
        { title: 'Paso tres', text: 'Explica cómo se completa el proceso.' },
      ],
      ctaTitle: '¿Listo para continuar?',
      ctaText: 'Cambia este llamado a la acción por el objetivo que necesites.',
      ctaLabel: 'Continuar',
      ctaHref: '/presupuesto',
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
    description: 'Bloque editorial preparado para presentar servicios o áreas de trabajo.',
    icon: '⌂',
    sectionType: 'story',
    style: { ...dark },
    content: {
      eyebrow: 'Servicios',
      title: 'Presenta tus servicios principales.',
      description: 'Puedes reemplazar estas filas por cualquier grupo de servicios, especialidades o soluciones.',
      areas: [
        { title: 'Servicio uno', text: 'Describe qué incluye este servicio y para quién está pensado.' },
        { title: 'Servicio dos', text: 'Agrega una segunda especialidad o solución.' },
        { title: 'Servicio tres', text: 'Completa la selección con otro servicio importante.' },
      ],
      primaryLabel: 'Cotizar servicio',
      primaryHref: '/presupuesto',
      secondaryLabel: 'Ver servicios',
      secondaryHref: '/servicios',
    },
  },
  {
    id: 'testimonials',
    label: 'Testimonios',
    description: 'Grupo de cards preparado para opiniones, experiencias o casos breves.',
    icon: '“”',
    sectionType: 'price-guide',
    style: { ...dark },
    content: {
      eyebrow: 'Experiencias',
      title: 'Agrega testimonios que generen confianza.',
      description: 'Reemplaza estos textos por opiniones verificables de clientes o experiencias reales de proyectos.',
      benefits: [
        { title: 'Cliente / proyecto', text: '“Escribe aquí un testimonio breve y verificable.”' },
        { title: 'Cliente / proyecto', text: '“Agrega una segunda experiencia o comentario.”' },
        { title: 'Cliente / proyecto', text: '“Completa la sección con otra opinión real.”' },
      ],
    },
  },
];

export function getHomeVisualBlockTemplate(id: string | null | undefined) {
  return HOME_VISUAL_BLOCK_TEMPLATES.find((template) => template.id === id) || null;
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

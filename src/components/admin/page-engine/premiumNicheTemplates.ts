type VisualPreset = 'fabrick-lava' | 'glass-rose' | 'luxury-soft' | 'mobile-app-premium' | 'booking-beauty' | 'neo-minimal' | 'editorial-dark';

type NicheTemplate = {
  title: string;
  visualPreset: VisualPreset;
  hero: {
    headline: string;
    subtitle: string;
    cta: string;
    href: string;
  };
  benefits: string[];
  pricing: Array<{ name: string; price: string; features: string[] }>;
  stats: Array<{ value: string; label: string }>;
  testimonials: Array<{ quote: string; name: string }>;
  guarantee: { title: string; description: string };
  cta: { title: string; text: string; buttonText: string; href: string };
};

const templates: Record<string, NicheTemplate> = {
  barberia: {
    title: 'Landing premium para barbería',
    visualPreset: 'editorial-dark',
    hero: { headline: 'Convierte cortes en reservas llenas', subtitle: 'Agenda online, vitrina visual y paquetes claros para que más clientes reserven sin preguntar de más.', cta: 'Reservar hora', href: '/contacto' },
    benefits: ['Agenda rápida', 'Galería de estilos', 'Promociones por servicio', 'Recordatorios automáticos'],
    pricing: [
      { name: 'Corte', price: '$12.000', features: ['Reserva online', 'Ficha de cliente', 'Confirmación rápida'] },
      { name: 'Corte + barba', price: '$20.000', features: ['Pack destacado', 'Galería premium', 'CTA directo'] },
      { name: 'Membresía', price: '$45.000', features: ['Clientes recurrentes', 'Descuento mensual', 'Seguimiento'] },
    ],
    stats: [{ value: '+30%', label: 'más reservas desde móvil' }, { value: '24/7', label: 'agenda visible siempre' }, { value: '3 pasos', label: 'para reservar' }],
    testimonials: [{ quote: 'La barbería se ve más profesional y la gente entiende los servicios altiro.', name: 'Dueño de barbería' }],
    guarantee: { title: 'Garantía de presentación comercial', description: 'Página optimizada para mostrar servicios, precios y reserva de forma clara.' },
    cta: { title: 'Llena tu agenda con una página que vende', text: 'Convierte Instagram, WhatsApp y visitas en reservas reales.', buttonText: 'Crear landing barbería', href: '/contacto' },
  },
  estetica: {
    title: 'Landing premium para estética',
    visualPreset: 'booking-beauty',
    hero: { headline: 'Haz que tu estética se vea irresistible', subtitle: 'Presenta servicios, agenda, resultados y paquetes con una experiencia visual elegante.', cta: 'Reservar ahora', href: '/contacto' },
    benefits: ['Reservas simples', 'Servicios claros', 'Antes y después', 'Experiencia premium'],
    pricing: [
      { name: 'Limpieza facial', price: '$25.000', features: ['Descripción visual', 'Reserva directa', 'Garantía de atención'] },
      { name: 'Pack Glow', price: '$45.000', features: ['Servicio destacado', 'Beneficios claros', 'CTA premium'] },
      { name: 'Plan mensual', price: '$79.000', features: ['Clientes recurrentes', 'Seguimiento', 'Promoción fija'] },
    ],
    stats: [{ value: '+40%', label: 'más confianza visual' }, { value: '5 min', label: 'para decidir' }, { value: '24/7', label: 'vitrina online' }],
    testimonials: [{ quote: 'La página transmite confianza y se ve como una marca de verdad.', name: 'Cliente estética' }],
    guarantee: { title: 'Diseño pensado para confianza', description: 'Estructura visual para mostrar servicios, resultados y llamada a reserva.' },
    cta: { title: 'Convierte tu servicio en una experiencia premium', text: 'Ideal para captar clientas desde redes sociales y WhatsApp.', buttonText: 'Crear landing estética', href: '/contacto' },
  },
  construccion: {
    title: 'Landing premium para construcción',
    visualPreset: 'fabrick-lava',
    hero: { headline: 'Propuestas de construcción que se entienden y venden', subtitle: 'Muestra servicios, garantías, paquetes y llamados de cotización con presencia profesional.', cta: 'Cotizar proyecto', href: '/contacto' },
    benefits: ['Cotización clara', 'Garantía visible', 'Proceso por etapas', 'Confianza técnica'],
    pricing: [
      { name: 'Diagnóstico', price: '$49.000', features: ['Visita inicial', 'Revisión técnica', 'Informe simple'] },
      { name: 'Proyecto', price: 'A cotizar', features: ['Propuesta completa', 'Materiales', 'Plan de ejecución'] },
      { name: 'Llave en mano', price: 'A cotizar', features: ['Gestión completa', 'Seguimiento', 'Entrega final'] },
    ],
    stats: [{ value: '7 días', label: 'para propuesta inicial' }, { value: '+20', label: 'partidas ordenadas' }, { value: '100%', label: 'proceso documentado' }],
    testimonials: [{ quote: 'La propuesta se entiende mejor que un presupuesto tradicional.', name: 'Cliente construcción' }],
    guarantee: { title: 'Garantía de claridad y seguimiento', description: 'Cada propuesta puede explicar etapas, materiales, tiempos y condiciones.' },
    cta: { title: 'Presenta tu obra como una propuesta profesional', text: 'Ideal para vender proyectos de remodelación, muebles, radieres y servicios técnicos.', buttonText: 'Crear propuesta', href: '/contacto' },
  },
  restaurante: {
    title: 'Landing premium para restaurante',
    visualPreset: 'luxury-soft',
    hero: { headline: 'Convierte tu carta en una experiencia que abre el apetito', subtitle: 'Menú visual, reservas, promociones y pedidos con una presentación premium.', cta: 'Ver menú', href: '/contacto' },
    benefits: ['Menú digital', 'Reservas rápidas', 'Promos destacadas', 'WhatsApp directo'],
    pricing: [
      { name: 'Menú digital', price: '$59.000', features: ['Carta responsive', 'Promos visibles', 'QR'] },
      { name: 'Restaurante Pro', price: '$129.000', features: ['Reservas', 'Galería', 'CTA WhatsApp'] },
      { name: 'Campaña', price: '$199.000', features: ['Landing promocional', 'Captación', 'Seguimiento'] },
    ],
    stats: [{ value: '+25%', label: 'más consultas' }, { value: 'QR', label: 'acceso inmediato' }, { value: '24/7', label: 'menú activo' }],
    testimonials: [{ quote: 'El menú se ve más ordenado y los clientes llegan con decisión.', name: 'Dueño restaurante' }],
    guarantee: { title: 'Menú claro y fácil de compartir', description: 'Diseñado para redes, QR, WhatsApp y navegación móvil.' },
    cta: { title: 'Haz que tu comida se venda visualmente', text: 'Un menú simple puede convertirse en una vitrina comercial.', buttonText: 'Crear menú premium', href: '/contacto' },
  },
  hotel: {
    title: 'Landing premium para hotel',
    visualPreset: 'luxury-soft',
    hero: { headline: 'Más reservas con una experiencia visual de confianza', subtitle: 'Habitaciones, beneficios, ubicación y reserva presentados con estilo premium.', cta: 'Consultar disponibilidad', href: '/contacto' },
    benefits: ['Reserva directa', 'Habitaciones destacadas', 'Galería elegante', 'Confianza inmediata'],
    pricing: [
      { name: 'Habitación estándar', price: 'Desde $45.000', features: ['Fotos', 'Beneficios', 'Reserva'] },
      { name: 'Suite premium', price: 'Desde $75.000', features: ['Destacado visual', 'Experiencia completa', 'CTA directo'] },
      { name: 'Pack familiar', price: 'A cotizar', features: ['Beneficios', 'Flexibilidad', 'Atención directa'] },
    ],
    stats: [{ value: '24/7', label: 'disponibilidad online' }, { value: '+35%', label: 'más confianza visual' }, { value: '3 clics', label: 'para consultar' }],
    testimonials: [{ quote: 'La presentación del hotel se ve más seria y fácil de reservar.', name: 'Administrador hotel' }],
    guarantee: { title: 'Presentación clara para reservar', description: 'Pensado para mostrar habitaciones, beneficios y contacto directo.' },
    cta: { title: 'Convierte visitas en reservas', text: 'Ideal para hoteles, cabañas, hostales y alojamientos locales.', buttonText: 'Crear landing hotel', href: '/contacto' },
  },
  transporte: {
    title: 'Landing premium para transporte',
    visualPreset: 'mobile-app-premium',
    hero: { headline: 'Cotiza viajes y servicios sin perder clientes', subtitle: 'Rutas, tarifas, disponibilidad y contacto directo en una página clara y rápida.', cta: 'Cotizar viaje', href: '/contacto' },
    benefits: ['Cotización rápida', 'Rutas visibles', 'WhatsApp directo', 'Confianza operativa'],
    pricing: [
      { name: 'Traslado local', price: 'Desde $15.000', features: ['Ruta clara', 'Contacto directo', 'Confirmación'] },
      { name: 'Servicio empresa', price: 'A cotizar', features: ['Plan mensual', 'Gestión', 'Soporte'] },
      { name: 'Viaje especial', price: 'A cotizar', features: ['Flexibilidad', 'Reserva', 'Seguimiento'] },
    ],
    stats: [{ value: '24/7', label: 'cotización online' }, { value: '3 pasos', label: 'para solicitar' }, { value: '+20%', label: 'más consultas' }],
    testimonials: [{ quote: 'Los clientes entienden rutas y precios más rápido.', name: 'Operador transporte' }],
    guarantee: { title: 'Información clara antes de viajar', description: 'Presenta servicios, rutas y contacto de manera ordenada y confiable.' },
    cta: { title: 'Haz que tu transporte se pueda cotizar al instante', text: 'Página ideal para taxis, transfer, fletes y transporte local.', buttonText: 'Crear landing transporte', href: '/contacto' },
  },
  ecommerce: {
    title: 'Landing premium para ecommerce',
    visualPreset: 'mobile-app-premium',
    hero: { headline: 'Vende productos con una vitrina que se siente premium', subtitle: 'Destaca catálogo, beneficios, ofertas y compra rápida desde móvil.', cta: 'Ver catálogo', href: '/contacto' },
    benefits: ['Catálogo claro', 'Productos destacados', 'CTA de compra', 'Confianza visual'],
    pricing: [
      { name: 'Catálogo básico', price: '$99.000', features: ['Vitrina', 'Productos destacados', 'Contacto'] },
      { name: 'Tienda Pro', price: '$249.000', features: ['Carrito', 'Stock', 'Panel admin'] },
      { name: 'Automatización', price: 'A cotizar', features: ['Inventario', 'Notificaciones', 'Reportes'] },
    ],
    stats: [{ value: '+30%', label: 'más intención de compra' }, { value: '24/7', label: 'tienda activa' }, { value: '100%', label: 'responsive' }],
    testimonials: [{ quote: 'El catálogo se ve mucho más confiable y profesional.', name: 'Dueño ecommerce' }],
    guarantee: { title: 'Vitrina preparada para vender', description: 'Diseño orientado a producto, confianza y llamada de compra.' },
    cta: { title: 'Convierte tus productos en una experiencia de compra', text: 'Ideal para catálogos, repuestos, tiendas locales y servicios con stock.', buttonText: 'Crear ecommerce premium', href: '/contacto' },
  },
  serviciotecnico: {
    title: 'Landing premium para servicio técnico',
    visualPreset: 'fabrick-lava',
    hero: { headline: 'Recibe más solicitudes de reparación con una página clara', subtitle: 'Servicios, diagnósticos, garantías y contacto rápido para clientes que necesitan solución.', cta: 'Solicitar diagnóstico', href: '/contacto' },
    benefits: ['Diagnóstico rápido', 'Garantía visible', 'Servicios claros', 'WhatsApp directo'],
    pricing: [
      { name: 'Diagnóstico', price: '$15.000', features: ['Evaluación', 'Informe rápido', 'Cotización'] },
      { name: 'Reparación', price: 'A cotizar', features: ['Mano de obra', 'Repuestos', 'Garantía'] },
      { name: 'Mantención', price: '$39.000', features: ['Preventivo', 'Limpieza', 'Revisión'] },
    ],
    stats: [{ value: '24h', label: 'respuesta estimada' }, { value: '+50', label: 'servicios ordenados' }, { value: '30 días', label: 'garantía referencial' }],
    testimonials: [{ quote: 'Ahora los clientes entienden qué ofrecemos y consultan más directo.', name: 'Servicio técnico' }],
    guarantee: { title: 'Garantía y soporte postservicio', description: 'Página preparada para explicar condiciones y respaldo del servicio.' },
    cta: { title: 'Haz que tus reparaciones se coticen más rápido', text: 'Ideal para celulares, computadores, electrodomésticos y asistencia técnica.', buttonText: 'Crear landing técnica', href: '/contacto' },
  },
  inmobiliaria: {
    title: 'Landing premium para inmobiliaria',
    visualPreset: 'neo-minimal',
    hero: { headline: 'Presenta propiedades con una experiencia elegante', subtitle: 'Ficha visual, beneficios, ubicación, contacto y prueba social en una página lista para captar interesados.', cta: 'Agendar visita', href: '/contacto' },
    benefits: ['Ficha clara', 'Galería premium', 'Ubicación visible', 'Contacto directo'],
    pricing: [
      { name: 'Ficha propiedad', price: '$79.000', features: ['Landing individual', 'Galería', 'Contacto'] },
      { name: 'Campaña Pro', price: '$149.000', features: ['Captación', 'Formulario', 'Seguimiento'] },
      { name: 'Pack inmobiliaria', price: 'A cotizar', features: ['Varias propiedades', 'Plantillas', 'Reportes'] },
    ],
    stats: [{ value: '+35%', label: 'más confianza visual' }, { value: '3 clics', label: 'para agendar' }, { value: '100%', label: 'móvil' }],
    testimonials: [{ quote: 'La propiedad se ve mejor presentada y genera más consultas.', name: 'Corredor inmobiliario' }],
    guarantee: { title: 'Presentación clara para captar interesados', description: 'Diseño pensado para mostrar valor, ubicación, beneficios y llamada a visita.' },
    cta: { title: 'Convierte propiedades en oportunidades reales', text: 'Ideal para corredores, arriendos, ventas y proyectos inmobiliarios.', buttonText: 'Crear landing inmobiliaria', href: '/contacto' },
  },
};

function normalizeNiche(value: unknown) {
  const raw = String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  if (raw.includes('barber')) return 'barberia';
  if (raw.includes('estetica') || raw.includes('beauty') || raw.includes('spa') || raw.includes('nail')) return 'estetica';
  if (raw.includes('constru') || raw.includes('obra') || raw.includes('mueble')) return 'construccion';
  if (raw.includes('restaurant') || raw.includes('comida') || raw.includes('menu')) return 'restaurante';
  if (raw.includes('hotel') || raw.includes('hostal') || raw.includes('cabana')) return 'hotel';
  if (raw.includes('transport') || raw.includes('transfer') || raw.includes('flete')) return 'transporte';
  if (raw.includes('ecommerce') || raw.includes('tienda') || raw.includes('catalogo')) return 'ecommerce';
  if (raw.includes('serviciotecnico') || raw.includes('tecnico') || raw.includes('reparacion')) return 'serviciotecnico';
  if (raw.includes('inmobili') || raw.includes('propiedad') || raw.includes('arriendo')) return 'inmobiliaria';
  return '';
}

export function buildNicheTemplate(rawNiche: unknown, overrides: Record<string, unknown> = {}) {
  const key = normalizeNiche(rawNiche);
  if (!key || !templates[key]) return null;
  return {
    ...templates[key],
    ...overrides,
    hero: { ...templates[key].hero, ...(typeof overrides.hero === 'object' && overrides.hero ? overrides.hero as object : {}) },
    cta: { ...templates[key].cta, ...(typeof overrides.cta === 'object' && overrides.cta ? overrides.cta as object : {}) },
  };
}

export const NICHE_TEMPLATE_KEYS = Object.keys(templates);

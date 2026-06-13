export interface LandingNichePreset {
  id: string;
  label: string;
  goal: string;
  sections: string[];
  visualDirection: string;
}

export const LANDING_NICHES: LandingNichePreset[] = [
  {
    id: 'dental',
    label: 'Clínica dental',
    goal: 'Generar confianza, mostrar tratamientos, agenda y WhatsApp.',
    sections: ['hero', 'servicios', 'antes-despues', 'confianza', 'agenda', 'whatsapp'],
    visualDirection: 'blanco premium, azul o dorado suave, rostros sonrientes, limpieza clínica, tarjetas claras.',
  },
  {
    id: 'hotel',
    label: 'Hotel / alojamiento',
    goal: 'Mostrar experiencia, habitaciones, ubicación, reservas y temporada.',
    sections: ['hero', 'habitaciones', 'experiencias', 'ubicacion', 'reservas', 'testimonios'],
    visualDirection: 'fotografía cálida, tonos crema, negro elegante, llamadas a reservar.',
  },
  {
    id: 'restaurante',
    label: 'Restaurante',
    goal: 'Convertir visitas en reservas o pedidos por WhatsApp.',
    sections: ['hero', 'platos', 'menu-destacado', 'ambiente', 'reserva', 'delivery'],
    visualDirection: 'apetitoso, fotografías grandes, negro/crema, botones directos.',
  },
  {
    id: 'construccion',
    label: 'Construcción / servicios',
    goal: 'Mostrar trabajos, confianza, proceso, cotización y contacto.',
    sections: ['hero', 'problema-solucion', 'servicios', 'proyectos', 'proceso', 'cotizacion'],
    visualDirection: 'oscuro premium, dorado, imágenes de obra, métricas de confianza.',
  },
  {
    id: 'belleza',
    label: 'Salón de belleza / estética',
    goal: 'Vender agenda, resultados y experiencia visual.',
    sections: ['hero', 'servicios', 'resultados', 'precios-desde', 'agenda', 'instagram'],
    visualDirection: 'premium femenino, crema, negro, rosa suave o dorado, fotos antes/después.',
  },
  {
    id: 'tienda-local',
    label: 'Tienda local',
    goal: 'Mostrar catálogo básico, confianza y compra/contacto.',
    sections: ['hero', 'productos', 'beneficios', 'categorias', 'whatsapp', 'ubicacion'],
    visualDirection: 'ecommerce simple, tarjetas, CTA claro, mobile-first.',
  },
];

export function getNichePreset(id?: string): LandingNichePreset {
  return LANDING_NICHES.find((item) => item.id === id) || LANDING_NICHES[0];
}

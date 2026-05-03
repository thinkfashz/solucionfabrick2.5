/**
 * Project (obra terminada) domain model + 5 realistic seed projects.
 *
 * The public `/proyectos` page and the admin CRUD both read through the
 * `/api/proyectos` endpoint. If the backend `projects` table is available
 * the DB wins; otherwise the seed list below is returned so the page never
 * looks empty.
 */

export interface FabrickProject {
  id: string;
  title: string;
  location: string;       // City, comuna
  year: number | string;
  area_m2: number;        // Superficie construida / intervenida
  category: string;       // e.g. "Vivienda nueva", "Ampliación", "Remodelación"
  hero_image: string;     // Primary photo (URL)
  gallery?: string[];     // Additional photos
  summary: string;        // Short 1-2 line description
  description: string;    // Full paragraph-length description
  materials: string[];    // Materials used (bullet list)
  highlights: string[];   // Feature bullets ("duración 60 días", etc.)
  scope: string[];        // What the team did
  /** Optional: marks this project as a featured/cover case. */
  featured?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const SEED_PROJECTS: FabrickProject[] = [
  {
    id: 'PRJ-001',
    title: 'Casa Andes — Vivienda Metalcon 2 pisos',
    location: 'Colina, Región Metropolitana',
    year: 2024,
    area_m2: 142,
    category: 'Vivienda nueva',
    hero_image:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1600&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1600&auto=format&fit=crop',
    ],
    summary:
      'Vivienda residencial de 142 m² construida con estructura Metalcon 90 y revestimientos premium, entregada llave en mano en 95 días.',
    description:
      'Proyecto integral de vivienda unifamiliar de dos pisos, ejecutado completamente por el equipo Fabrick desde radier hasta terminaciones finales. Diseñamos una envolvente térmica que supera la exigencia zona 3, con control de humedad por barrera DVH y aislación de lana mineral de 80 mm en muros y 100 mm en entrepiso.',
    materials: [
      'Estructura Metalcon perfil C 90 mm x 0.85 mm (muros estructurales)',
      'Estructura Metalcon 60 mm (tabiques interiores)',
      'Placa OSB 11,1 mm exterior + Tyvek DrainWrap',
      'Fibrocemento siding 8 mm terminación exterior',
      'Volcanita ST 15 mm interior + pasta muro premium',
      'Piso flotante AC5 roble natural espesor 12 mm',
      'Aislación lana mineral 80 mm muros / 100 mm entrepiso',
    ],
    highlights: [
      'Duración total: 95 días corridos',
      'Superficie construida: 142 m² · 2 pisos',
      'Envolvente térmica zona 3 chilena',
      'Cero filtraciones después de invierno 2024',
    ],
    scope: [
      'Excavación y radier armado',
      'Estructura Metalcon completa',
      'Gasfitería y eléctrico certificado SEC',
      'Revestimientos interiores y exteriores',
      'Pintura, pisos y terminaciones',
    ],
    featured: true,
  },
  {
    id: 'PRJ-002',
    title: 'Remodelación Integral Depto. Providencia',
    location: 'Providencia, Santiago',
    year: 2024,
    area_m2: 78,
    category: 'Remodelación',
    hero_image:
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1600&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1600&auto=format&fit=crop',
    ],
    summary:
      'Remodelación total de departamento 78 m² con redistribución de planta, cocina abierta y baño premium con revestimientos Marmo PVC.',
    description:
      'Transformamos un departamento antiguo en un espacio contemporáneo manteniendo la estructura original. Reemplazamos todos los recubrimientos, redistribuimos la cocina hacia un concepto abierto y ejecutamos una renovación completa de cañerías embutidas y circuito eléctrico.',
    materials: [
      'Paneles Wall Panel PVC Mármol 8 mm (baño y cocina)',
      'Porcelanato gran formato 60 x 120 cm',
      'Muebles a medida MDF enchapado roble',
      'Cañería PPR agua caliente y fría',
      'Cableado eléctrico 2,5 mm² y 4 mm²',
      'Griferías monomando acabado black matte',
    ],
    highlights: [
      'Duración: 42 días corridos',
      'Superficie intervenida: 78 m² completos',
      '100% de cañerías y eléctrico renovado',
      'Certificación SEC aprobada al primer intento',
    ],
    scope: [
      'Demolición controlada y retiro de escombros',
      'Redistribución de tabiques',
      'Gasfitería y eléctrico nuevo completo',
      'Revestimientos, pintura y piso',
      'Muebles de cocina y baño a medida',
    ],
  },
  {
    id: 'PRJ-003',
    title: 'Ampliación Dormitorio + Baño en Segundo Piso',
    location: 'La Florida, Santiago',
    year: 2023,
    area_m2: 34,
    category: 'Ampliación',
    hero_image:
      'https://images.unsplash.com/photo-1567016432779-094069958ea5?q=80&w=1600&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1600&auto=format&fit=crop',
    ],
    summary:
      'Ampliación de 34 m² en segundo piso con estructura Metalcon 60 reforzada, dormitorio principal y baño en suite completamente terminado.',
    description:
      'Aumento de superficie habitable sobre losa existente. El estudio estructural previo permitió diseñar una ampliación liviana con Metalcon 60 mm, reduciendo la carga sobre la losa y acelerando los tiempos de obra. Se incorporó un baño en suite completo con instalaciones nuevas conectadas al sistema existente.',
    materials: [
      'Estructura Metalcon 60 mm perfil C 0,85 mm',
      'Cubierta plancha zincalum AZ150 + aislación poliuretano',
      'Volcanita RH 12,5 mm (zonas húmedas) y ST 15 mm (seca)',
      'Porcelanato símil piedra 30 x 60 cm',
      'Ventanas termopanel PVC color negro',
    ],
    highlights: [
      'Duración: 38 días corridos',
      'Superficie ampliada: 34 m² útiles',
      'Estudio estructural certificado',
      'Baño en suite listo para usar',
    ],
    scope: [
      'Refuerzo estructural sobre losa',
      'Estructura Metalcon y cubierta',
      'Gasfitería caliente/fría y desagües',
      'Eléctrico, revestimientos y pintura',
    ],
  },
  {
    id: 'PRJ-004',
    title: 'Oficina Corporativa — Revestimientos y Seguridad',
    location: 'Las Condes, Santiago',
    year: 2023,
    area_m2: 210,
    category: 'Comercial',
    hero_image:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1600&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1600&auto=format&fit=crop',
    ],
    summary:
      'Habilitación completa de 210 m² de oficina: revestimientos premium, cerraduras biométricas, iluminación LED arquitectónica y cableado estructurado.',
    description:
      'Proyecto comercial integral ejecutado fuera de horario operativo para evitar interrupciones. Instalamos cerraduras biométricas en accesos críticos, iluminación LED regulable DALI y un sistema de cableado estructurado CAT6A para 30 puestos de trabajo.',
    materials: [
      'Paneles acústicos roble natural 240 x 60 cm',
      'Cerraduras biométricas Titanio (accesos restringidos)',
      'Luminarias LED arquitectónicas regulables DALI',
      'Alfombra modular pelo bajo 50 x 50 cm',
      'Cableado CAT6A + fibra óptica OM4',
    ],
    highlights: [
      'Duración: 28 días nocturnos',
      'Superficie: 210 m² habilitados',
      '30 puestos de trabajo certificados',
      'Trabajo fuera de horario, cero down time',
    ],
    scope: [
      'Desmontaje y retiro controlado',
      'Eléctrico, data y seguridad',
      'Revestimientos acústicos',
      'Iluminación arquitectónica',
      'Terminaciones y puesta en marcha',
    ],
  },
  {
    id: 'PRJ-005',
    title: 'Casa de Playa — Reforzamiento Estructural + Cerámicos',
    location: 'Algarrobo, Región de Valparaíso',
    year: 2023,
    area_m2: 96,
    category: 'Remodelación',
    hero_image:
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?q=80&w=1600&auto=format&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1600&auto=format&fit=crop',
    ],
    summary:
      'Refuerzo estructural con Metalcon 90 + reemplazo completo de revestimientos en casa de veraneo de 96 m² expuesta a ambiente salino.',
    description:
      'Casa costera con problemas de humedad y oxidación de estructura existente. Reforzamos con Metalcon 90 galvanizado G90, reemplazamos revestimientos por materiales resistentes al salitre y ejecutamos una membrana impermeabilizante bajo cubierta.',
    materials: [
      'Metalcon 90 mm galvanizado G90 reforzado',
      'Fibrocemento siding tratado anti-salitre',
      'Porcelanato exterior antideslizante',
      'Membrana asfáltica bajo cubierta',
      'Pintura epóxica en estructura metálica',
    ],
    highlights: [
      'Duración: 55 días corridos',
      'Superficie: 96 m² reforzados',
      'Resistencia a ambiente salino',
      'Garantía estructural 10 años',
    ],
    scope: [
      'Diagnóstico estructural',
      'Refuerzo Metalcon y anclajes',
      'Impermeabilización completa',
      'Revestimientos interior/exterior',
      'Pintura y terminaciones',
    ],
  },
];

export function getSeedProjects(): FabrickProject[] {
  return SEED_PROJECTS.map((p) => ({ ...p }));
}

/** Cache tag for the public projects list. Admin POST/PATCH/DELETE handlers
 *  must call `revalidateTag(PROJECTS_CACHE_TAG)` to invalidate immediately. */
export const PROJECTS_CACHE_TAG = 'projects:public';

/**
 * Project domain model + demonstrative fallback projects.
 *
 * The public `/proyectos` experience reads through `/api/proyectos`. Verified
 * database records win whenever the `projects` table has data. The seed list
 * below exists only so the public experience is not empty while that database
 * portfolio is unavailable; seed copy and imagery must therefore stay clearly
 * referential and must never claim execution, certification, delivery or
 * warranty by Soluciones Fabrick.
 */

export interface FabrickProject {
  id: string;
  title: string;
  location: string;
  year: number | string;
  area_m2: number;
  category: string;
  hero_image: string;
  gallery?: string[];
  summary: string;
  description: string;
  materials: string[];
  highlights: string[];
  scope: string[];
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
      'Referencia de vivienda residencial de aproximadamente 142 m² con estructura Metalcon y una propuesta de terminaciones contemporáneas.',
    description:
      'Ficha demostrativa para visualizar cómo podría organizarse una vivienda unifamiliar de dos pisos con estructura liviana, aislación térmica y terminaciones modernas. Las imágenes, ubicación, año, plazos y prestaciones son referenciales y deben validarse para cada proyecto real.',
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
      'Superficie referencial: 142 m² · 2 pisos',
      'Sistema estructural sugerido: Metalcon',
      'Envolvente térmica a definir según zona climática',
      'Terminaciones y especificaciones sujetas a evaluación técnica',
    ],
    scope: [
      'Excavación y radier armado',
      'Estructura Metalcon completa',
      'Gasfitería e instalación eléctrica',
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
      'Referencia de remodelación para un departamento de aproximadamente 78 m² con cocina abierta, renovación de revestimientos y actualización de instalaciones.',
    description:
      'Ejemplo conceptual de una remodelación integral orientada a redistribuir espacios, modernizar cocina y baño y renovar terminaciones e instalaciones. La solución definitiva depende del estado existente, normativa, presupuesto y levantamiento técnico de cada vivienda.',
    materials: [
      'Paneles Wall Panel PVC Mármol 8 mm (baño y cocina)',
      'Porcelanato gran formato 60 x 120 cm',
      'Muebles a medida MDF enchapado roble',
      'Cañería PPR agua caliente y fría',
      'Cableado eléctrico 2,5 mm² y 4 mm²',
      'Griferías monomando acabado black matte',
    ],
    highlights: [
      'Superficie referencial: 78 m²',
      'Redistribución interior como alternativa de diseño',
      'Renovación de instalaciones sujeta a diagnóstico',
      'Terminaciones configurables según presupuesto',
    ],
    scope: [
      'Demolición controlada y retiro de escombros',
      'Redistribución de tabiques',
      'Gasfitería e instalación eléctrica',
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
      'Referencia de ampliación liviana de aproximadamente 34 m² para incorporar dormitorio principal y baño en un segundo nivel.',
    description:
      'Ejemplo de cómo podría plantearse una ampliación sobre una estructura existente utilizando un sistema liviano. Cualquier solución real requiere revisar capacidad estructural, permisos, instalaciones y condiciones particulares del inmueble antes de definir materiales o dimensiones.',
    materials: [
      'Estructura Metalcon 60 mm perfil C 0,85 mm',
      'Cubierta plancha zincalum AZ150 + aislación poliuretano',
      'Volcanita RH 12,5 mm (zonas húmedas) y ST 15 mm (seca)',
      'Porcelanato símil piedra 30 x 60 cm',
      'Ventanas termopanel PVC color negro',
    ],
    highlights: [
      'Superficie referencial: 34 m²',
      'Sistema liviano como alternativa estructural',
      'Estudio estructural necesario antes de construir',
      'Baño en suite como programa de referencia',
    ],
    scope: [
      'Refuerzo estructural según cálculo',
      'Estructura liviana y cubierta',
      'Gasfitería, agua caliente/fría y desagües',
      'Instalación eléctrica, revestimientos y pintura',
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
      'Referencia para habilitación de oficina de aproximadamente 210 m² con revestimientos, iluminación, seguridad de acceso y cableado estructurado.',
    description:
      'Ficha demostrativa de una habilitación comercial que combina tratamiento acústico, iluminación arquitectónica, control de acceso y conectividad. La distribución, certificaciones, cantidad de puestos y especificaciones finales deben definirse según el local y sus requerimientos operativos.',
    materials: [
      'Paneles acústicos roble natural 240 x 60 cm',
      'Cerraduras biométricas para accesos restringidos',
      'Luminarias LED arquitectónicas regulables',
      'Alfombra modular pelo bajo 50 x 50 cm',
      'Cableado CAT6A + fibra óptica OM4',
    ],
    highlights: [
      'Superficie referencial: 210 m²',
      'Programa de oficina configurable',
      'Seguridad y conectividad como componentes opcionales',
      'Plan de trabajo a coordinar según operación del cliente',
    ],
    scope: [
      'Desmontaje y retiro controlado',
      'Instalación eléctrica, datos y seguridad',
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
      'Referencia de remodelación costera de aproximadamente 96 m² con foco en refuerzo, impermeabilización y materiales apropiados para ambiente salino.',
    description:
      'Ejemplo conceptual para estudiar una vivienda expuesta a humedad y salinidad. La estrategia real de reparación debe partir por un diagnóstico técnico del soporte existente y luego definir refuerzos, impermeabilización, revestimientos y protecciones compatibles con el entorno.',
    materials: [
      'Metalcon 90 mm galvanizado G90 reforzado',
      'Fibrocemento siding tratado para ambiente costero',
      'Porcelanato exterior antideslizante',
      'Membrana asfáltica bajo cubierta',
      'Pintura epóxica en estructura metálica',
    ],
    highlights: [
      'Superficie referencial: 96 m²',
      'Materiales sugeridos para ambiente costero',
      'Impermeabilización sujeta a diagnóstico del soporte',
      'Refuerzo estructural definido solo mediante evaluación técnica',
    ],
    scope: [
      'Diagnóstico estructural',
      'Refuerzo y anclajes según cálculo',
      'Impermeabilización',
      'Revestimientos interior/exterior',
      'Pintura y terminaciones',
    ],
  },
];

export function getSeedProjects(): FabrickProject[] {
  return SEED_PROJECTS.map((project) => ({
    ...project,
    gallery: project.gallery ? [...project.gallery] : undefined,
    materials: [...project.materials],
    highlights: [...project.highlights],
    scope: [...project.scope],
  }));
}

/** Cache tag for the public projects list. Admin POST/PATCH/DELETE handlers
 * must call `revalidateTag(PROJECTS_CACHE_TAG)` to invalidate immediately. */
export const PROJECTS_CACHE_TAG = 'projects:public';

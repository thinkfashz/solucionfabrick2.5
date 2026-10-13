export type RadierShape = 'rectangular' | 'l' | 'u' | 't' | 'h' | 'i';
export type RadierPlanId = 'materiales' | 'estandar' | 'reforzado';
export type RadierGradeId = 'g10' | 'g15' | 'g20' | 'g25' | 'g30';

/**
 * Dosificación por grado. El cemento por m³ es un valor REFERENCIAL de práctica
 * chilena en obra para hormigón hecho en sitio; la ficha técnica del saco y el
 * diseño del proyecto mandan. El mapeo uso→grado sigue la guía publicada por
 * Polpaico (G20 radieres y muros, G25 losas y vigas, G30 uso estructural).
 */
export const RADIER_CONCRETE_GRADES: Array<{
  id: RadierGradeId;
  label: string;
  use: string;
  cementKgPerM3: number;
  needsProfessionalReview: boolean;
}> = [
  { id: 'g10', label: 'G10 · Emparejar', use: 'Emplantillados y nivelación sin carga', cementKgPerM3: 200, needsProfessionalReview: false },
  { id: 'g15', label: 'G15 · Liviano', use: 'Radier liviano sin carga (quincho, terraza)', cementKgPerM3: 260, needsProfessionalReview: false },
  { id: 'g20', label: 'G20 · Radier vivienda', use: 'Radieres y muros de vivienda', cementKgPerM3: 320, needsProfessionalReview: false },
  { id: 'g25', label: 'G25 · Losa', use: 'Losas y vigas: exige revisión profesional', cementKgPerM3: 380, needsProfessionalReview: true },
  { id: 'g30', label: 'G30 · Estructural', use: 'Columnas, fundaciones y piscinas: exige cálculo profesional', cementKgPerM3: 420, needsProfessionalReview: true },
];

export function getRadierGrade(id: RadierGradeId | undefined) {
  return RADIER_CONCRETE_GRADES.find((grade) => grade.id === id) || RADIER_CONCRETE_GRADES[2];
}

export type RadierPlan = {
  id: RadierPlanId;
  name: string;
  label: string;
  description: string;
  includes: string[];
  excludes: string[];
  materialsM2: number;
  laborM2: number;
  extrasM2: number;
  extrasLabel: string;
  transportIncluded: boolean;
};

export type RadierInput = {
  length: number;
  width: number;
  thickness: number;
  baseDepth: number;
  gravelDepth: number;
  shape: RadierShape;
  /** Grado del hormigón. Si se omite, G20 (radier de vivienda). */
  gradeId?: RadierGradeId;
};

export const RADIER_PLANS: RadierPlan[] = [
  {
    id: 'materiales',
    name: 'Solo mano de obra',
    label: 'Tú aportas los materiales',
    description: 'Referencia para ejecutar el radier cuando ya tienes o comprarás por tu cuenta los materiales principales.',
    includes: [
      'Trazado y nivelación del área de trabajo',
      'Armado e instalación del moldaje y estacas',
      'Compactación e instalación de las capas aportadas',
      'Instalación de malla y barrera de humedad',
      'Hormigonado y terminación superficial seleccionada',
    ],
    excludes: [
      'Hormigón, cemento y áridos',
      'Malla ACMA y barrera de humedad',
      'Madera, estacas y otros materiales',
      'Despacho o transporte de materiales',
    ],
    // Precio comercial $18.000/m² final. 13126 + 2000 = 15126 pre-IVA → ×1,19 = $18.000/m².
    materialsM2: 0,
    laborM2: 13126,
    extrasM2: 2000,
    extrasLabel: 'Preparación / herramientas',
    transportIncluded: false,
  },
  {
    id: 'estandar',
    name: 'Mano de obra + materiales',
    label: 'Servicio completo',
    description: 'Referencia de ejecución estándar con materiales principales, preparación y mano de obra incluidos.',
    includes: [
      'Base compactada y gravilla calculadas',
      'Barrera de humedad',
      'Malla ACMA de refuerzo',
      'Hormigón y materiales principales',
      'Moldaje y estacas de 43 cm',
      'Mano de obra y terminación estándar',
      'Transporte referencial',
    ],
    excludes: [
      'Movimiento de tierra extraordinario',
      'Retiro masivo de escombros',
      'Bombeo, grúa o acceso especial no previsto',
      'Ingeniería estructural cuando corresponda',
    ],
    // Precio comercial $28.000/m² final. 10000 + 9000 + 2654 = 21654 pre-IVA → con transporte e IVA = $28.000/m².
    materialsM2: 10000,
    laborM2: 9000,
    extrasM2: 2654,
    extrasLabel: 'Preparación / extras',
    transportIncluded: true,
  },
  {
    id: 'reforzado',
    name: 'Completo reforzado',
    label: 'Mayor exigencia',
    description: 'Referencia para una ejecución con mayor provisión, preparación y refuerzo cuando el uso exige más revisión.',
    includes: [
      'Preparación reforzada de la base',
      'Materiales principales',
      'Mano de obra completa',
      'Refuerzo adicional',
      'Moldaje, estacas y terminación',
      'Transporte referencial',
    ],
    excludes: [
      'Fundaciones especiales o sobreexcavaciones',
      'Estudio de suelo o cálculo estructural',
      'Bombeo, maquinaria o accesos especiales no previstos',
    ],
    // Precio comercial $38.000/m² final. 15000 + 11000 + 4058 = 30058 pre-IVA → con transporte e IVA = $38.000/m².
    materialsM2: 15000,
    laborM2: 11000,
    extrasM2: 4058,
    extrasLabel: 'Preparación reforzada',
    transportIncluded: true,
  },
];

export const RADIER_SHAPES: Array<{ id: RadierShape; label: string; areaFactor: number; perimeterFactor: number }> = [
  { id: 'rectangular', label: 'Recto', areaFactor: 1, perimeterFactor: 1 },
  { id: 'l', label: 'Forma L', areaFactor: .82, perimeterFactor: 1.16 },
  { id: 'u', label: 'Forma U', areaFactor: .72, perimeterFactor: 1.34 },
  { id: 't', label: 'Forma T', areaFactor: .64, perimeterFactor: 1.3 },
  { id: 'h', label: 'Forma H', areaFactor: .68, perimeterFactor: 1.42 },
  { id: 'i', label: 'Forma I', areaFactor: .58, perimeterFactor: 1.38 },
];

const positive = (value: number, fallback: number) => Number.isFinite(value) && value > 0 ? value : fallback;

export function getRadierPlan(id: RadierPlanId) {
  return RADIER_PLANS.find((plan) => plan.id === id) || RADIER_PLANS[1];
}

export function calculateRadier(input: RadierInput) {
  const length = positive(input.length, 6);
  const width = positive(input.width, 4);
  const thickness = positive(input.thickness, 10);
  const baseDepth = positive(input.baseDepth, 10);
  const gravelDepth = positive(input.gravelDepth, 5);
  const shape = RADIER_SHAPES.find((item) => item.id === input.shape) || RADIER_SHAPES[0];
  const grade = getRadierGrade(input.gradeId);

  const area = length * width * shape.areaFactor;
  const perimeter = 2 * (length + width) * shape.perimeterFactor;
  // 5% por pérdida (sobreconsumo, derrame, sobre-espesor) según recomendación
  // publicada por Polpaico en su Cubicador. Es el estándar del fabricante,
  // no un margen propio.
  const concrete = area * (thickness / 100) * 1.05;
  const stabilized = area * (baseDepth / 100);
  const gravel = area * (gravelDepth / 100);
  // Cemento por grado: sacos = volumen × dosis / 25 kg. La dosis (kg/m³) es
  // referencial de práctica en obra; la ficha del saco y el proyecto mandan.
  // El rendimiento por saco se deriva de la misma dosis para no contradecirse.
  const mixYieldPerBagM3 = 25 / grade.cementKgPerM3;
  const cementBags25 = Math.ceil(concrete / mixYieldPerBagM3);
  // Áridos de referencia por volumen (mezcla en obra 4:8:9). No dependen del grado.
  const sand = concrete * (8 / 21) * 1.54;
  const mixGravel = concrete * (9 / 21) * 1.54;
  const mixerUsefulM3 = .13;
  const mixerBatches = Math.ceil(concrete / mixerUsefulM3);
  const truckCapacityM3 = 7;
  const mixerTrucks = Math.ceil(concrete / truckCapacityM3);
  const manualMixHours = Math.ceil(mixerBatches * 12 / 60);
  const pourHours = Math.max(4, Math.ceil(area / 5));
  const executionDaysFrom = Math.max(1, Math.ceil((area / 35) + .5));
  const executionDaysTo = Math.max(2, Math.ceil((area / 22) + 1));
  const meshSheets = Math.ceil(area / 13.5);
  const moistureBarrierM2 = area * 1.1;
  const stakes43cm = Math.max(4, Math.ceil(perimeter / 1.5));
  const formworkMeters = perimeter;

  const plans = RADIER_PLANS.map((plan) => {
    const materials = Math.round(area * plan.materialsM2);
    const labor = Math.round(area * plan.laborM2);
    const extras = Math.round(area * plan.extrasM2);
    const transport = plan.transportIncluded ? Math.max(45000, Math.round(area * 1500)) : 0;
    const subtotal = materials + labor + extras + transport;
    const tax = Math.round(subtotal * .19);
    const total = subtotal + tax;
    return {
      ...plan,
      materials,
      labor,
      extras,
      transport,
      subtotal,
      tax,
      total,
      referenceM2: Math.round(total / area),
    };
  });

  return {
    length,
    width,
    thickness,
    baseDepth,
    gravelDepth,
    shape,
    grade,
    area,
    perimeter,
    concrete,
    stabilized,
    gravel,
    cementBags25,
    cementBagCoverageM3: mixYieldPerBagM3,
    cementBagCoverageLiters: mixYieldPerBagM3 * 1000,
    sand,
    mixGravel,
    mixerUsefulM3,
    mixerBatches,
    mixerTrucks,
    truckCapacityM3,
    manualMixHours,
    pourHours,
    executionDaysFrom,
    executionDaysTo,
    meshSheets,
    moistureBarrierM2,
    stakes43cm,
    formworkMeters,
    plans,
  };
}

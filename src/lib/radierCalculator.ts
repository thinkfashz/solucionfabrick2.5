export type RadierShape = 'rectangular' | 'l' | 'u' | 't' | 'h' | 'i';
export type RadierPlanId = 'materiales' | 'estandar' | 'reforzado';

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
    materialsM2: 0,
    laborM2: 27000,
    extrasM2: 6000,
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
    materialsM2: 35000,
    laborM2: 27000,
    extrasM2: 10000,
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
    materialsM2: 43000,
    laborM2: 33000,
    extrasM2: 20000,
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

  const area = length * width * shape.areaFactor;
  const perimeter = 2 * (length + width) * shape.perimeterFactor;
  const concrete = area * (thickness / 100) * 1.08;
  const stabilized = area * (baseDepth / 100);
  const gravel = area * (gravelDepth / 100);
  const cementBags25 = Math.ceil(concrete * 7.2);
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
    area,
    perimeter,
    concrete,
    stabilized,
    gravel,
    cementBags25,
    meshSheets,
    moistureBarrierM2,
    stakes43cm,
    formworkMeters,
    plans,
  };
}

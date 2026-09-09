export type RadierShape = 'rectangular' | 'l' | 'u' | 't' | 'h' | 'i';
export type RadierPlanId = 'materiales' | 'estandar' | 'reforzado';

export type RadierPlan = {
  id: RadierPlanId;
  name: string;
  label: string;
  description: string;
  includes: string[];
  materialsM2: number;
  laborM2: number;
  extrasM2: number;
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
    name: 'Kit de materiales',
    label: 'Solo suministro',
    description: 'Para ejecutar con mano de obra propia y mantener una base de compra clara.',
    includes: ['Materiales calculados', 'Malla y capas de base', 'Moldaje de referencia', 'Transporte referencial'],
    materialsM2: 29000,
    laborM2: 0,
    extrasM2: 10000,
  },
  {
    id: 'estandar',
    name: 'Radier estándar',
    label: 'Recomendado',
    description: 'Preparación, hormigón, refuerzo y terminación para uso residencial habitual.',
    includes: ['Preparación de base', 'Materiales', 'Mano de obra', 'Malla de refuerzo', 'Terminación estándar', 'Transporte referencial'],
    materialsM2: 35000,
    laborM2: 27000,
    extrasM2: 10000,
  },
  {
    id: 'reforzado',
    name: 'Radier reforzado',
    label: 'Mayor exigencia',
    description: 'Más provisión y trabajo para cargas, tránsito o condiciones que requieren revisión adicional.',
    includes: ['Preparación reforzada', 'Materiales', 'Mano de obra', 'Refuerzo adicional', 'Terminación', 'Transporte referencial'],
    materialsM2: 43000,
    laborM2: 33000,
    extrasM2: 20000,
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
    const transport = Math.max(45000, Math.round(area * 1500));
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

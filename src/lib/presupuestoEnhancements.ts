/**
 * Presupuesto Enhancements — Análisis, desglose y visualización avanzada
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { QuoteLine, Totals } from './budgetMath';

/** Computes the per-line subtotal (qty × unit price) since QuoteLine doesn't store it. */
function lineTotal(line: QuoteLine): number {
  const qty = Math.max(0, line.quantity || 0);
  const price = Math.max(0, line.unitPrice || 0);
  return qty * price;
}

/**
 * Desglose por categoría de presupuesto
 */
export interface CategoryBreakdown {
  category: string;
  label: string;
  itemCount: number;
  subtotal: number;
  percentage: number;
  items: QuoteLine[];
}

/**
 * Análisis completo de presupuesto
 */
export interface QuotesAnalysis {
  totalItems: number;
  categories: CategoryBreakdown[];
  costPerUnit: number;
  averageLineValue: number;
  highestCategory: CategoryBreakdown;
  lowestCategory: CategoryBreakdown;
  costVariance: number;
}

/**
 * Comparativa de presupuestos
 */
export interface QuoteComparison {
  original: Totals;
  adjusted: Totals;
  savingsPercentage: number;
  savingsAmount: number;
  recommendation: string;
}

/**
 * Calcula desglose por categoría
 */
export function breakdownByCategory(
  lines: QuoteLine[],
  totals: Totals
): CategoryBreakdown[] {
  const map = new Map<string, { items: QuoteLine[]; subtotal: number }>();

  for (const line of lines) {
    const key = (line.category || 'servicios').toLowerCase();
    let entry = map.get(key);
    if (!entry) {
      entry = { items: [], subtotal: 0 };
      map.set(key, entry);
    }
    entry.items.push(line);
    entry.subtotal += lineTotal(line);
  }

  const CATEGORY_LABELS: Record<string, string> = {
    'obra-gruesa': 'Obra Gruesa',
    terminaciones: 'Terminaciones',
    especialidades: 'Especialidades',
    servicios: 'Servicios',
    electricidad: 'Electricidad',
    gasfiteria: 'Gasfitería',
    climatizacion: 'Climatización',
    conectividad: 'Conectividad',
    seguridad: 'Seguridad',
  };

  const breakdowns: CategoryBreakdown[] = Array.from(map.entries()).map(([cat, data]) => ({
    category: cat,
    label: CATEGORY_LABELS[cat] || toTitleCase(cat),
    itemCount: data.items.length,
    subtotal: data.subtotal,
    percentage: (data.subtotal / totals.itemsSubtotal) * 100,
    items: data.items,
  }));

  return breakdowns.sort((a, b) => b.subtotal - a.subtotal);
}

/**
 * Análisis completo de presupuesto
 */
export function analyzeQuote(lines: QuoteLine[], totals: Totals): QuotesAnalysis {
  const categories = breakdownByCategory(lines, totals);
  const averageLineValue = totals.itemsSubtotal / Math.max(1, lines.length);
  const costPerUnit = lines.length > 0 ? totals.itemsSubtotal / lines.length : 0;

  // Calcula varianza de costos
  const costs = lines.map((l) => lineTotal(l));
  const mean = costs.reduce((a, b) => a + b, 0) / Math.max(1, costs.length);
  const variance =
    Math.sqrt(costs.reduce((acc, cost) => acc + Math.pow(cost - mean, 2), 0) / Math.max(1, costs.length - 1)) ||
    0;

  return {
    totalItems: lines.length,
    categories,
    costPerUnit,
    averageLineValue,
    highestCategory: categories[0] || ({} as CategoryBreakdown),
    lowestCategory: categories[categories.length - 1] || ({} as CategoryBreakdown),
    costVariance: variance,
  };
}

/**
 * Calcula posibles ahorros y recomendaciones
 */
export function calculatePotentialSavings(
  lines: QuoteLine[],
  totals: Totals
): QuoteComparison {
  // Simula descuento por volumen o negociación
  const discountFactor = calculateOptimalDiscount(lines, totals);
  const savingsAmount = Math.round(totals.subtotal * discountFactor);

  const adjusted: Totals = {
    ...totals,
    subtotal: totals.subtotal - savingsAmount,
    iva: Math.round((totals.subtotal - savingsAmount) * totals.ivaRate),
    total: totals.subtotal - savingsAmount + Math.round((totals.subtotal - savingsAmount) * totals.ivaRate),
    itemCount: totals.itemCount,
    itemsSubtotal: totals.itemsSubtotal - savingsAmount,
  };

  const savingsPercentage = (savingsAmount / totals.subtotal) * 100;

  return {
    original: totals,
    adjusted,
    savingsPercentage,
    savingsAmount,
    recommendation: generateRecommendation(lines, totals, savingsAmount),
  };
}

/**
 * Calcula factor de descuento óptimo según análisis
 */
function calculateOptimalDiscount(lines: QuoteLine[], totals: Totals): number {
  const itemCount = lines.length;
  const highValueItems = lines.filter((l) => (lineTotal(l)) > totals.itemsSubtotal * 0.15).length;

  // Descuento base según cantidad
  let discount = 0;
  if (itemCount >= 20) discount = 0.15; // 15%
  else if (itemCount >= 10) discount = 0.1; // 10%
  else if (itemCount >= 5) discount = 0.05; // 5%

  // Ajuste por variabilidad
  const variance = analyzeQuote(lines, totals).costVariance;
  if (variance > totals.itemsSubtotal * 0.3) discount *= 1.2; // Más variabilidad = mayor descuento posible

  // Ajuste por items de alto valor
  if (highValueItems > itemCount * 0.3) discount *= 0.85;

  return Math.min(discount, 0.25); // Máximo 25% descuento
}

/**
 * Genera recomendación basada en análisis
 */
function generateRecommendation(lines: QuoteLine[], totals: Totals, potentialSavings: number): string {
  const itemCount = lines.length;
  const analysis = analyzeQuote(lines, totals);

  const recommendations: string[] = [];

  // Análisis por cantidad
  if (itemCount < 5) {
    recommendations.push('Presupuesto pequeño. Considere agregar más servicios para negociar mejores precios.');
  } else if (itemCount >= 20) {
    recommendations.push('Presupuesto amplio. Usted califica para descuentos por volumen significativos.');
  }

  // Análisis por categorías
  if (analysis.highestCategory.percentage > 60) {
    recommendations.push(
      `La categoría "${analysis.highestCategory.label}" representa más del 60% del presupuesto. Revise si hay alternativas.`
    );
  }

  // Análisis de varianza
  if (analysis.costVariance > totals.itemsSubtotal * 0.3) {
    recommendations.push('Hay alta variabilidad en costos de items. Algunos items podrían renegociarse.');
  }

  // Ahorros potenciales
  if (potentialSavings > 0) {
    recommendations.push(
      `Presupuesto optimizable: Potencial ahorro estimado de $${Math.round(potentialSavings).toLocaleString('es-CL')}`
    );
  }

  return recommendations.length > 0 ? recommendations[0] : 'Presupuesto bien estructurado.';
}

/**
 * Formatea título (primera letra mayúscula)
 */
function toTitleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Calcula índice de complejidad del presupuesto (0-100)
 */
export function calculateComplexityIndex(lines: QuoteLine[], totals: Totals): number {
  const analysis = analyzeQuote(lines, totals);

  let score = 0;
  const weights = {
    itemCount: 20, // Max 20 puntos
    categories: 20, // Max 20 puntos
    variance: 20, // Max 20 puntos
    concentration: 20, // Max 20 puntos
  };

  // Complejidad por cantidad
  score += Math.min((lines.length / 50) * weights.itemCount, weights.itemCount);

  // Complejidad por categorías
  score += Math.min((analysis.categories.length / 10) * weights.categories, weights.categories);

  // Complejidad por varianza
  score += Math.min((analysis.costVariance / (totals.itemsSubtotal * 0.5)) * weights.variance, weights.variance);

  // Complejidad por concentración
  const concentration = (analysis.highestCategory.percentage / 100) * 100;
  score += ((100 - concentration) / 100) * weights.concentration;

  return Math.round(score);
}

/**
 * Exporta presupuesto en formato CSV
 */
export function exportToCSV(
  lines: QuoteLine[],
  totals: Totals,
  customerName?: string,
  customerEmail?: string
): string {
  const headers = ['Categoría', 'Ítem', 'Unidad', 'Cantidad', 'Precio Unitario', 'Subtotal'];
  const rows: string[][] = [];

  // Agrupar por categoría
  const byCategory = new Map<string, QuoteLine[]>();
  for (const line of lines) {
    const key = line.category || 'servicios';
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(line);
  }

  // Construir filas
  for (const [category, items] of byCategory) {
    for (const item of items) {
      rows.push([
        category,
        item.name,
        item.unit ?? '—',
        item.quantity.toString(),
        `$${item.unitPrice.toLocaleString('es-CL')}`,
        `$${lineTotal(item).toLocaleString('es-CL')}`,
      ]);
    }
  }

  // Agregar totales
  rows.push([]);
  rows.push(['', '', '', '', 'Subtotal:', `$${totals.subtotal.toLocaleString('es-CL')}`]);
  rows.push(['', '', '', '', `IVA (${Math.round(totals.ivaRate * 100)}%):`, `$${totals.iva.toLocaleString('es-CL')}`]);
  rows.push(['', '', '', '', 'TOTAL:', `$${totals.total.toLocaleString('es-CL')}`]);

  // Información del cliente
  if (customerName || customerEmail) {
    rows.unshift([]);
    rows.unshift(['Cliente:', customerName || '—']);
    rows.unshift(['Email:', customerEmail || '—']);
  }

  // Convertir a CSV
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => (cell.includes(',') ? `"${cell}"` : cell)).join(',')
    ),
  ].join('\n');

  return csv;
}

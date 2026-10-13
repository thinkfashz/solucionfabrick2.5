'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { calculateRadier, getRadierGrade, RADIER_CONCRETE_GRADES, type RadierGradeId, type RadierShape } from '@/lib/radierCalculator';

const SHAPES: RadierShape[] = ['rectangular', 'l', 'u', 't', 'h', 'i'];
const GRADE_IDS = RADIER_CONCRETE_GRADES.map((grade) => grade.id);

/** Resultado completo del cálculo con las medidas ya sanitizadas. */
export type RadierQuote = ReturnType<typeof calculateRadier>;

function num(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function shapeOf(value: string | null): RadierShape {
  return SHAPES.includes(value as RadierShape) ? (value as RadierShape) : 'rectangular';
}

function gradeOf(value: string | null): RadierGradeId {
  return (GRADE_IDS as string[]).includes(value || '') ? (value as RadierGradeId) : 'g20';
}

/** Medidas como fuente única, en la URL para que el presupuesto sea compartible por link. */
export function useRadierQuote() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const input = useMemo(() => ({
    length: num(params.get('largo'), 6),
    width: num(params.get('ancho'), 4),
    thickness: num(params.get('espesor'), 10),
    baseDepth: num(params.get('base'), 10),
    gravelDepth: num(params.get('gravilla'), 5),
    shape: shapeOf(params.get('forma')),
    gradeId: gradeOf(params.get('grado')),
  }), [params]);

  const result = useMemo(() => calculateRadier(input), [input]);

  const set = useCallback((patch: Partial<typeof input>) => {
    const next = new URLSearchParams(params.toString());
    const merged = { ...input, ...patch };
    next.set('largo', String(merged.length));
    next.set('ancho', String(merged.width));
    next.set('espesor', String(merged.thickness));
    next.set('base', String(merged.baseDepth));
    next.set('gravilla', String(merged.gravelDepth));
    next.set('forma', merged.shape);
    next.set('grado', merged.gradeId);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [input, params, pathname, router]);

  const grade = getRadierGrade(input.gradeId);
  const bagsPerM3 = result.concrete > 0 ? result.cementBags25 / result.concrete : 0;

  return { input, result, set, grade, bagsPerM3 };
}

/** Resumen de una línea, listo para pegar en WhatsApp o en el CRM. */
export function radierSummaryLine(result: RadierQuote) {
  const plan = result.plans.find((p) => p.id === 'estandar') || result.plans[1];
  const gradeLabel = result.grade.id.toUpperCase();
  return `Radier ${result.length}×${result.width} m (${result.area.toLocaleString('es-CL', { maximumFractionDigits: 1 })} m²) ${gradeLabel} · espesor ${result.thickness} cm · hormigón ${result.concrete.toLocaleString('es-CL', { maximumFractionDigits: 2 })} m³ (${result.cementBags25} sacos) · total referencial ${plan ? `$${plan.total.toLocaleString('es-CL')}` : '—'}`;
}

const STORAGE_KEY = 'fabrick-radier-unlocked';

/** Si este presupuesto ya fue desbloqueado en este navegador. */
export function isRadierUnlocked(result: RadierQuote) {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === radierSummaryLine(result);
  } catch { return false; }
}

/** Marca un presupuesto como desbloqueado en este navegador. */
export function markRadierUnlocked(result: RadierQuote) {
  try { window.localStorage.setItem(STORAGE_KEY, radierSummaryLine(result)); } catch { /* privado */ }
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Builds a product page meta description.
 * Use `verb = 'Compra'` for direct-purchase pages and `verb = 'Descubre'` for detail pages.
 */
export function buildProductMetaDescription(name: string, verb = 'Compra'): string {
  return `${verb} ${name} en Soluciones Fabrick. Materiales premium para construcción y remodelación en la Región del Maule, Chile.`;
}

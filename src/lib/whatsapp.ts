/**
 * WhatsApp link helper for Soluciones Fabrick.
 *
 * Centraliza el número y el mensaje por defecto. El valor real se toma de
 * NEXT_PUBLIC_WHATSAPP_NUMBER (dígitos, sin "+" ni espacios) y, si no está
 * definido, se usa el fallback de la cuenta operativa: 56930121625.
 *
 * Uso:
 *   import { buildWhatsAppLink, DEFAULT_WHATSAPP_MESSAGE } from '@/lib/whatsapp';
 *   const href = buildWhatsAppLink('Hola, quiero agendar una visita en Linares');
 */

const FALLBACK_NUMBER = '56930121625';

export const DEFAULT_WHATSAPP_MESSAGE =
  'Hola Soluciones Fabrick, quiero agendar una visita en Linares (Región del Maule) para que pasen a evaluar mi proyecto y armar el presupuesto.';

export function getWhatsAppNumber(): string {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || FALLBACK_NUMBER;
  return raw.replace(/[^\d]/g, '');
}

export function buildWhatsAppLink(message: string = DEFAULT_WHATSAPP_MESSAGE): string {
  return `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_DISPLAY = '+56 9 3012 1625';

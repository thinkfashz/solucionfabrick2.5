/**
 * Translate Mercado Pago `status_detail` codes into user-facing Spanish copy.
 *
 * Reference: https://www.mercadopago.cl/developers/es/docs/checkout-api/response-handling/status
 *
 * This is intentionally pure (no I/O) so it can be unit-tested without booting
 * the Next.js runtime, and re-used both server-side (API route response copy)
 * and client-side (rejection panel) without bundling SDK code.
 */
const STATUS_DETAIL_MESSAGES: Record<string, string> = {
  // ── Aprobaciones / pendientes ────────────────────────────────────────────
  accredited: 'Pago aprobado. ¡Listo!',
  pending_contingency:
    'Estamos procesando tu pago. Te avisaremos por email cuando se acredite.',
  pending_review_manual:
    'Estamos revisando tu pago. Te avisaremos por email cuando se acredite.',

  // ── Rechazos por datos de la tarjeta ─────────────────────────────────────
  cc_rejected_bad_filled_card_number:
    'Revisa el número de la tarjeta: parece estar incompleto o con errores.',
  cc_rejected_bad_filled_date:
    'Revisa la fecha de vencimiento de la tarjeta.',
  cc_rejected_bad_filled_other:
    'Revisa los datos de la tarjeta e intenta nuevamente.',
  cc_rejected_bad_filled_security_code:
    'El código de seguridad (CVV) de la tarjeta es incorrecto.',
  cc_rejected_invalid_installments:
    'El número de cuotas no está disponible para esta tarjeta. Prueba con otra opción.',

  // ── Rechazos por límites / saldo ────────────────────────────────────────
  cc_rejected_insufficient_amount:
    'La tarjeta no tiene saldo suficiente para esta compra.',
  cc_rejected_max_attempts:
    'Alcanzaste el máximo de intentos permitidos. Intenta con otra tarjeta.',
  cc_rejected_high_risk:
    'Tu pago fue rechazado por seguridad. Prueba con otra tarjeta o usa transferencia bancaria.',

  // ── Rechazos por banco / autenticación ──────────────────────────────────
  cc_rejected_call_for_authorize:
    'Tu banco necesita que autorices el pago. Llámalos al teléfono que aparece al dorso de la tarjeta y vuelve a intentar.',
  cc_rejected_other_reason:
    'Tu banco rechazó el pago. Intenta con otra tarjeta o usa transferencia bancaria.',
  cc_rejected_card_disabled:
    'La tarjeta está deshabilitada. Comunícate con tu banco.',
  cc_rejected_duplicated_payment:
    'Ya habíamos registrado un pago idéntico. Revisa tus emails — si no recibiste confirmación, intenta de nuevo en unos minutos.',
  cc_rejected_card_error:
    'No pudimos procesar la tarjeta. Verifica los datos o usa otra tarjeta.',
  cc_rejected_blacklist:
    'La tarjeta no está autorizada para este pago.',

  // ── Sandbox / pruebas ────────────────────────────────────────────────────
  cc_rejected_3ds_challenge:
    'Tu banco solicitó verificación adicional. Vuelve a intentar y completa el desafío de seguridad.',
};

const MP_STATUS_DETAIL_FALLBACK_MESSAGE =
  'No pudimos procesar tu pago. Intenta con otra tarjeta o usa transferencia bancaria.';

export function mapMercadoPagoStatusDetail(detail?: string | null): string {
  if (!detail) return MP_STATUS_DETAIL_FALLBACK_MESSAGE;
  return STATUS_DETAIL_MESSAGES[detail] ?? MP_STATUS_DETAIL_FALLBACK_MESSAGE;
}

export const MP_STATUS_DETAIL_FALLBACK = MP_STATUS_DETAIL_FALLBACK_MESSAGE;

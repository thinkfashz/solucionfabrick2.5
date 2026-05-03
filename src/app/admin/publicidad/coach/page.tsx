import type { Metadata } from 'next';
import AdsCoachClient from './AdsCoachClient';

export const metadata: Metadata = {
  title: 'Coach de campañas · Admin Fabrick',
  robots: { index: false, follow: false },
};

/**
 * /admin/publicidad/coach — Agente IA para auditar y generar campañas.
 *
 * Usa el endpoint POST /api/admin/ads/agent (a implementar en PR
 * siguiente) que recibe { action: 'analyze'|'suggest'|'create'|'optimize',
 * campaignId? } y persiste la respuesta en `ads_agent_runs`.
 *
 * Esta página es el andamiaje de UI; no requiere todavía el endpoint
 * — al pulsar "Analizar" devuelve un mensaje claro de "endpoint
 * pendiente".
 */
export default function AdminAdsCoachPage() {
  return <AdsCoachClient />;
}

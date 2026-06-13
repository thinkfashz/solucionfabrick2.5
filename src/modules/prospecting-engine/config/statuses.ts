import type { ProspectProbabilityLevel, ProspectStatus } from '../types/prospect.types';

export const PROSPECT_STATUSES: ProspectStatus[] = [
  'nuevo',
  'analizado',
  'demo_generada',
  'contactado',
  'respondio',
  'interesado',
  'cliente',
  'rechazado',
  'archivado',
];

export const PROSPECT_PROBABILITY_LEVELS: ProspectProbabilityLevel[] = ['alta', 'media', 'baja'];

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  nuevo: 'Nuevo',
  analizado: 'Analizado',
  demo_generada: 'Demo generada',
  contactado: 'Contactado',
  respondio: 'Respondió',
  interesado: 'Interesado',
  cliente: 'Cliente',
  rechazado: 'Rechazado',
  archivado: 'Archivado',
};

export const PROSPECT_PROBABILITY_LABELS: Record<ProspectProbabilityLevel, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export function normalizeProspectStatus(value: unknown): ProspectStatus {
  const status = String(value || 'nuevo').trim().toLowerCase().replace(/í/g, 'i') as ProspectStatus;
  return PROSPECT_STATUSES.includes(status) ? status : 'nuevo';
}

export function normalizeProbability(value: unknown): ProspectProbabilityLevel {
  const level = String(value || 'media').trim().toLowerCase() as ProspectProbabilityLevel;
  return PROSPECT_PROBABILITY_LEVELS.includes(level) ? level : 'media';
}

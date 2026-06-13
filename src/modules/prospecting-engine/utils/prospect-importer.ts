import { normalizeProbability, normalizeProspectStatus } from '../config/statuses';
import type { ProspectImportPayload, ProspectInput } from '../types/prospect.types';

function text(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return fallback;
}

function numberOr(value: unknown, fallback = 50): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function makeProspectId(prefix = 'prospect'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36).slice(-6)}`;
}

export function normalizeProspectInput(input: unknown, defaults: Partial<ProspectInput> = {}): ProspectInput | null {
  const item = object(input);
  const brand = text(item.brand || item.name || item.nombre || item.business || item.company || item.empresa || defaults.brand);
  if (!brand || brand.length < 2) return null;

  const metadata = object(item.metadata);
  return {
    id: text(item.id || defaults.id) || makeProspectId(),
    brand: brand.slice(0, 180),
    client_name: text(item.client_name || item.client || item.contact || item.contacto || defaults.client_name).slice(0, 180),
    industry: text(item.industry || item.rubro || item.niche || item.nicho || defaults.industry).slice(0, 120),
    city: text(item.city || item.ciudad || defaults.city).slice(0, 120),
    region: text(item.region || defaults.region).slice(0, 120),
    country: text(item.country || item.pais || defaults.country || 'Chile').slice(0, 80),
    instagram: text(item.instagram || item.ig || defaults.instagram).slice(0, 260),
    facebook: text(item.facebook || item.fb || defaults.facebook).slice(0, 260),
    website: text(item.website || item.web || item.url || defaults.website).slice(0, 260),
    whatsapp: text(item.whatsapp || item.phone || item.telefono || defaults.whatsapp).slice(0, 80),
    email: text(item.email || item.correo || defaults.email).slice(0, 160),
    followers: text(item.followers || item.seguidores || defaults.followers).slice(0, 80),
    rating: text(item.rating || item.calificacion || defaults.rating).slice(0, 80),
    source: text(item.source || item.fuente || defaults.source || 'chatgpt').slice(0, 80),
    problem_detected: text(item.problem_detected || item.problem || item.problema || item.dolor || defaults.problem_detected).slice(0, 1200),
    opportunity: text(item.opportunity || item.oportunidad || item.solution || item.solucion || defaults.opportunity).slice(0, 1200),
    probability_level: normalizeProbability(item.probability_level || item.probabilidad || item.probability || defaults.probability_level),
    score: numberOr(item.score || item.puntaje || item.opportunity_score || defaults.score, 50),
    status: normalizeProspectStatus(item.status || item.estado || defaults.status || 'nuevo'),
    notes: text(item.notes || item.notas || item.observaciones || defaults.notes).slice(0, 1600),
    metadata: {
      ...metadata,
      raw_import: item,
    },
  };
}

export function parseProspectImportPayload(raw: unknown): ProspectImportPayload {
  let value = raw;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    try {
      value = JSON.parse(trimmed);
    } catch {
      value = { prospects: [] };
    }
  }

  if (Array.isArray(value)) return { source: 'chatgpt', prospects: value.map((item) => normalizeProspectInput(item)).filter(Boolean) as ProspectInput[] };

  const root = object(value);
  const list = Array.isArray(root.prospects) ? root.prospects : Array.isArray(root.items) ? root.items : Array.isArray(root.data) ? root.data : [];
  const defaults: Partial<ProspectInput> = {
    source: text(root.source || root.fuente || 'chatgpt'),
    city: text(root.city || root.ciudad),
    industry: text(root.industry || root.rubro || root.niche || root.nicho),
  };

  return {
    source: defaults.source,
    city: defaults.city,
    industry: defaults.industry,
    prospects: list.map((item) => normalizeProspectInput(item, defaults)).filter(Boolean) as ProspectInput[],
  };
}

export function toDbProspectRow(input: ProspectInput) {
  const now = new Date().toISOString();
  return {
    id: input.id || makeProspectId(),
    brand: input.brand,
    client_name: input.client_name || null,
    industry: input.industry || null,
    city: input.city || null,
    region: input.region || null,
    country: input.country || 'Chile',
    instagram: input.instagram || null,
    facebook: input.facebook || null,
    website: input.website || null,
    whatsapp: input.whatsapp || null,
    email: input.email || null,
    followers: input.followers || null,
    rating: input.rating || null,
    source: input.source || 'chatgpt',
    problem_detected: input.problem_detected || null,
    opportunity: input.opportunity || null,
    probability_level: input.probability_level || 'media',
    score: typeof input.score === 'number' ? input.score : 50,
    status: input.status || 'nuevo',
    notes: input.notes || null,
    metadata: input.metadata || {},
    updated_at: now,
  };
}

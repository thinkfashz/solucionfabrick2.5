export type ProspectProbabilityLevel = 'alta' | 'media' | 'baja';

export type ProspectStatus =
  | 'nuevo'
  | 'analizado'
  | 'demo_generada'
  | 'contactado'
  | 'respondio'
  | 'interesado'
  | 'cliente'
  | 'rechazado'
  | 'archivado';

export interface ProspectRecord {
  id: string;
  brand: string;
  client_name?: string | null;
  industry?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  website?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  followers?: string | null;
  rating?: string | null;
  source?: string | null;
  problem_detected?: string | null;
  opportunity?: string | null;
  probability_level?: ProspectProbabilityLevel | null;
  score?: number | null;
  status?: ProspectStatus | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProspectInput {
  id?: string;
  brand: string;
  client_name?: string;
  industry?: string;
  city?: string;
  region?: string;
  country?: string;
  instagram?: string;
  facebook?: string;
  website?: string;
  whatsapp?: string;
  email?: string;
  followers?: string;
  rating?: string;
  source?: string;
  problem_detected?: string;
  opportunity?: string;
  probability_level?: ProspectProbabilityLevel;
  score?: number;
  status?: ProspectStatus;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface ProspectImportPayload {
  source?: string;
  city?: string;
  industry?: string;
  prospects: ProspectInput[];
}

export interface ProspectImportResult {
  ok: boolean;
  imported: number;
  skipped: number;
  errors: Array<{ index: number; error: string }>;
  prospects: ProspectRecord[];
}

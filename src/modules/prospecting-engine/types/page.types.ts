import type { AiProviderId } from './ai.types';
import type { ProspectRecord } from './prospect.types';

export type LandingTone = 'premium' | 'minimalista' | 'corporativo' | 'emocional' | 'directo' | 'lujoso' | 'tecnico';

export interface LandingGenerationRequest {
  provider?: AiProviderId;
  model?: string;
  prospect_id?: string;
  prospect?: Partial<ProspectRecord>;
  niche?: string;
  tone?: LandingTone | string;
  goal?: string;
  prompt?: string;
  images?: string[];
  save?: boolean;
  expires_in_hours?: number;
  never_expire?: boolean;
}

export interface GeneratedLandingSection {
  id: string;
  name: string;
  purpose: string;
}

export interface GeneratedLandingDraft {
  title: string;
  html: string;
  css: string;
  js: string;
  shareTitle: string;
  shareDescription: string;
  whatsappMessage: string;
  emailSubject: string;
  emailBody: string;
  sections: GeneratedLandingSection[];
  reasoning: string;
}

export interface SavedGeneratedLanding {
  token: string;
  public_url: string;
  expires_at?: string | null;
  never_expire?: boolean;
}

export interface LandingGenerationResponse {
  ok: boolean;
  draft: GeneratedLandingDraft;
  saved?: SavedGeneratedLanding;
  provider: AiProviderId;
  model?: string;
}

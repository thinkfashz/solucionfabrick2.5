import type { AiProviderId } from './ai.types';

export interface EditableSection {
  id: string;
  label: string;
  type: 'block' | 'editable' | 'heading' | 'paragraph' | 'button' | 'image' | 'unknown';
  selector: string;
  html: string;
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface SectionImproveRequest {
  provider?: AiProviderId;
  model?: string;
  fullHtml: string;
  sectionId?: string;
  sectionHtml?: string;
  instruction: string;
  prospectContext?: Record<string, unknown>;
  preserveLayout?: boolean;
}

export interface SectionImproveResponse {
  ok: boolean;
  provider: AiProviderId;
  model?: string;
  section: EditableSection;
  improvedHtml: string;
  updatedFullHtml: string;
  summary: string;
  warnings: string[];
}

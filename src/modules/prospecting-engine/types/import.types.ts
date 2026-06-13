import type { AiProviderId } from './ai.types';
import type { ProspectInput } from './prospect.types';

export type LocalImportMode = 'local' | 'hybrid-ai';
export type LocalImportSourceType = 'json' | 'html' | 'text' | 'unknown';

export interface LocalImportOptions {
  aiEnabled?: boolean;
  provider?: AiProviderId;
  model?: string;
  sourceName?: string;
}

export interface LocalDetectedProspect extends ProspectInput {
  local_id: string;
  confidence: number;
  detected_from: LocalImportSourceType;
  raw_block?: string;
  selected?: boolean;
}

export interface LocalImportDetectionResult {
  ok: boolean;
  mode: LocalImportMode;
  sourceType: LocalImportSourceType;
  sourceName?: string;
  prospects: LocalDetectedProspect[];
  warnings: string[];
  aiUsed?: boolean;
  aiMessage?: string;
}

export interface AiEnhanceImportRequest {
  provider?: AiProviderId;
  model?: string;
  sourceName?: string;
  sourceType?: LocalImportSourceType;
  rawText?: string;
  localProspects: LocalDetectedProspect[];
}

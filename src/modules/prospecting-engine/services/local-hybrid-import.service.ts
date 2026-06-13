import type { AiProviderId } from '../types/ai.types';
import type { AiEnhanceImportRequest, LocalImportDetectionResult } from '../types/import.types';
import { detectLocalProspects } from '../utils/local-prospect-detector';

async function readJson(res: Response) {
  return res.json().catch(() => ({}));
}

export async function detectHybridProspects(params: {
  rawText: string;
  sourceName?: string;
  aiEnabled?: boolean;
  provider?: AiProviderId;
  model?: string;
}): Promise<LocalImportDetectionResult> {
  const local = detectLocalProspects(params.rawText, params.sourceName || '');
  if (!params.aiEnabled || !local.prospects.length) return local;

  const payload: AiEnhanceImportRequest = {
    provider: params.provider,
    model: params.model,
    sourceName: params.sourceName,
    sourceType: local.sourceType,
    rawText: params.rawText,
    localProspects: local.prospects,
  };

  const res = await fetch('/api/admin/prospecting/import/enhance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await readJson(res);
  if (!res.ok) {
    return {
      ...local,
      warnings: [...local.warnings, json.error || 'La IA no pudo mejorar la importación. Se mantiene modo local.'],
      aiUsed: false,
      aiMessage: 'IA no disponible, modo local activo.',
    };
  }
  return json as LocalImportDetectionResult;
}

export async function readLocalProspectFile(file: File): Promise<{ rawText: string; sourceName: string }> {
  return { rawText: await file.text(), sourceName: file.name };
}

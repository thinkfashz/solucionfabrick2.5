import 'server-only';
import { defaultModelForProvider, isAiProviderId } from '../config/providers';
import { buildEnhanceImportedProspectsPrompt } from '../prompts/enhance-imported-prospects.prompt';
import type { AiProviderId } from '../types/ai.types';
import type { AiEnhanceImportRequest, LocalDetectedProspect } from '../types/import.types';
import { parseProspectImportPayload } from '../utils/prospect-importer';
import { getAiCredentials } from './ai-integration.server';
import { runAiTextGeneration } from './ai-provider.server';

export async function enhanceImportedProspectsWithAi(request: AiEnhanceImportRequest) {
  const providerRaw = String(request.provider || 'openai').trim();
  if (!isAiProviderId(providerRaw)) throw new Error('Proveedor IA no permitido.');
  const provider = providerRaw as AiProviderId;
  if (provider === 'serpapi' || provider === 'apify') throw new Error('Este proveedor no mejora prospectos con IA. Usa OpenAI, Gemini, OpenRouter o Groq.');

  const credentials = await getAiCredentials(provider);
  if (!credentials) throw new Error(`No hay credenciales guardadas para ${provider}. Usa modo local o configura integraciones IA.`);

  const model = request.model || (typeof credentials.model === 'string' ? credentials.model : defaultModelForProvider(provider));
  const prompt = buildEnhanceImportedProspectsPrompt({
    sourceName: request.sourceName,
    rawText: request.rawText,
    localProspects: request.localProspects || [],
  });

  const ai = await runAiTextGeneration({
    provider,
    credentials: { ...credentials, model },
    model,
    prompt,
    system: 'Responde sólo JSON válido. Eres un normalizador de prospectos comerciales.',
    temperature: 0.2,
    maxTokens: 5000,
  });

  const parsed = parseProspectImportPayload(ai.text);
  const enhanced = parsed.prospects.map((prospect, index) => ({
    ...request.localProspects[index],
    ...prospect,
    local_id: request.localProspects[index]?.local_id || `ai_${index}`,
    confidence: Math.max(request.localProspects[index]?.confidence || 70, 88),
    detected_from: request.localProspects[index]?.detected_from || request.sourceType || 'text',
    selected: true,
    metadata: {
      ...(request.localProspects[index]?.metadata || {}),
      ...(prospect.metadata || {}),
      ai_enhanced: true,
      ai_provider: provider,
      ai_model: ai.model,
    },
  })) as LocalDetectedProspect[];

  return {
    ok: enhanced.length > 0,
    mode: 'hybrid-ai' as const,
    sourceType: request.sourceType || 'unknown',
    sourceName: request.sourceName,
    prospects: enhanced,
    warnings: enhanced.length ? [] : ['La IA no devolvió prospectos válidos.'],
    aiUsed: true,
    aiMessage: `Prospectos normalizados con ${provider} · ${ai.model}`,
  };
}

import 'server-only';
import { insforgeAdmin } from '@/lib/insforge';
import { buildGenerateLandingPrompt } from '../prompts/generate-landing.prompt';
import { defaultModelForProvider, isAiProviderId } from '../config/providers';
import type { AiProviderId } from '../types/ai.types';
import type { GeneratedLandingDraft, LandingGenerationRequest, LandingGenerationResponse } from '../types/page.types';
import type { ProspectRecord } from '../types/prospect.types';
import { parseGeneratedLanding } from '../utils/generated-page-parser';
import { getAiCredentials } from './ai-integration.server';
import { runAiTextGeneration } from './ai-provider.server';
import { saveGeneratedLanding } from './page-document.server';
import type { NextRequest } from 'next/server';

function serializeDbError(error: unknown) {
  if (!error || typeof error !== 'object') return String(error || 'Error desconocido');
  const e = error as { message?: string; code?: string; details?: string; hint?: string };
  return [e.message, e.code, e.details, e.hint].filter(Boolean).join(' · ') || 'Error de base de datos';
}

async function loadProspect(prospectId?: string): Promise<Partial<ProspectRecord>> {
  if (!prospectId) return {};
  const { data, error } = await insforgeAdmin.database.from('prospects').select('*').eq('id', prospectId).limit(1);
  if (error) throw new Error(`No se pudo cargar el prospecto: ${serializeDbError(error)}`);
  if (!Array.isArray(data) || data.length === 0) throw new Error('El prospecto no existe en base de datos.');
  return data[0] as ProspectRecord;
}

function mergeProspect(dbProspect: Partial<ProspectRecord>, requestProspect: Partial<ProspectRecord> | undefined): Partial<ProspectRecord> {
  return { ...dbProspect, ...(requestProspect || {}) };
}

export async function generateLandingWithAi(request: LandingGenerationRequest, nextRequest?: NextRequest): Promise<LandingGenerationResponse> {
  const providerRaw = String(request.provider || 'openai').trim();
  if (!isAiProviderId(providerRaw)) throw new Error('Proveedor IA no permitido para generación.');
  const provider = providerRaw as AiProviderId;

  if (provider === 'serpapi' || provider === 'apify') {
    throw new Error('Este proveedor es de búsqueda/automatización y no genera landings HTML. Usa OpenAI, Gemini, OpenRouter o Groq.');
  }

  const credentials = await getAiCredentials(provider);
  if (!credentials) throw new Error(`No hay credenciales guardadas para ${provider}. Ve al módulo de integraciones IA.`);

  const dbProspect = await loadProspect(request.prospect_id);
  const prospect = mergeProspect(dbProspect, request.prospect);
  if (!prospect.brand || String(prospect.brand).trim().length < 2) throw new Error('Falta nombre/marca del prospecto para generar la landing.');

  const prompt = buildGenerateLandingPrompt(request, prospect);
  const model = request.model || (typeof credentials.model === 'string' ? credentials.model : defaultModelForProvider(provider));

  const ai = await runAiTextGeneration({
    provider,
    credentials: { ...credentials, model },
    model,
    prompt,
    system: 'Responde sólo JSON válido para un generador de landing pages comerciales. No uses markdown.',
    temperature: 0.35,
    maxTokens: 6500,
  });

  const draft: GeneratedLandingDraft = parseGeneratedLanding(ai.text);
  const response: LandingGenerationResponse = { ok: true, draft, provider, model: ai.model };

  if (request.save) {
    response.saved = await saveGeneratedLanding({ draft, request, prospect, provider, model: ai.model, nextRequest });
  }

  return response;
}

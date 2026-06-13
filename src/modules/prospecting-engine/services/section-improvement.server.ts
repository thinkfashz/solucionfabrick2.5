import 'server-only';
import { defaultModelForProvider, isAiProviderId } from '../config/providers';
import { buildImproveSectionPrompt } from '../prompts/improve-section.prompt';
import type { AiProviderId } from '../types/ai.types';
import type { SectionImproveRequest, SectionImproveResponse } from '../types/section.types';
import { getEditableSection, replaceEditableSection } from '../utils/html-section-detector';
import { parseImprovedSection } from '../utils/improved-section-parser';
import { getAiCredentials } from './ai-integration.server';
import { runAiTextGeneration } from './ai-provider.server';

export async function improveHtmlSection(request: SectionImproveRequest): Promise<SectionImproveResponse> {
  const providerRaw = String(request.provider || 'openai').trim();
  if (!isAiProviderId(providerRaw)) throw new Error('Proveedor IA no permitido.');
  const provider = providerRaw as AiProviderId;
  if (provider === 'serpapi' || provider === 'apify') throw new Error('Este proveedor no edita secciones HTML. Usa OpenAI, Gemini, OpenRouter o Groq.');

  if (!request.fullHtml || request.fullHtml.length < 20) throw new Error('Falta HTML completo para editar.');
  if (!request.instruction || request.instruction.trim().length < 3) throw new Error('Falta instrucción para mejorar la sección.');

  const section = getEditableSection(request.fullHtml, request.sectionId, request.sectionHtml);
  if (!section) throw new Error('No se detectó ninguna sección editable en el HTML.');

  const credentials = await getAiCredentials(provider);
  if (!credentials) throw new Error(`No hay credenciales guardadas para ${provider}.`);
  const model = request.model || (typeof credentials.model === 'string' ? credentials.model : defaultModelForProvider(provider));
  const prompt = buildImproveSectionPrompt(request, section);

  const ai = await runAiTextGeneration({
    provider,
    credentials: { ...credentials, model },
    model,
    prompt,
    system: 'Responde sólo JSON válido. Edita únicamente la sección HTML seleccionada.',
    temperature: 0.25,
    maxTokens: 3500,
  });

  const parsed = parseImprovedSection(ai.text);
  if (!parsed.improvedHtml || parsed.improvedHtml.length < 5) throw new Error('La IA no devolvió HTML de reemplazo útil.');
  const updatedFullHtml = replaceEditableSection(request.fullHtml, section, parsed.improvedHtml);

  return {
    ok: true,
    provider,
    model: ai.model,
    section,
    improvedHtml: parsed.improvedHtml,
    updatedFullHtml,
    summary: parsed.summary,
    warnings: parsed.warnings,
  };
}

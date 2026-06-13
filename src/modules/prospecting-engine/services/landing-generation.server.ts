import 'server-only';
import { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { buildGenerateLandingPrompt } from '../prompts/generate-landing.prompt';
import { getAiProvider, isAiProviderId } from '../config/providers';
import { getAiCredentials } from './ai-integration.server';
import { generateAiText } from './ai-client.server';
import { parseGeneratedLanding } from '../utils/generated-page-parser';
import type { AiProviderId } from '../types/ai.types';
import type { LandingGenerationRequest, LandingGenerationResponse } from '../types/page.types';
import type { ProspectRecord } from '../types/prospect.types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

function makeToken() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-6);
}

function publicUrl(token: string, request?: NextRequest) {
  if (SITE_URL.trim()) return `${SITE_URL.replace(/\/+$/, '')}/w/${token}`;
  return request ? `${request.nextUrl.origin}/w/${token}` : `/w/${token}`;
}

function serializeDbError(error: unknown) {
  if (!error || typeof error !== 'object') return String(error || 'Error desconocido');
  const e = error as { message?: string; code?: string; details?: string; hint?: string };
  return [e.message, e.code, e.details, e.hint].filter(Boolean).join(' · ') || 'Error de base de datos';
}

async function loadProspect(input: LandingGenerationRequest): Promise<Partial<ProspectRecord>> {
  if (input.prospect_id) {
    const { data, error } = await insforgeAdmin.database.from('prospects').select('*').eq('id', input.prospect_id).limit(1);
    if (error) throw new Error(`No se pudo cargar el prospecto: ${serializeDbError(error)}`);
    if (Array.isArray(data) && data[0]) return data[0] as ProspectRecord;
  }
  return input.prospect || {};
}

function composeFullHtml(draft: { title: string; html: string; css: string; js: string }) {
  const hasFullHtml = /<!doctype|<html[\s>]/i.test(draft.html);
  const safeJs = draft.js ? draft.js.replace(/<\/script/gi, '<\\/script') : '';
  if (hasFullHtml) {
    let out = draft.html;
    if (draft.css && !/<\/head>/i.test(out)) out = `<style>${draft.css}</style>${out}`;
    if (draft.css && /<\/head>/i.test(out)) out = out.replace(/<\/head>/i, `<style id="sf-ai-css">${draft.css}</style></head>`);
    if (safeJs && /<\/body>/i.test(out)) out = out.replace(/<\/body>/i, `<script id="sf-ai-js">${safeJs}</script></body>`);
    else if (safeJs) out += `<script id="sf-ai-js">${safeJs}</script>`;
    return out;
  }
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${draft.title}</title><style>${draft.css}</style></head><body>${draft.html}${safeJs ? `<script>${safeJs}</script>` : ''}</body></html>`;
}

async function saveLanding(params: { draft: ReturnType<typeof parseGeneratedLanding>; input: LandingGenerationRequest; prospect: Partial<ProspectRecord>; provider: AiProviderId; model?: string; request?: NextRequest }) {
  const token = makeToken();
  const neverExpire = params.input.never_expire === true;
  const hours = Math.max(1, Math.min(24 * 365, Number(params.input.expires_in_hours || 720)));
  const expiresAt = neverExpire ? null : new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const html = composeFullHtml(params.draft);
  const projectJson = {
    mode: 'html',
    allowUnsafeHtml: true,
    aiGenerated: true,
    aiProvider: params.provider,
    aiModel: params.model || '',
    prospect_id: params.input.prospect_id || params.prospect.id || null,
    prospect: params.prospect,
    htmlCode: params.draft.html,
    css: params.draft.css,
    js: params.draft.js,
    sections: params.draft.sections,
    shareTitle: params.draft.shareTitle,
    shareDescription: params.draft.shareDescription,
    whatsappMessage: params.draft.whatsappMessage,
    emailSubject: params.draft.emailSubject,
    emailBody: params.draft.emailBody,
    reasoning: params.draft.reasoning,
    images: params.input.images || [],
    neverExpire,
    expires_in_hours: hours,
    modules: [{ type: 'ai-generated-prospect-landing', provider: params.provider }],
  };
  const row = { token, title: params.draft.title, status: 'publicado', html, project_json: projectJson, expires_at: expiresAt, updated_at: new Date().toISOString() };
  const { data, error } = await insforgeAdmin.database.from('page_engine_documents').insert([row]).select('token, expires_at').single();
  if (error) throw new Error(`No se pudo guardar la landing generada: ${serializeDbError(error)}`);
  return { token: (data as { token: string }).token, public_url: publicUrl(token, params.request), expires_at: expiresAt, never_expire: neverExpire };
}

export async function generateLanding(input: LandingGenerationRequest, request?: NextRequest): Promise<LandingGenerationResponse> {
  const providerId = (input.provider || 'openai') as AiProviderId;
  if (!isAiProviderId(providerId)) throw new Error('Proveedor IA no permitido.');
  const provider = getAiProvider(providerId);
  if (!provider || provider.category !== 'llm') throw new Error('Este proveedor no soporta generación de landing.');

  const credentials = await getAiCredentials(providerId);
  if (!credentials) throw new Error(`No hay credenciales guardadas para ${provider.label}.`);

  const prospect = await loadProspect(input);
  if (!prospect.brand) throw new Error('Falta el nombre/marca del prospecto.');

  const prompt = buildGenerateLandingPrompt(input, prospect);
  const ai = await generateAiText({
    provider: providerId,
    credentials,
    model: input.model || (typeof credentials.model === 'string' ? credentials.model : provider.defaultModel),
    prompt,
    system: 'Eres un generador de landing pages comerciales. Responde sólo JSON válido.',
    temperature: 0.35,
  });
  const draft = parseGeneratedLanding(ai.text);
  const saved = input.save ? await saveLanding({ draft, input, prospect, provider: providerId, model: ai.model, request }) : undefined;
  return { ok: true, draft, saved, provider: providerId, model: ai.model };
}

import 'server-only';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import type { GeneratedLandingDraft, LandingGenerationRequest, SavedGeneratedLanding } from '../types/page.types';
import type { ProspectRecord } from '../types/prospect.types';
import { runProspectingRawSql } from './prospect-table.server';

function makeToken() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-6);
}

function buildPublicUrl(token: string, request?: NextRequest) {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return `${explicit.replace(/\/+$/, '')}/w/${token}`;
  return request ? `${request.nextUrl.origin}/w/${token}` : `/w/${token}`;
}

function serializeDbError(error: unknown) {
  if (!error || typeof error !== 'object') return String(error || 'Error desconocido');
  const e = error as { message?: string; code?: string; details?: string; hint?: string };
  return [e.message, e.code, e.details, e.hint].filter(Boolean).join(' · ') || 'Error de base de datos';
}

async function ensurePageEngineDocumentsTable() {
  return runProspectingRawSql(`
CREATE TABLE IF NOT EXISTS page_engine_documents (
  token TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'borrador',
  html TEXT NOT NULL,
  project_json JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_page_engine_documents_updated_at ON page_engine_documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_engine_documents_status ON page_engine_documents(status);
`);
}

function fullHtml(draft: GeneratedLandingDraft) {
  const script = draft.js.trim() ? `<script>${draft.js.replace(/<\/script/gi, '<\\/script')}<\/script>` : '';
  if (/<!doctype|<html[\s>]/i.test(draft.html)) return draft.html;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${draft.title}</title><style>${draft.css}</style></head><body>${draft.html}${script}</body></html>`;
}

export async function saveGeneratedLanding(params: { draft: GeneratedLandingDraft; request: LandingGenerationRequest; prospect: Partial<ProspectRecord>; provider: string; model?: string; nextRequest?: NextRequest }): Promise<SavedGeneratedLanding> {
  const ensure = await ensurePageEngineDocumentsTable();
  if (!ensure.ok) throw new Error('No se pudo preparar page_engine_documents.');

  const hours = Math.max(1, Math.min(24 * 365, Number(params.request.expires_in_hours || 720)));
  const neverExpire = params.request.never_expire === true;
  const expiresAt = neverExpire ? null : new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const token = makeToken();
  const html = fullHtml(params.draft);

  const project_json = {
    mode: 'html',
    allowUnsafeHtml: true,
    generated_by: 'prospecting-engine',
    module: '03-ai-landing-generator',
    provider: params.provider,
    model: params.model,
    prospect_id: params.prospect.id,
    prospect: params.prospect,
    htmlCode: params.draft.html,
    css: params.draft.css,
    js: params.draft.js,
    sections: params.draft.sections,
    reasoning: params.draft.reasoning,
    shareTitle: params.draft.shareTitle,
    shareDescription: params.draft.shareDescription,
    whatsappMessage: params.draft.whatsappMessage,
    emailSubject: params.draft.emailSubject,
    emailBody: params.draft.emailBody,
    images: params.request.images || [],
    neverExpire,
    expires_in_hours: hours,
  };

  const row = {
    token,
    title: params.draft.title.slice(0, 140) || 'Demo IA',
    status: 'publicado',
    html,
    project_json,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await insforgeAdmin.database
    .from('page_engine_documents')
    .insert([row])
    .select('token, expires_at')
    .single();

  if (error) throw new Error(serializeDbError(error));
  const savedToken = (data as { token?: string })?.token || token;
  return {
    token: savedToken,
    public_url: buildPublicUrl(savedToken, params.nextRequest),
    expires_at: (data as { expires_at?: string | null })?.expires_at || expiresAt,
    never_expire: neverExpire,
  };
}

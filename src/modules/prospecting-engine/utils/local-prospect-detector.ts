import { parseProspectImportPayload } from './prospect-importer';
import type { LocalDetectedProspect, LocalImportDetectionResult, LocalImportSourceType } from '../types/import.types';
import type { ProspectInput } from '../types/prospect.types';

function uid(prefix = 'local') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36).slice(-5)}`;
}

function clean(value: unknown, max = 1000) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function sourceTypeFromName(name = '', raw = ''): LocalImportSourceType {
  const lower = name.toLowerCase();
  const trimmed = raw.trim();
  if (lower.endsWith('.json') || trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (lower.endsWith('.html') || lower.endsWith('.htm') || /<html|<section|<article|<table|<div/i.test(trimmed)) return 'html';
  if (lower.endsWith('.txt')) return 'text';
  return 'unknown';
}

function firstMatch(source: string, regex: RegExp) {
  return clean(source.match(regex)?.[1] || '');
}

function stripTags(html: string) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDetected(input: ProspectInput, sourceType: LocalImportSourceType, rawBlock?: string, confidence = 72): LocalDetectedProspect | null {
  const inputRecord = input as unknown as Record<string, unknown>;
  const brand = clean(input.brand || inputRecord.name || '', 180);
  if (!brand || brand.length < 2) return null;
  return {
    ...input,
    brand,
    local_id: uid('detected'),
    confidence,
    detected_from: sourceType,
    raw_block: rawBlock?.slice(0, 2500),
    selected: true,
  };
}

function detectFromJson(raw: string, sourceType: LocalImportSourceType): LocalDetectedProspect[] {
  try {
    const parsed = parseProspectImportPayload(raw);
    return parsed.prospects
      .map((item) => normalizeDetected(item, sourceType, undefined, 94))
      .filter(Boolean) as LocalDetectedProspect[];
  } catch {
    return [];
  }
}

function splitHtmlBlocks(raw: string) {
  const blocks: string[] = [];
  const blockRegex = /<(article|section|tr|li|div)\b[^>]*(?:prospect|marca|brand|card|cliente|negocio|empresa)[^>]*>[\s\S]*?<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(raw))) blocks.push(match[0]);
  if (blocks.length) return blocks.slice(0, 200);
  const headingBlocks = raw.split(/(?=<h[1-3][^>]*>)/i).filter((part) => stripTags(part).length > 30);
  return headingBlocks.slice(0, 200);
}

function detectProspectFromBlock(block: string, fallbackIndex: number, sourceType: LocalImportSourceType): LocalDetectedProspect | null {
  const text = stripTags(block);
  const heading = firstMatch(block, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i)
    || firstMatch(block, /<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/i)
    || firstMatch(text, /(?:Marca|Brand|Empresa|Negocio|Cliente)\s*[:\-]\s*([^|\n\r.;]+)/i)
    || firstMatch(text, /^([^|\n\r.;]{3,80})/i);
  const instagram = firstMatch(block, /(https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+)/i) || firstMatch(text, /(@[a-zA-Z0-9._-]{3,})/);
  const facebook = firstMatch(block, /(https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+)/i);
  const website = firstMatch(block, /(https?:\/\/(?!www\.instagram|instagram|www\.facebook|facebook|wa\.me)[^\s"'<>]+)/i);
  const whatsapp = firstMatch(block, /wa\.me\/([0-9]+)/i) || firstMatch(text, /(\+?56\s?9\s?[0-9\s]{8,14})/i) || firstMatch(text, /(\+?[0-9][0-9\s]{7,18})/i);
  const email = firstMatch(text, /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  const followers = firstMatch(text, /([0-9]{1,3}(?:[.,][0-9])?\s*K\s*(?:seguidores|followers)?|[0-9]{3,}\s*(?:seguidores|followers))/i);
  const city = firstMatch(text, /(?:Ciudad|Comuna|Ubicación|Ubicacion|Sector)\s*[:\-]\s*([^|.;]+)/i);
  const industry = firstMatch(text, /(?:Rubro|Nicho|Industria|Categoría|Categoria)\s*[:\-]\s*([^|.;]+)/i);
  const problem = firstMatch(text, /(?:Problema|Dolor|Debilidad)\s*[:\-]\s*([^|]+?)(?:Oportunidad|Beneficio|Ventaja|Score|$)/i);
  const opportunity = firstMatch(text, /(?:Oportunidad|Solución|Solucion|Beneficio principal)\s*[:\-]\s*([^|]+?)(?:Mensaje|Score|Estado|$)/i);
  const scoreRaw = firstMatch(text, /(?:Score|Puntaje|Probabilidad)\s*[:\-]\s*([0-9]{1,3}|alta|media|baja)/i).toLowerCase();
  const probability_level = scoreRaw.includes('alta') ? 'alta' : scoreRaw.includes('baja') ? 'baja' : scoreRaw.includes('media') ? 'media' : undefined;
  const score = /^[0-9]+$/.test(scoreRaw) ? Math.max(0, Math.min(100, Number(scoreRaw))) : undefined;
  const notes = text.slice(0, 600);

  const brand = heading || `Prospecto ${fallbackIndex + 1}`;
  const confidence = [instagram, website, whatsapp, problem, opportunity, followers].filter(Boolean).length >= 3 ? 84 : 62;
  return normalizeDetected({ brand, instagram, facebook, website, whatsapp, email, followers, city, industry, problem_detected: problem, opportunity, probability_level, score, notes, source: 'local-html' }, sourceType, block, confidence);
}

function detectFromHtml(raw: string, sourceType: LocalImportSourceType): LocalDetectedProspect[] {
  const jsonScriptMatches = Array.from(raw.matchAll(/<script[^>]+type=["']application\/(?:json|ld\+json)["'][^>]*>([\s\S]*?)<\/script>/gi)).map((m) => m[1]);
  const jsonProspects = jsonScriptMatches.flatMap((json) => detectFromJson(json, 'json'));
  const blocks = splitHtmlBlocks(raw);
  const blockProspects = blocks.map((block, index) => detectProspectFromBlock(block, index, sourceType)).filter(Boolean) as LocalDetectedProspect[];
  const combined = [...jsonProspects, ...blockProspects];
  const seen = new Set<string>();
  return combined.filter((p) => {
    const key = `${p.brand}|${p.instagram || ''}|${p.website || ''}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function detectFromText(raw: string, sourceType: LocalImportSourceType): LocalDetectedProspect[] {
  const normalized = raw.replace(/\r/g, '\n');
  const chunks = normalized
    .split(/\n\s*\n|(?=\n?\s*(?:Marca|Empresa|Negocio|Prospecto|Cliente)\s*[:\-])/gi)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 30)
    .slice(0, 200);
  return chunks.map((chunk, index) => detectProspectFromBlock(chunk, index, sourceType)).filter(Boolean) as LocalDetectedProspect[];
}

export function detectLocalProspects(raw: string, sourceName = ''): LocalImportDetectionResult {
  const sourceType = sourceTypeFromName(sourceName, raw);
  const warnings: string[] = [];
  let prospects: LocalDetectedProspect[] = [];

  if (sourceType === 'json') prospects = detectFromJson(raw, sourceType);
  if (!prospects.length && (sourceType === 'html' || /<[^>]+>/.test(raw))) prospects = detectFromHtml(raw, 'html');
  if (!prospects.length) prospects = detectFromText(raw, sourceType === 'unknown' ? 'text' : sourceType);

  if (!prospects.length) warnings.push('No se detectaron prospectos claros. Revisa si el archivo trae JSON, tabla o bloques con nombre/problema/contacto.');
  if (prospects.some((p) => p.confidence < 70)) warnings.push('Algunos prospectos tienen baja confianza local. Puedes corregirlos manualmente o activar IA.');

  return { ok: prospects.length > 0, mode: 'local', sourceType, sourceName, prospects, warnings, aiUsed: false };
}

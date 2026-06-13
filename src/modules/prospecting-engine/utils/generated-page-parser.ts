import type { GeneratedLandingDraft } from '../types/page.types';

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced) return fenced;
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

export function parseGeneratedLanding(raw: string): GeneratedLandingDraft {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(extractJson(raw)) as Record<string, unknown>;
  } catch {
    parsed = {};
  }

  const sectionsRaw = Array.isArray(parsed.sections) ? parsed.sections : [];
  const sections = sectionsRaw.map((item, index) => {
    const section = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      id: text(section.id, `section-${index + 1}`),
      name: text(section.name, `Sección ${index + 1}`),
      purpose: text(section.purpose, 'Bloque de contenido comercial'),
    };
  });

  const html = text(parsed.html);
  const css = text(parsed.css);
  const js = text(parsed.js);

  if (!html || html.length < 40) {
    return {
      title: text(parsed.title, 'Demo digital'),
      html: `<main data-sf-block="fallback" class="sf-generated"><section data-sf-editable="fallback-copy"><h1>Demo digital generada</h1><p>No se pudo interpretar el HTML del modelo. Revisa la respuesta IA y vuelve a generar.</p></section></main>`,
      css: css || `body{margin:0;background:#060606;color:white;font-family:Inter,system-ui,sans-serif}.sf-generated{min-height:100vh;display:grid;place-items:center;padding:24px}.sf-generated section{max-width:760px;border:1px solid rgba(255,255,255,.15);border-radius:28px;padding:32px;background:rgba(255,255,255,.06)}`,
      js,
      shareTitle: text(parsed.shareTitle, 'Demo digital'),
      shareDescription: text(parsed.shareDescription, 'Vista previa comercial generada con IA.'),
      whatsappMessage: text(parsed.whatsappMessage, 'Hola, te comparto una demo digital.'),
      emailSubject: text(parsed.emailSubject, 'Demo digital'),
      emailBody: text(parsed.emailBody, 'Hola, te comparto una demo digital.'),
      sections: sections.length ? sections : [{ id: 'fallback', name: 'Fallback', purpose: 'Indicar que la respuesta IA no fue válida' }],
      reasoning: text(parsed.reasoning, 'Respuesta IA incompleta o no JSON.'),
    };
  }

  return {
    title: text(parsed.title, 'Demo digital'),
    html,
    css: css || '',
    js: js || '',
    shareTitle: text(parsed.shareTitle, text(parsed.title, 'Demo digital')),
    shareDescription: text(parsed.shareDescription, 'Vista previa comercial generada con IA.'),
    whatsappMessage: text(parsed.whatsappMessage, 'Hola, te comparto una demo digital.'),
    emailSubject: text(parsed.emailSubject, text(parsed.title, 'Demo digital')),
    emailBody: text(parsed.emailBody, 'Hola, te comparto una demo digital.'),
    sections: sections.length ? sections : [{ id: 'hero', name: 'Hero', purpose: 'Captar atención inicial' }],
    reasoning: text(parsed.reasoning, 'Landing generada con base en el prospecto y objetivo comercial.'),
  };
}

import type { EditableSection } from '../types/section.types';

function stripTags(html: string) {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function attrValue(tag: string, attr: string) {
  const match = tag.match(new RegExp(`${attr}=["']([^"']+)["']`, 'i'));
  return match?.[1]?.trim() || '';
}

function sectionType(tagName: string, attr: string): EditableSection['type'] {
  if (attr === 'data-sf-block') return 'block';
  if (attr === 'data-sf-editable') return 'editable';
  if (/^h[1-6]$/i.test(tagName)) return 'heading';
  if (/^p$/i.test(tagName)) return 'paragraph';
  if (/^(a|button)$/i.test(tagName)) return 'button';
  if (/^img$/i.test(tagName)) return 'image';
  return 'unknown';
}

function makeSection(params: { id: string; label?: string; type: EditableSection['type']; selector: string; html: string; start: number; end: number; confidence: number }): EditableSection {
  const text = stripTags(params.html);
  return {
    id: params.id,
    label: params.label || params.id,
    type: params.type,
    selector: params.selector,
    html: params.html,
    text,
    start: params.start,
    end: params.end,
    confidence: params.confidence,
  };
}

function unique(sections: EditableSection[]) {
  const seen = new Set<string>();
  return sections.filter((section) => {
    const key = `${section.start}:${section.end}:${section.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findByDataAttr(html: string, attr: 'data-sf-block' | 'data-sf-editable'): EditableSection[] {
  const out: EditableSection[] = [];
  const openTag = new RegExp(`<([a-zA-Z0-9-]+)\\b[^>]*${attr}=["'][^"']+["'][^>]*>`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = openTag.exec(html))) {
    const tag = match[1];
    const start = match.index;
    const tagHtml = match[0];
    const id = attrValue(tagHtml, attr);
    if (!id) continue;

    if (/^(img|input|br|hr|meta|link)$/i.test(tag)) {
      out.push(makeSection({ id, type: sectionType(tag, attr), selector: `[${attr}="${id}"]`, html: tagHtml, start, end: start + tagHtml.length, confidence: 96 }));
      continue;
    }

    const close = new RegExp(`<\\/${tag}>`, 'gi');
    close.lastIndex = openTag.lastIndex;
    const endMatch = close.exec(html);
    if (!endMatch) continue;
    const end = endMatch.index + endMatch[0].length;
    const block = html.slice(start, end);
    out.push(makeSection({ id, type: sectionType(tag, attr), selector: `[${attr}="${id}"]`, html: block, start, end, confidence: attr === 'data-sf-editable' ? 98 : 94 }));
  }
  return out;
}

function findFallbackTextBlocks(html: string): EditableSection[] {
  const out: EditableSection[] = [];
  const regex = /<(h[1-6]|p|a|button)\b[^>]*>[\s\S]*?<\/\1>/gi;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = regex.exec(html))) {
    const block = match[0];
    const text = stripTags(block);
    if (text.length < 8) continue;
    const tag = match[1].toLowerCase();
    out.push(makeSection({ id: `${tag}-${index + 1}`, label: `${tag.toUpperCase()} · ${text.slice(0, 40)}`, type: sectionType(tag, 'fallback'), selector: tag, html: block, start: match.index, end: match.index + block.length, confidence: 72 }));
    index++;
    if (out.length >= 80) break;
  }
  return out;
}

export function detectEditableSections(html: string): EditableSection[] {
  const sections = [
    ...findByDataAttr(html, 'data-sf-editable'),
    ...findByDataAttr(html, 'data-sf-block'),
    ...findFallbackTextBlocks(html),
  ];
  return unique(sections).sort((a, b) => b.confidence - a.confidence || a.start - b.start).slice(0, 120);
}

export function getEditableSection(html: string, sectionId?: string, sectionHtml?: string): EditableSection | null {
  const sections = detectEditableSections(html);
  if (sectionId) {
    const exact = sections.find((section) => section.id === sectionId);
    if (exact) return exact;
  }
  if (sectionHtml) {
    const start = html.indexOf(sectionHtml);
    if (start >= 0) return makeSection({ id: sectionId || 'manual-selection', label: sectionId || 'Selección manual', type: 'editable', selector: 'manual', html: sectionHtml, start, end: start + sectionHtml.length, confidence: 88 });
  }
  return sections[0] || null;
}

export function replaceEditableSection(fullHtml: string, section: EditableSection, improvedHtml: string) {
  if (section.start >= 0 && section.end > section.start) {
    return `${fullHtml.slice(0, section.start)}${improvedHtml}${fullHtml.slice(section.end)}`;
  }
  const index = fullHtml.indexOf(section.html);
  if (index >= 0) return `${fullHtml.slice(0, index)}${improvedHtml}${fullHtml.slice(index + section.html.length)}`;
  throw new Error('No se pudo reemplazar la sección seleccionada dentro del HTML completo.');
}

export function parseImprovedSection(raw: string): { improvedHtml: string; summary: string; warnings: string[] } {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || trimmed.slice(trimmed.indexOf('{') >= 0 ? trimmed.indexOf('{') : 0, trimmed.lastIndexOf('}') >= 0 ? trimmed.lastIndexOf('}') + 1 : trimmed.length);
  try {
    const parsed = JSON.parse(candidate) as { improvedHtml?: unknown; html?: unknown; summary?: unknown; warnings?: unknown };
    const improvedHtml = typeof parsed.improvedHtml === 'string' ? parsed.improvedHtml.trim() : typeof parsed.html === 'string' ? parsed.html.trim() : '';
    return {
      improvedHtml,
      summary: typeof parsed.summary === 'string' ? parsed.summary : 'Sección mejorada con IA.',
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : [],
    };
  } catch {
    return { improvedHtml: trimmed, summary: 'La IA devolvió HTML directo sin JSON; se usó como reemplazo.', warnings: ['Respuesta IA no venía en JSON estructurado.'] };
  }
}

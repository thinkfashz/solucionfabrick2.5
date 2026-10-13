/**
 * SEO automático para el blog. Todo lo determinístico (descripción, keywords,
 * slug) se calcula sin IA para que cada borrador nazca indexable. La IA solo
 * se usa bajo demanda para mejorar lo generado.
 */

const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'en', 'y', 'o', 'u',
  'que', 'qué', 'se', 'su', 'sus', 'con', 'por', 'para', 'como', 'cómo', 'más', 'mas', 'pero',
  'sin', 'sobre', 'entre', 'hasta', 'desde', 'durante', 'este', 'esta', 'estos', 'estas', 'ese',
  'esa', 'esos', 'esas', 'esto', 'eso', 'mi', 'tu', 'nos', 'les', 'son', 'es', 'está', 'están',
  'hay', 'tiene', 'tienen', 'puede', 'pueden', 'hace', 'hacen', 'cada', 'todo', 'toda', 'todos',
  'muy', 'también', 'solo', 'sólo', 'así', 'donde', 'dónde', 'cuando', 'cuándo', 'porque', 'pues',
  'the', 'and', 'for', 'with', 'you', 'your', 'are', 'the',
]);

function plainText(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Descripción de 120–155 caracteres desde el primer párrafo con sustancia. */
export function extractDescription(md: string, fallbackTitle = ''): string {
  const paragraphs = md.split(/\n\s*\n/).map((p) => plainText(p)).filter((p) => p.length >= 60);
  const best = paragraphs[0] || plainText(md).slice(0, 400) || fallbackTitle;
  if (best.length <= 155) return best;
  const cut = best.slice(0, 152);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 100 ? cut.slice(0, lastSpace) : cut).trim();
}

/** Palabras clave por frecuencia, sin stopwords, con el título pesando doble. */
export function extractKeywords(md: string, title = '', max = 8): string[] {
  const source = `${title} ${title} ${plainText(md)}`.toLowerCase();
  const counts = new Map<string, number>();
  for (const raw of source.split(/[^a-záéíóúñü0-9]+/)) {
    const word = raw.trim();
    if (word.length < 4 || STOPWORDS.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([word]) => word);
}

/** Minuten de lectura honesto (220 ppm). */
export function readingMinutes(md: string): number {
  const words = plainText(md).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

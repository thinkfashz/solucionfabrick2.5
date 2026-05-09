import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';

const REPO_ROOT = process.cwd();

const ALLOWED_PREFIXES = ['src/', 'scripts/', 'docs/', 'public/'];
const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.mdx',
  '.css',
  '.scss',
  '.html',
  '.yml',
  '.yaml',
  '.sql',
  '.py',
  '.txt',
  '.toml',
]);

const BLOCKED_NAMES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.test',
]);

const MAX_BYTES = 200 * 1024; // 200 KB por archivo
const MAX_FILES_PER_REQUEST = 8;

/**
 * Lanzada por `normalizeRepoPath` y `readRepoFiles` cuando una ruta
 * solicitada por el cliente intenta salir del whitelist (traversal,
 * archivos secretos, extensiones binarias…). Las rutas API deben
 * capturarla y devolver HTTP 400, nunca 500: es entrada inválida del
 * usuario, no un fallo interno.
 */
export class UnsafePathError extends Error {
  constructor(reason: string) {
    super(`Ruta no permitida: ${reason}`);
    this.name = 'UnsafePathError';
  }
}

/**
 * Normaliza la ruta solicitada al árbol del repo, rechazando
 * traversal (`..`), rutas absolutas, dotfiles, secrets y archivos
 * fuera de la whitelist.
 */
export function normalizeRepoPath(input: string): string {
  if (!input || typeof input !== 'string') throw new UnsafePathError('vacía');
  const cleaned = input.trim().replace(/^\.\/+/, '').replace(/^\/+/, '');
  if (cleaned.includes('\u0000')) throw new UnsafePathError('contiene null byte');
  // Normaliza y prohíbe segmentos `..`
  const parts = cleaned.split(/[\\/]+/);
  for (const seg of parts) {
    if (seg === '..') throw new UnsafePathError('traversal `..`');
    if (seg.startsWith('.') && BLOCKED_NAMES.has(seg)) throw new UnsafePathError(`${seg} bloqueado`);
  }
  const norm = path.posix.normalize(parts.join('/'));
  if (!ALLOWED_PREFIXES.some((p) => norm === p.replace(/\/$/, '') || norm.startsWith(p))) {
    throw new UnsafePathError('fuera de la whitelist (src/, scripts/, docs/, public/)');
  }
  // Verifica resolución absoluta
  const abs = path.resolve(REPO_ROOT, norm);
  const root = path.resolve(REPO_ROOT) + path.sep;
  if (!abs.startsWith(root)) throw new UnsafePathError('escapa de la raíz del repo');
  const ext = path.extname(norm).toLowerCase();
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    throw new UnsafePathError(`extensión no permitida (${ext || 'sin extensión'})`);
  }
  return norm;
}

export interface RepoFileSnippet {
  path: string;
  bytes: number;
  truncated: boolean;
  content: string;
}

/** Lee uno o varios archivos del repo (con todas las protecciones). */
export async function readRepoFiles(paths: string[]): Promise<RepoFileSnippet[]> {
  if (!Array.isArray(paths)) throw new UnsafePathError('paths debe ser array');
  if (paths.length > MAX_FILES_PER_REQUEST) {
    throw new UnsafePathError(`máximo ${MAX_FILES_PER_REQUEST} archivos por solicitud`);
  }
  const out: RepoFileSnippet[] = [];
  for (const raw of paths) {
    const norm = normalizeRepoPath(raw);
    const abs = path.resolve(REPO_ROOT, norm);
    const stat = await fs.stat(abs).catch(() => null);
    if (!stat || !stat.isFile()) {
      out.push({ path: norm, bytes: 0, truncated: false, content: `// archivo no encontrado` });
      continue;
    }
    const buf = await fs.readFile(abs);
    const truncated = buf.byteLength > MAX_BYTES;
    const slice = truncated ? buf.subarray(0, MAX_BYTES) : buf;
    out.push({
      path: norm,
      bytes: buf.byteLength,
      truncated,
      content: slice.toString('utf8'),
    });
  }
  return out;
}

/** Construye el bloque de mensaje con los archivos pegados (formato listo para LLM). */
export function formatSnippetsForPrompt(snippets: RepoFileSnippet[]): string {
  if (!snippets.length) return '';
  const blocks = snippets.map((s) => {
    const header = `### ${s.path} (${s.bytes} bytes${s.truncated ? ', truncado' : ''})`;
    const fence = '```';
    const lang = path.extname(s.path).replace('.', '') || '';
    return `${header}\n${fence}${lang}\n${s.content}\n${fence}`;
  });
  return [
    'Te adjunto los siguientes archivos del repo `solucionfabrick2.5` para tu análisis:',
    '',
    ...blocks,
  ].join('\n');
}

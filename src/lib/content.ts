import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

export type ContentType = 'blog' | 'casos';

export interface ContentFrontmatter {
  title: string;
  description: string;
  date: string; // ISO 8601
  author?: string;
  cover?: string;
  tags?: string[];
  draft?: boolean;
  /** casos de estudio only */
  client?: string;
  /** casos de estudio only */
  location?: string;
  /** casos de estudio only */
  services?: string[];
  /** casos de estudio only */
  duration?: string;
  /** casos de estudio only */
  outcome?: string;
}

export interface ContentMeta extends ContentFrontmatter {
  slug: string;
  type: ContentType;
  readingMinutes: number;
}

export interface ContentPost extends ContentMeta {
  /** Sanitized HTML ready to render */
  html: string;
  /** Raw markdown source for tooling (e.g. future RSS) */
  raw: string;
}

const CONTENT_ROOT = path.join(process.cwd(), 'src', 'content');

function contentDir(type: ContentType): string {
  return path.join(CONTENT_ROOT, type);
}

function estimateReadingMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function assertFrontmatter(data: Record<string, unknown>, filePath: string): ContentFrontmatter {
  const { title, description } = data;
  let { date } = data;
  if (typeof title !== 'string' || !title.trim()) {
    throw new Error(`Frontmatter missing "title" in ${filePath}`);
  }
  if (typeof description !== 'string' || !description.trim()) {
    throw new Error(`Frontmatter missing "description" in ${filePath}`);
  }
  // gray-matter may parse unquoted YAML dates as Date objects; normalize to ISO string.
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    date = date.toISOString();
  }
  if (typeof date !== 'string' || Number.isNaN(Date.parse(date))) {
    throw new Error(`Frontmatter missing/invalid "date" in ${filePath}`);
  }
  return { ...(data as unknown as ContentFrontmatter), date };
}

/**
 * Read all .md files from the given content directory, parsing frontmatter and
 * filtering drafts when NODE_ENV === 'production'.
 *
 * This function is deliberately synchronous: content is a handful of files
 * bundled with the deployment, and Next.js static generation runs at build time.
 */
export function listContent(type: ContentType): ContentMeta[] {
  const dir = contentDir(type);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const items = files.map((file) => {
    const filePath = path.join(dir, file);
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(raw);
    const fm = assertFrontmatter(data, filePath);
    const slug = file.replace(/\.md$/, '');
    return {
      ...fm,
      slug,
      type,
      readingMinutes: estimateReadingMinutes(content),
    } satisfies ContentMeta;
  });

  const isProd = process.env.NODE_ENV === 'production';
  const filtered = isProd ? items.filter((i) => !i.draft) : items;
  return filtered.sort((a, b) => b.date.localeCompare(a.date));
}

export function getContent(type: ContentType, slug: string): ContentPost | null {
  const dir = contentDir(type);
  const filePath = path.join(dir, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  const fm = assertFrontmatter(data, filePath);

  if (fm.draft && process.env.NODE_ENV === 'production') return null;

  // Render Markdown → HTML (synchronous mode) and sanitize defensively with DOMPurify,
  // even though our source is trusted, to guarantee no XSS can ever leak through
  // user-authored quotes or HTML snippets inside posts.
  marked.setOptions({ gfm: true, breaks: false });
  const rendered = marked.parse(content, { async: false }) as string;
  const html = DOMPurify.sanitize(rendered, {
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['style', 'script'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });

  return {
    ...fm,
    slug,
    type,
    readingMinutes: estimateReadingMinutes(content),
    html,
    raw: content,
  };
}

/**
 * Hybrid loader for the blog (DB-first, .md fallback).
 *
 * The DB takes priority by slug — entries created from /admin/blog override
 * any matching .md file. Markdown files keep working until they're imported
 * to the DB so the site never goes blank during the migration.
 */
export async function listAllBlog(): Promise<ContentMeta[]> {
  const md = listContent('blog');
  // Lazy-import server-only DB module so this file stays usable in any
  // server context without forcing the InsForge SDK to load eagerly.
  const { listDbBlogPosts } = await import('./cms');
  const db = await listDbBlogPosts();

  const merged = new Map<string, ContentMeta>();
  for (const item of md) merged.set(item.slug, item);
  for (const post of db) {
    merged.set(post.slug, {
      slug: post.slug,
      type: 'blog',
      title: post.title,
      description: post.description ?? '',
      date: post.published_at ?? post.created_at,
      author: post.author ?? undefined,
      cover: post.cover_url ?? undefined,
      tags: post.tags,
      readingMinutes: post.reading_minutes ?? estimateReadingMinutes(post.body_md ?? ''),
    });
  }
  const items = Array.from(merged.values());
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

/** Hybrid loader for a single post (DB-first, .md fallback). */
export async function getBlogPost(slug: string): Promise<ContentPost | null> {
  const { getDbBlogPost } = await import('./cms');
  const dbPost = await getDbBlogPost(slug);
  if (dbPost) {
    return {
      slug: dbPost.slug,
      type: 'blog',
      title: dbPost.title,
      description: dbPost.description ?? '',
      date: dbPost.published_at ?? dbPost.created_at,
      author: dbPost.author ?? undefined,
      cover: dbPost.cover_url ?? undefined,
      tags: dbPost.tags,
      readingMinutes: dbPost.reading_minutes ?? estimateReadingMinutes(dbPost.body_md ?? ''),
      html: dbPost.body_html ?? '',
      raw: dbPost.body_md ?? '',
    };
  }
  return getContent('blog', slug);
}

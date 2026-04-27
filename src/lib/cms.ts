import 'server-only';
import { insforge } from './insforge';

/**
 * Server-side reader for the public CMS (settings, dynamic home sections, blog).
 *
 * Every read is wrapped in a try/catch and falls back to safe defaults so a DB
 * outage or missing table never breaks the public site. All callers are server
 * components / route handlers — never expose this to the client.
 */

export interface CmsSettings {
  copyright_text: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cover_url: string;
  social_facebook: string;
  social_instagram: string;
  social_tiktok: string;
  whatsapp: string;
  email_contacto: string;
  direccion: string;
  nombre_empresa: string;
  slogan: string;
  logo_url: string;
}

const DEFAULT_SETTINGS: CmsSettings = {
  copyright_text: '© {year} Soluciones Fabrick · Todos los derechos reservados',
  hero_title: '',
  hero_subtitle: '',
  hero_cover_url: '',
  social_facebook: '',
  social_instagram: '',
  social_tiktok: '',
  whatsapp: '',
  email_contacto: '',
  direccion: '',
  nombre_empresa: 'Soluciones Fabrick',
  slogan: '',
  logo_url: '',
};

/** Returns the merged settings map, falling back to defaults on any failure. */
export async function getCmsSettings(): Promise<CmsSettings> {
  try {
    const { data, error } = await insforge.database
      .from('configuracion')
      .select('clave, valor');
    if (error || !Array.isArray(data)) return { ...DEFAULT_SETTINGS };
    const out: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of data as Array<{ clave?: string; valor?: string }>) {
      if (!row.clave) continue;
      if (row.clave in DEFAULT_SETTINGS) {
        out[row.clave] = row.valor ?? '';
      }
    }
    return out as unknown as CmsSettings;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Substitutes `{year}` in the copyright string. */
export function renderCopyright(template: string): string {
  const year = new Date().getFullYear().toString();
  return (template || DEFAULT_SETTINGS.copyright_text).replaceAll('{year}', year);
}

export interface PublicHomeSection {
  id: string;
  kind: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  image_url: string | null;
  link_url: string | null;
  link_label: string | null;
  position: number;
  data: Record<string, unknown>;
}

/** Lists visible home sections in display order. Returns [] on failure. */
export async function getPublicHomeSections(): Promise<PublicHomeSection[]> {
  try {
    const { data, error } = await insforge.database
      .from('home_sections')
      .select('id, kind, title, subtitle, body, image_url, link_url, link_label, position, visible, data')
      .eq('visible', true)
      .order('position', { ascending: true });
    if (error || !Array.isArray(data)) return [];
    return (data as Array<PublicHomeSection & { visible?: boolean }>).map((s) => ({
      id: s.id,
      kind: s.kind,
      title: s.title ?? null,
      subtitle: s.subtitle ?? null,
      body: s.body ?? null,
      image_url: s.image_url ?? null,
      link_url: s.link_url ?? null,
      link_label: s.link_label ?? null,
      position: Number(s.position ?? 0),
      data: (s.data && typeof s.data === 'object' ? s.data : {}) as Record<string, unknown>,
    }));
  } catch {
    return [];
  }
}

export interface DbBlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_url: string | null;
  body_md: string;
  body_html: string;
  tags: string[];
  author: string | null;
  published: boolean;
  published_at: string | null;
  reading_minutes: number;
  created_at: string;
  updated_at: string;
}

/** Lists published blog posts from the DB. Returns [] on failure. */
export async function listDbBlogPosts(): Promise<DbBlogPost[]> {
  try {
    const { data, error } = await insforge.database
      .from('blog_posts')
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false });
    if (error || !Array.isArray(data)) return [];
    return (data as DbBlogPost[]).map((p) => ({
      ...p,
      tags: Array.isArray(p.tags) ? p.tags : [],
    }));
  } catch {
    return [];
  }
}

/** Fetches a single published post by slug. Returns null if not found. */
export async function getDbBlogPost(slug: string): Promise<DbBlogPost | null> {
  try {
    const { data, error } = await insforge.database
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .limit(1);
    if (error || !Array.isArray(data) || data.length === 0) return null;
    const p = data[0] as DbBlogPost;
    return { ...p, tags: Array.isArray(p.tags) ? p.tags : [] };
  } catch {
    return null;
  }
}

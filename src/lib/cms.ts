import 'server-only';
import { unstable_cache } from 'next/cache';
import { insforge } from './insforge';

/** Cache tags used by `unstable_cache`. Admin handlers should call
 *  `revalidateTag(...)` on these whenever underlying data changes so the
 *  cached reads are dropped immediately instead of waiting for the 1h TTL. */
export const CMS_CACHE_TAGS = {
  settings: 'cms:settings',
  homeSections: 'cms:home-sections',
  blogList: 'cms:blog-list',
  blogPost: 'cms:blog-post',
} as const;

const ONE_HOUR = 3600;

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
  // Tienda (catálogo) — editables desde /admin/tienda
  tienda_titulo: string;
  tienda_subtitulo: string;
  tienda_cover_url: string;
  tienda_destacados_titulo: string;
  tienda_cta_label: string;
  tienda_cta_url: string;
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
  tienda_titulo: '',
  tienda_subtitulo: '',
  tienda_cover_url: '',
  tienda_destacados_titulo: '',
  tienda_cta_label: '',
  tienda_cta_url: '',
};

/** Returns the merged settings map, falling back to defaults on any failure. */
export const getCmsSettings = unstable_cache(
  async function getCmsSettingsImpl(): Promise<CmsSettings> {
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
  },
  ['cms:settings'],
  { revalidate: ONE_HOUR, tags: [CMS_CACHE_TAGS.settings] },
);

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

/**
 * Lists visible sections for a given page in display order. Returns [] on
 * failure. Defaults to page='home' for backwards compat when older rows have
 * no `page` column populated. The DB query coalesces NULL → 'home' via two
 * passes (one for the requested page, one for legacy NULLs when page='home').
 */
export async function getPublicSectionsForPage(
  page: 'home' | 'tienda',
): Promise<PublicHomeSection[]> {
  return getPublicSectionsForPageCached(page);
}

const getPublicSectionsForPageCached = unstable_cache(
  async function getPublicSectionsForPageImpl(
    page: 'home' | 'tienda',
  ): Promise<PublicHomeSection[]> {
  try {
    const { data, error } = await insforge.database
      .from('home_sections')
      .select('id, kind, title, subtitle, body, image_url, link_url, link_label, position, visible, data, page')
      .eq('visible', true)
      .order('position', { ascending: true });
    if (error || !Array.isArray(data)) return [];
    return (data as Array<PublicHomeSection & { visible?: boolean; page?: string | null }>)
      .filter((s) => {
        const p = (s.page ?? 'home') || 'home';
        return p === page;
      })
      .map((s) => ({
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
  },
  ['cms:home-sections'],
  { revalidate: ONE_HOUR, tags: [CMS_CACHE_TAGS.homeSections] },
);

/** Lists visible home sections in display order. Returns [] on failure. */
export async function getPublicHomeSections(): Promise<PublicHomeSection[]> {
  return getPublicSectionsForPage('home');
}

/** Lists visible tienda (catálogo) sections in display order. */
export async function getPublicTiendaSections(): Promise<PublicHomeSection[]> {
  return getPublicSectionsForPage('tienda');
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
export const listDbBlogPosts = unstable_cache(
  async function listDbBlogPostsImpl(): Promise<DbBlogPost[]> {
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
  },
  ['cms:blog-list'],
  { revalidate: ONE_HOUR, tags: [CMS_CACHE_TAGS.blogList] },
);

/** Fetches a single published post by slug. Returns null if not found. */
export const getDbBlogPost = unstable_cache(
  async function getDbBlogPostImpl(slug: string): Promise<DbBlogPost | null> {
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
  },
  ['cms:blog-post'],
  { revalidate: ONE_HOUR, tags: [CMS_CACHE_TAGS.blogPost] },
);

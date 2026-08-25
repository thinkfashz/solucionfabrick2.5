import 'server-only';
import { unstable_cache } from 'next/cache';
import { insforge } from './insforge';
import { getSeedProjects, PROJECTS_CACHE_TAG, type FabrickProject } from './projects';

const PROJECT_FIELDS =
  'id, title, location, year, area_m2, category, hero_image, gallery, summary, description, materials, highlights, scope, featured, created_at, updated_at';

export type PublicProjectSource = 'db' | 'seed';

export interface PublicProjectsResult {
  data: FabrickProject[];
  source: PublicProjectSource;
}

export interface PublicProjectResult {
  project: FabrickProject | null;
  source: PublicProjectSource;
}

/**
 * Public projects list (DB ⇢ seed fallback) cached for 1 hour with the
 * `PROJECTS_CACHE_TAG` so admin mutations can invalidate via `revalidateTag`.
 *
 * The `source` flag is intentionally application-only. It lets public pages
 * distinguish verified database portfolio entries from the visual/demo seed
 * fallback without requiring a database migration or changing the CRUD schema.
 *
 * Lives in its own server-only module so the seed export in `projects.ts`
 * stays usable from client components (e.g. `ProyectosClient` reads
 * `getSeedProjects()` for the initial render).
 */
export const getPublicProjects = unstable_cache(
  async function getPublicProjectsImpl(): Promise<PublicProjectsResult> {
    try {
      const { data, error } = await insforge.database
        .from('projects')
        .select(PROJECT_FIELDS)
        .order('featured', { ascending: false })
        .order('year', { ascending: false });
      if (error || !data || data.length === 0) {
        return { data: getSeedProjects(), source: 'seed' };
      }
      return { data: data as FabrickProject[], source: 'db' };
    } catch {
      return { data: getSeedProjects(), source: 'seed' };
    }
  },
  ['projects:public'],
  { revalidate: 3600, tags: [PROJECTS_CACHE_TAG] },
);

/** Cached single-project lookup including provenance for SEO and UI trust labels. */
export async function getPublicProjectEntry(id: string): Promise<PublicProjectResult> {
  const { data, source } = await getPublicProjects();
  return {
    project: data.find((item) => String(item.id) === String(id)) || null,
    source,
  };
}

/** Backward-compatible project-only lookup. */
export async function getPublicProject(id: string): Promise<FabrickProject | null> {
  const { project } = await getPublicProjectEntry(id);
  return project;
}

import type { MetadataRoute } from 'next';
import { getSeedProjects, type FabrickProject } from '@/lib/projects';
import { insforge } from '@/lib/insforge';
import { listContent } from '@/lib/content';

const BASE_URL = 'https://www.solucionesfabrick.com';

async function loadProjects(): Promise<FabrickProject[]> {
  try {
    const { data } = await insforge.database
      .from('projects')
      .select('id, updated_at');
    if (Array.isArray(data) && data.length > 0) {
      return data as FabrickProject[];
    }
  } catch {
    /* fall through to seed */
  }
  return getSeedProjects();
}

async function loadProducts(): Promise<{ id: string; updated_at?: string }[]> {
  try {
    const { data } = await insforge.database
      .from('products')
      .select('id, updated_at')
      .neq('activo', false);
    if (Array.isArray(data) && data.length > 0) {
      return data as { id: string; updated_at?: string }[];
    }
  } catch {
    /* ignore */
  }
  return [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/soluciones`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/tienda`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/proyectos`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/servicios`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/servicios/metalcon`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE_URL}/servicios/gasfiteria`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE_URL}/servicios/electricidad`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE_URL}/servicios/ampliaciones`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE_URL}/evolucion`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/contacto`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/garantias`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/casos`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/auth`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  const [projects, products] = await Promise.all([loadProjects(), loadProducts()]);

  const projectRoutes: MetadataRoute.Sitemap = projects.map((p) => ({
    url: `${BASE_URL}/proyectos/${p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE_URL}/tienda/${p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const blogRoutes: MetadataRoute.Sitemap = listContent('blog').map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const casosRoutes: MetadataRoute.Sitemap = listContent('casos').map((p) => ({
    url: `${BASE_URL}/casos/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...projectRoutes, ...productRoutes, ...blogRoutes, ...casosRoutes];
}

import type { MetadataRoute } from 'next';
import { getSeedProjects, type FabrickProject } from '@/lib/projects';
import { insforge } from '@/lib/insforge';
import { listContent } from '@/lib/content';
import { loadInspirationCatalog } from '@/lib/inspirationCatalog';

const BASE_URL = 'https://www.solucionesfabrick.com';

async function loadProjects(): Promise<FabrickProject[]> {
  try {
    const { data } = await insforge.database.from('projects').select('id, updated_at');
    if (Array.isArray(data) && data.length > 0) return data as FabrickProject[];
  } catch {
    /* fall through to seed */
  }
  return getSeedProjects();
}

async function loadProducts(): Promise<{ id: string; updated_at?: string }[]> {
  try {
    const { data } = await insforge.database.from('products').select('id, updated_at').neq('activo', false);
    if (Array.isArray(data) && data.length > 0) return data as { id: string; updated_at?: string }[];
  } catch {
    /* ignore */
  }
  return [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/tienda`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/tienda/catalogo`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${BASE_URL}/proyectos`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/servicios`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/servicios/metalcon`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE_URL}/servicios/gasfiteria`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE_URL}/servicios/electricidad`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE_URL}/servicios/ampliaciones`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${BASE_URL}/servicios/cimientos`, lastModified: now, changeFrequency: 'monthly', priority: 0.82 },
    { url: `${BASE_URL}/servicios/revestimiento`, lastModified: now, changeFrequency: 'monthly', priority: 0.82 },
    { url: `${BASE_URL}/servicios/pintura`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/servicios/seguridad`, lastModified: now, changeFrequency: 'monthly', priority: 0.78 },
    { url: `${BASE_URL}/presupuesto`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE_URL}/herramientas/radier`, lastModified: now, changeFrequency: 'monthly', priority: 0.78 },
    { url: `${BASE_URL}/herramientas/aire-acondicionado`, lastModified: now, changeFrequency: 'monthly', priority: 0.78 },
    { url: `${BASE_URL}/evolucion`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/contacto`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/garantias`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/casos`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
  ];

  const [projects, products, inspirationCatalog] = await Promise.all([
    loadProjects(),
    loadProducts(),
    loadInspirationCatalog({ maxResults: 100 }),
  ]);

  const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${BASE_URL}/proyectos/${project.id}`,
    lastModified: project.updated_at ? new Date(project.updated_at) : now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const imagesByAlbum = new Map<string, string[]>();
  for (const asset of inspirationCatalog.assets) {
    const current = imagesByAlbum.get(asset.album) || [];
    current.push(asset.url);
    imagesByAlbum.set(asset.album, current);
  }

  const inspirationRoutes: MetadataRoute.Sitemap = inspirationCatalog.albums.map((album) => ({
    url: `${BASE_URL}/inspiraciones/${album.key}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.82,
    images: (imagesByAlbum.get(album.key) || [album.cover]).filter(Boolean).slice(0, 50),
  }));

  const staticWithProjectImages = staticRoutes.map((route) => route.url === `${BASE_URL}/proyectos`
    ? { ...route, images: inspirationCatalog.albums.map((album) => album.cover).filter(Boolean).slice(0, 100) }
    : route);

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${BASE_URL}/tienda/${product.id}`,
    lastModified: product.updated_at ? new Date(product.updated_at) : now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const blogRoutes: MetadataRoute.Sitemap = listContent('blog').map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const casosRoutes: MetadataRoute.Sitemap = listContent('casos').map((item) => ({
    url: `${BASE_URL}/casos/${item.slug}`,
    lastModified: new Date(item.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticWithProjectImages, ...inspirationRoutes, ...projectRoutes, ...productRoutes, ...blogRoutes, ...casosRoutes];
}

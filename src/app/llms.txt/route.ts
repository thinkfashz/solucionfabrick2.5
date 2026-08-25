import { loadInspirationCatalog } from '@/lib/inspirationCatalog';
import { getPublicProjects } from '@/lib/projectsServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BASE_URL = 'https://www.solucionesfabrick.com';

export async function GET() {
  const lines = [
    '# Soluciones Fabrick',
    '',
    'Sitio oficial de Soluciones Fabrick, empresa de construcción, remodelación y soluciones para el hogar en Chile.',
    '',
    '## Recursos principales',
    `- Inicio: ${BASE_URL}`,
    `- Servicios: ${BASE_URL}/servicios`,
    `- Proyectos e inspiraciones: ${BASE_URL}/proyectos`,
    `- Presupuesto: ${BASE_URL}/presupuesto`,
    `- Contacto: ${BASE_URL}/contacto`,
    '',
    '## Portafolio de proyectos publicados',
  ];

  try {
    const { data: projects } = await getPublicProjects();
    for (const project of projects.slice(0, 100)) {
      lines.push(`- ${project.title}: ${BASE_URL}/proyectos/${encodeURIComponent(project.id)}`);
      const context = [project.category, project.location, project.area_m2 ? `${project.area_m2} m²` : '', project.year ? String(project.year) : ''].filter(Boolean).join(' · ');
      if (context) lines.push(`  ${context}`);
      if (project.summary) lines.push(`  ${project.summary}`);
      const topics = [...(project.materials || []).slice(0, 5), ...(project.scope || []).slice(0, 3)].filter(Boolean);
      if (topics.length) lines.push(`  Temas: ${topics.join(', ')}`);
    }
  } catch {
    lines.push('- El portafolio puede estar temporalmente no disponible; usa /proyectos como índice principal.');
  }

  lines.push('', '## Inspiraciones visuales');

  try {
    const catalog = await loadInspirationCatalog({ maxResults: 100 });
    for (const album of catalog.albums) {
      lines.push(`- ${album.title}: ${BASE_URL}/inspiraciones/${album.key}`);
      if (album.description) lines.push(`  ${album.description}`);
      const keywords = [album.primaryKeyword, ...album.keywords].filter(Boolean).slice(0, 8);
      if (keywords.length) lines.push(`  Temas: ${keywords.join(', ')}`);
    }
  } catch {
    lines.push('- El catálogo visual puede estar temporalmente no disponible; usa /proyectos como índice principal.');
  }

  lines.push(
    '',
    '## Uso de la información',
    'Las fichas bajo /proyectos representan entradas del portafolio público del sitio. Los álbumes bajo /inspiraciones son referencias visuales y no se debe asumir que todas sus imágenes corresponden a obras ejecutadas por Soluciones Fabrick salvo que la página lo indique explícitamente.',
  );

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

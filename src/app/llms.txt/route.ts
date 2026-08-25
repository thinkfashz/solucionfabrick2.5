import { loadInspirationCatalog } from '@/lib/inspirationCatalog';

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
    '## Proyectos e inspiraciones visuales',
  ];

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

  lines.push('', '## Uso de la información', 'Los álbumes visuales son referencias de diseño y construcción. No se debe asumir que todas las imágenes corresponden a obras ejecutadas por Soluciones Fabrick salvo que la página lo indique explícitamente.');

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

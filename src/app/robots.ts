import type { MetadataRoute } from 'next';

const BASE_URL = 'https://www.solucionesfabrick.com';

/**
 * Permite todo el contenido público a buscadores y a rastreadores de IA
 * (GPTBot, ClaudeBot, Perplexity, Google-Extended). Solo se bloquea lo
 * administrativo y las APIs. El sitemap guía a todos.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/', '/estudio/impacto/'],
      },
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'anthropic-ai', 'PerplexityBot', 'Google-Extended', 'Bytespider', 'CCBot'],
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}

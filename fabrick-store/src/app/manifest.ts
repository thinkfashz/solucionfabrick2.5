import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Soluciones Fabrick',
    short_name: 'Fabrick',
    description: 'Soluciones integrales para el hogar moderno, con catalogo conectado y atencion inmediata.',
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#facc15',
    orientation: 'portrait',
    lang: 'es-CL',
    icons: [
      {
        src: '/app-icon.svg',
        type: 'image/svg+xml',
        sizes: 'any',
        purpose: 'any maskable',
      },
      {
        src: '/favicon.svg',
        type: 'image/svg+xml',
        sizes: 'any',
        purpose: 'any',
      },
    ],
  };
}

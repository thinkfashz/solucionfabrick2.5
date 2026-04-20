import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Soluciones Fabrick',
    short_name: 'Fabrick',
    description:
      'Construcción y remodelación residencial en la Región del Maule, Chile. Metalcon, gasfitería, electricidad y proyectos llave en mano.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    background_color: '#000000',
    theme_color: '#facc15',
    lang: 'es-CL',
    dir: 'ltr',
    categories: ['business', 'lifestyle', 'productivity'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Cotizar proyecto',
        short_name: 'Cotizar',
        description: 'Solicita una evaluación gratuita',
        url: '/contacto?source=shortcut',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Nuestros servicios',
        short_name: 'Servicios',
        description: 'Construcción, Metalcon, gasfitería y más',
        url: '/servicios?source=shortcut',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Proyectos',
        short_name: 'Proyectos',
        description: 'Explora nuestros proyectos',
        url: '/proyectos?source=shortcut',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}


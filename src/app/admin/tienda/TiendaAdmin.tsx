'use client';

import { PageEditor } from '@/components/admin/cms/PageEditor';

/**
 * Editor del catálogo (`/tienda`). Reusa {@link PageEditor} con su propio
 * conjunto de settings (`tienda_*`) y secciones dinámicas filtradas por
 * `page='tienda'`.
 */
export function TiendaAdmin() {
  return (
    <PageEditor
      page="tienda"
      title="Tienda · Catálogo"
      subtitle="Edita la portada de la tienda, banners y bloques superiores del catálogo. Cambios visibles inmediatamente en /tienda."
      previewPath="/tienda"
      settingGroups={[
        {
          title: 'Portada y CTAs de la tienda',
          fields: [
            { key: 'tienda_titulo', label: 'Título principal' },
            { key: 'tienda_subtitulo', label: 'Subtítulo' },
            { key: 'tienda_cover_url', label: 'Imagen de portada', image: true },
            { key: 'tienda_destacados_titulo', label: 'Título de productos destacados' },
            { key: 'tienda_cta_label', label: 'Texto del botón principal' },
            { key: 'tienda_cta_url', label: 'URL del botón principal' },
          ],
        },
      ]}
      staticNodes={[
        {
          label: '<Navbar />',
          path: 'src/components/Navbar.tsx',
          description: 'Barra de navegación global, también visible en /tienda.',
          tag: 'Client',
          settingKeys: ['logo_url', 'whatsapp'],
        },
        {
          label: '<HomeDynamicSections sections={tiendaSections} />',
          path: 'src/components/HomeDynamicSections.tsx',
          description: 'Renderiza las secciones dinámicas listadas debajo, encima del catálogo.',
          tag: 'Server',
        },
        {
          label: '<TiendaClientPage />',
          path: 'src/tienda/page.tsx',
          description: 'Catálogo cliente con búsqueda, filtros, carrito y banner. Lee productos de la tabla `productos` (editar en /admin/productos).',
          tag: 'Client',
        },
      ]}
    />
  );
}

'use client';

import { EnhancedStoreEditor } from '@/components/admin/editor/EnhancedStoreEditor';

/**
 * Editor del catálogo (`/tienda`). Reusa {@link EnhancedStoreEditor} con su propio
 * conjunto de settings (`tienda_*`) y secciones dinámicas filtradas por
 * `page='tienda'`.
 *
 * Mejoras vs PageEditor:
 * - Guardado automático en tiempo real (sin botón guardar)
 * - Selector visual de componentes como tarjetas
 * - UI/UX mejorada con animaciones suaves
 * - Mejor responsivo en móvil
 */
export function TiendaAdmin() {
  return (
    <EnhancedStoreEditor
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
        {
          title: 'Módulos móviles y navegación',
          fields: [
            { key: 'tienda_mobile_badge', label: 'Badge superior mobile' },
            { key: 'tienda_mobile_intro', label: 'Intro compacta mobile', multiline: true },
            { key: 'tienda_mobile_cta_label', label: 'Botón sticky mobile (texto)' },
            { key: 'tienda_mobile_cta_url', label: 'Botón sticky mobile (URL)' },
            { key: 'tienda_filtros_titulo', label: 'Título de filtros rápidos' },
            { key: 'tienda_filtros_tags', label: 'Filtros rápidos (separados por coma)' },
          ],
        },
        {
          title: 'Dropshipping y colecciones',
          fields: [
            { key: 'tienda_dropship_badge', label: 'Badge dropshipping' },
            { key: 'tienda_dropship_copy', label: 'Copy dropshipping', multiline: true },
            { key: 'tienda_colecciones_titulo', label: 'Título de colecciones' },
            { key: 'tienda_colecciones_subtitulo', label: 'Subtítulo de colecciones' },
            { key: 'tienda_banner_secundario_url', label: 'Imagen banner secundario', image: true },
            { key: 'tienda_banner_secundario_cta', label: 'CTA banner secundario' },
          ],
        },
        {
          title: 'Checkout y recomendaciones',
          fields: [
            { key: 'checkout_banner_titulo', label: 'Título banner checkout' },
            { key: 'checkout_banner_subtitulo', label: 'Subtítulo banner checkout', multiline: true },
            { key: 'checkout_relacionados_titulo', label: 'Título productos relacionados' },
            { key: 'checkout_relacionados_subtitulo', label: 'Subtítulo productos relacionados', multiline: true },
            { key: 'checkout_relacionados_tags', label: 'Etiquetas relacionadas (coma)' },
            { key: 'checkout_categorias_destacadas', label: 'Categorías destacadas (coma)' },
          ],
        },
      ]}
    />
  );
}

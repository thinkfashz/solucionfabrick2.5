'use client';

import { PageEditor } from '@/components/admin/cms/PageEditor';

/**
 * Editor de la pantalla principal (landing).
 *
 * Reusa el componente genérico {@link PageEditor} pasándole las claves de
 * `configuracion` que controlan el hero / footer y el mapa de componentes
 * estáticos visibles en `src/app/page.tsx`.
 */
export function HomeAdmin() {
  return (
    <PageEditor
      page="home"
      title="Pantalla principal"
      subtitle="Edita el hero, banners y secciones que ves en la landing. Reordena con ↑/↓. Cambios visibles inmediatamente en la home."
      previewPath="/"
      settingGroups={[
        {
          title: 'Hero, footer y redes',
          fields: [
            { key: 'hero_title', label: 'Título del hero' },
            { key: 'hero_subtitle', label: 'Subtítulo del hero' },
            { key: 'hero_cover_url', label: 'Imagen de portada (hero)', image: true },
            { key: 'copyright_text', label: 'Texto de copyright', hint: 'Usa {year} para insertar el año actual' },
            { key: 'social_facebook', label: 'Facebook (URL)' },
            { key: 'social_instagram', label: 'Instagram (URL)' },
            { key: 'social_tiktok', label: 'TikTok (URL)' },
          ],
        },
      ]}
      staticNodes={[
        {
          label: '<Navbar />',
          path: 'src/components/Navbar.tsx',
          description: 'Barra de navegación global con logo, menú y botón de WhatsApp.',
          tag: 'Client',
          settingKeys: ['logo_url', 'whatsapp'],
        },
        {
          label: '<Hero coverUrl={...} />',
          path: 'src/components/Hero.tsx',
          description: 'Sección hero de pantalla completa con imagen de portada editable.',
          tag: 'Client',
          settingKeys: ['hero_title', 'hero_subtitle', 'hero_cover_url'],
        },
        {
          label: '<HomeDynamicSections sections={sections} />',
          path: 'src/components/HomeDynamicSections.tsx',
          description: 'Renderiza las secciones dinámicas listadas debajo. Soporta hero, banner, cta, galería y custom.',
          tag: 'Server',
        },
        {
          label: '<LandingSections />',
          path: 'src/components/LandingSections.tsx',
          description: 'Secciones estáticas: servicios, galería de proyectos, beneficios, formulario y footer.',
          tag: 'Client',
          settingKeys: ['copyright_text', 'social_facebook', 'social_instagram', 'social_tiktok'],
        },
      ]}
    />
  );
}

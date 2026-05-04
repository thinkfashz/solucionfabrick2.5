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
          codePreview:
`// src/components/Navbar.tsx (extracto)
// El logo y el número de WhatsApp se leen de la tabla 'configuracion'.

const logoUrl   = settings.logo_url;    // URL de imagen del logo
const whatsapp  = settings.whatsapp;    // Ej: "56912345678"

<FabrickLogo />
<a href={\`https://wa.me/\${whatsapp}\`}>WhatsApp</a>`,
          guideSteps: [
            'Ve a la pestaña "Editor" y busca el campo "logo_url" para subir o pegar la URL del logo.',
            'Actualiza el campo "whatsapp" con el número completo sin guiones ni espacios (ej: 56912345678).',
            'Presiona "Guardar cambios" y recarga la Vista previa para confirmar los cambios.',
            'Para gestionar imágenes del logo, usa el panel de Medios en /admin/media.',
          ],
        },
        {
          label: '<Hero coverUrl={...} />',
          path: 'src/components/Hero.tsx',
          description: 'Sección hero de pantalla completa con imagen de portada editable.',
          tag: 'Client',
          settingKeys: ['hero_title', 'hero_subtitle', 'hero_cover_url'],
          codePreview:
`// src/app/page.tsx
// El Hero recibe 3 props desde la tabla 'configuracion':

<Hero
  coverUrl={settings.hero_cover_url}   // URL de la imagen de fondo
  heroTitle={settings.hero_title}       // Título principal (usa \\n para saltos de línea)
  heroSubtitle={settings.hero_subtitle} // Subtítulo descriptivo
/>

// Ejemplo de hero_title con salto de línea:
// "Edificamos\\ntu proyecto\\ncon calidad."`,
          guideSteps: [
            'En "Editor", edita "hero_title": escribe el titular principal. Usa \\n para separar líneas (ej: "Edificamos\\ntu proyecto").',
            'Edita "hero_subtitle" con un texto breve que explique tu propuesta de valor.',
            'Para cambiar la imagen de fondo, edita "hero_cover_url" con la URL o usa el selector de medios.',
            'Presiona "Guardar cambios". Los cambios se reflejan en tiempo real en la Vista previa.',
          ],
        },
        {
          label: '<HomeDynamicSections sections={sections} />',
          path: 'src/components/HomeDynamicSections.tsx',
          description: 'Renderiza las secciones dinámicas listadas debajo. Soporta hero, banner, cta, galería y custom.',
          tag: 'Server',
          codePreview:
`// src/components/HomeDynamicSections.tsx
// Lee secciones de la tabla 'home_sections' en la base de datos.

interface Section {
  id: string;
  kind: 'banner' | 'cta' | 'hero' | 'servicios' | 'galeria' | 'custom';
  title?: string;
  subtitle?: string;
  body?: string;
  image_url?: string;
  visible: boolean;
  sort_order: number;
}

// Las secciones se administran desde la pestaña "Editor" → bloque "Secciones dinámicas".`,
          guideSteps: [
            'Ve a la pestaña "Editor" y busca el bloque "Secciones dinámicas" para ver las secciones activas.',
            'Usa el botón "+ Añadir sección" para crear una nueva, elige el tipo (banner, CTA, galería…).',
            'Arrastra las tarjetas con las flechas ▲▼ para reordenar las secciones.',
            'Activa o desactiva secciones con el ícono de ojo. Los cambios se guardan al presionar "Guardar".',
          ],
        },
        {
          label: '<LandingSections />',
          path: 'src/components/LandingSections.tsx',
          description: 'Secciones estáticas: servicios, galería de proyectos, beneficios, formulario y footer.',
          tag: 'Client',
          settingKeys: ['copyright_text', 'social_facebook', 'social_instagram', 'social_tiktok'],
          codePreview:
`// src/components/LandingSections.tsx (extracto del footer)
// Las redes sociales y el copyright se leen de 'configuracion'.

const copyright = settings.copyright_text; // Ej: "© 2025 Soluciones Fabrick"
const facebook  = settings.social_facebook; // URL completa de Facebook
const instagram = settings.social_instagram;
const tiktok    = settings.social_tiktok;`,
          guideSteps: [
            'En "Editor", busca el campo "copyright_text" y actualiza el texto del pie de página.',
            'Copia y pega la URL completa de tu perfil en "social_facebook", "social_instagram" y "social_tiktok".',
            'Si no tienes una red social, deja el campo vacío: el ícono se ocultará automáticamente.',
            'Guarda los cambios y verifica en la Vista previa que los íconos apunten a los perfiles correctos.',
          ],
        },
      ]}
    />
  );
}

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
      subtitle="Panel de compatibilidad de la portada. Para editar la estructura real de Home usa Visual CMS → Estructura Home; para estilos, imágenes y cambios globales usa el Editor universal."
      previewPath="/"
      settingGroups={[
        {
          title: 'Ajustes globales compatibles',
          fields: [
            { key: 'copyright_text', label: 'Texto de copyright', hint: 'Usa {year} para el año. Ej: "© {year} Soluciones Fabrick SPA · Construcción Maule"' },
            { key: 'social_facebook', label: 'Facebook (URL completa)' },
            { key: 'social_instagram', label: 'Instagram (URL completa)' },
            { key: 'social_tiktok', label: 'TikTok (URL completa)' },
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
          label: '<HomeVisualRuntime />',
          path: 'src/components/cms/HomeVisualRuntime.tsx',
          description: 'Runtime vigente de la portada: renderiza secciones, aplica estilos y recibe el borrador en tiempo real.',
          tag: 'Client',
          settingKeys: [],
          codePreview:
`// src/app/page.tsx
<HomeVisualRuntime initialConfig={homePage} />

// La estructura se persiste bajo la clave "home-page".
// Los estilos universales se persisten bajo "visual-overrides".`,
          guideSteps: [
            'Abre /admin/editor/home-structure para editar textos, ordenar y añadir bloques de Home.',
            'Abre /admin/editor para seleccionar elementos, imágenes, colores, bordes y medidas de cualquier página.',
            'La vista previa recibe el borrador inmediatamente; Publicar guarda y verifica la versión del servidor.',
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

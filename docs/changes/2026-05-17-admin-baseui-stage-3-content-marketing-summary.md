# Migración visual admin · Etapa 3 · Contenido, marketing e IA

## Fecha
2026-05-17

## Rama

```txt
feature/admin-baseui-interface
```

## Objetivo

Revisar módulos de contenido, marketing e IA manteniendo datos reales, sin introducir datos demo ni simular publicaciones/campañas.

## Páginas revisadas

```txt
/admin/home
/admin/editor
/admin/tienda
/admin/blog
/admin/medios
/admin/asistente-ia
/admin/publicidad
/admin/publicidad/coach
/admin/publicar
/admin/newsletter
/admin/inteligencia-mercado
/admin/social
```

## Cambios aplicados

### /admin/blog

Estado: migrada a BaseUI/dark.

- Mantiene `BlogUploadPanel` real.
- Mantiene `SQLSetupGuide` real.
- El bloque Markdown queda como guía técnica, no como dato demo publicado.

### /admin/medios

Estado: corrección menor.

- Usa APIs reales `/api/admin/media` y `/api/admin/cloudinary`.
- Se corrigió el enlace de Cloudinary no configurado.
- Antes apuntaba a `/admin/configuracion`.
- Ahora apunta al centro oficial `/admin/integraciones`.

### /admin/social

Estado: migrada a BaseUI/dark.

- No inventa métricas.
- Mantiene contadores en `—` hasta tener datos reales del inbox.
- Enlaces reales a inbox, integraciones y MercadoLibre Q&A.
- Clarifica que los canales dependen de integraciones reales.

## Páginas revisadas sin reescritura

### /admin/home

- Usa `PageEditor` real.
- Trabaja con claves reales de configuración y secciones dinámicas.
- Las guías internas son documentación de edición, no datos demo.

### /admin/editor

- Usa API real `/api/admin/site-structure`.
- Guarda estructura real y previsualiza en iframe.
- No se reescribió para evitar romper el editor universal.

### /admin/tienda

- Usa `EnhancedStoreEditor` real.
- Edita settings y secciones reales de tienda.
- No se reescribió para evitar romper guardado/autosave.

### /admin/asistente-ia

- Usa endpoints reales de AI chat, modelos, stats, imagen y Cloudinary.
- Tiene hilos, mensajes, fallback, adjuntos y generación de imágenes.
- No se reescribió por ser módulo avanzado y sensible.

### /admin/publicidad

- Usa Meta Ads real vía `/api/meta/ads` y acciones masivas.
- Usa scraper real `/api/meta/ads/scrape`.
- No se reescribió por ser funcional.

### /admin/publicidad/coach

- Es honesto: depende de `/api/admin/ads/agent`.
- No simula resultados.
- Mantiene error claro si el endpoint no está listo.

### /admin/publicar

- Usa APIs reales de social upload/posts/publish.
- No simula publicación.
- TikTok queda como PNG descargable porque no hay API pública de subida automática.

### /admin/newsletter

- Usa APIs reales de campaigns y subscribers.
- Las plantillas rápidas son ayuda de redacción, no campañas publicadas.
- No se reescribió para no romper envío/suscriptores.

### /admin/inteligencia-mercado

- Usa endpoints reales de market intelligence, tendencias, histórico y SEO IA.
- Presets son sugerencias de búsqueda, no datos publicados.
- No se reescribió por ser módulo avanzado.

## Pendientes reales detectados

```txt
/admin/publicidad/coach: implementar /api/admin/ads/agent si se quiere activar agente real.
/admin/social: conectar métricas reales del inbox.
/admin/newsletter: opcional migración visual completa si se quiere homogeneizar más.
/admin/asistente-ia: opcional unificar con Fabrick AI Developer a futuro.
```

## Regla mantenida

```txt
No datos demo.
No simulaciones críticas.
No tocar endpoints reales que funcionan.
No merge ni deploy automático.
```

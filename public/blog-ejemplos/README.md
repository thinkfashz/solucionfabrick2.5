# 📚 Ejemplos de Artículos de Blog

Esta carpeta contiene ejemplos de artículos de blog en formato Markdown que puedes usar como referencia para crear los tuyos propios.

## Estructura de un Artículo

```yaml
---
title: "Título del artículo"
slug: "slug-url-amigable"
description: "Descripción corta para meta tags y listado"
date: "2026-05-04"
author: "Nombre del autor"
cover: "https://url-imagen.jpg"
tags: ["tag1", "tag2", "tag3"]
readingMinutes: 8
category: "categoría"
---

# Contenido en Markdown

Tu contenido aquí...
```

## Campos Obligatorios

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `title` | Título del artículo | "Guía de Metalcon 2026" |
| `slug` | URL amigable (sin espacios) | "guia-metalcon-2026" |
| `description` | Resumen 150-160 caracteres | "Análisis completo de..." |
| `date` | Fecha publicación YYYY-MM-DD | "2026-05-04" |
| `author` | Autor del artículo | "Juan Pérez" |
| `cover` | URL de imagen destacada | "https://..." |
| `tags` | Array de etiquetas | ["construcción", "costos"] |
| `readingMinutes` | Minutos estimados lectura | 8 |
| `category` | Categoría del artículo | "construcción" |

## Formato de Contenido

Usa Markdown estándar:

```markdown
# Encabezado H1
## Encabezado H2
### Encabezado H3

**Texto en negrita**
*Texto en cursiva*

- Viñeta 1
- Viñeta 2
  - Sub-viñeta

1. Numerado 1
2. Numerado 2

> Cita o resaltado

[Link](https://ejemplo.com)

![Imagen alt](https://url.jpg)
```

## Cómo Subir tu Artículo

### Opción 1: Panel de Admin (Recomendado)
1. Ve a `/admin/blog`
2. Haz clic en "Subir artículo .md"
3. Selecciona tu archivo `.md`
4. ¡Listo! El artículo aparecerá en tu blog

### Opción 2: Carpeta de Contenido
1. Copia tu archivo `.md` a `/public/blog-ejemplos/`
2. Sigue la estructura de nombres: `slug-url.md`
3. El sistema lo procesará automáticamente

## Tips para Mejores Artículos

✅ **Haz:**
- Títulos claros y descriptivos
- Párrafos cortos (2-3 líneas máximo)
- Subtítulos frecuentes para romper monotonía
- Ejemplos concretos y números reales
- Call-to-action al final

❌ **Evita:**
- Párrafos muy largos
- Jerga técnica sin explicación
- Imágenes de baja calidad
- Información desactualizada
- Spam de links internos

## Longitud Recomendada

- **Mínimo**: 600 palabras
- **Ideal**: 1.200-1.500 palabras
- **Máximo**: 3.000 palabras

## Categorías Disponibles

- `construcción`
- `remodelación`
- `presupuesto`
- `materiales`
- `diseño`
- `instalaciones`
- `sostenibilidad`
- `tendencias`

## SEO Best Practices

- Usa palabras clave en el título
- Incluye sinónimos en el contenido
- Links internos a otras páginas relevantes
- Meta descripción de 150-160 caracteres
- Al menos 3 imágenes de buena calidad

## Ejemplos Incluidos

1. **metalcon-vs-hormigon-2026.md**
   - Comparativa de dos materiales
   - Análisis de costos
   - Recomendaciones por tipo de proyecto

2. **calcular-presupuesto-remodelacion.md**
   - Guía paso a paso
   - Ejemplos de costos
   - Errores comunes

## ¿Necesitas Ayuda?

Si tienes preguntas sobre cómo crear artículos, contacta al equipo de Soluciones Fabrick.

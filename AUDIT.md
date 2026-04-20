# Soluciones Fabrick — Auditoría Técnica

## Estado Actual del Proyecto

- **Stack:** Next.js 14, TypeScript, Tailwind CSS 3.4, GSAP, Anime.js, Framer Motion (disponible)
- **Base URL:** fabrick.cl
- **Entorno de desarrollo:** localhost:3000
- **Raíz de la app:** `/fabrick-store/fabrick-store/src/app`

---

## Estructura de Páginas

| Ruta | Archivo | Tipo |
|------|---------|------|
| `/` | `app/page.tsx` | Server component — Landing |
| `/servicios` | `app/servicios/page.tsx` | Server component |
| `/soluciones` | `app/soluciones/page.tsx` | Server component |
| `/proyectos` | `app/proyectos/page.tsx` | Server component |
| `/evolucion` | `app/evolucion/page.tsx` | Server component |
| `/garantias` | `app/garantias/page.tsx` | Server component |
| `/contacto` | `app/contacto/page.tsx` | Server component |
| `/mi-cuenta` | `app/mi-cuenta/page.tsx` | Server component |
| `/tienda` | `app/tienda/page.tsx` | Client component |
| `/soluciones` | `app/soluciones/page.tsx` | Server component |
| `/auth` | `app/auth/page.tsx` | Client component |
| `/checkout` | `app/checkout/page.tsx` | Client component |
| `/ajustes` | `app/ajustes/page.tsx` | Server component |
| `/sync` | `app/sync/page.tsx` | Server component |
| `/producto/[id]` | `app/producto/[id]/page.tsx` | Dynamic route |
| `/api/presupuesto` | `app/api/presupuesto/` | API endpoint (estado: verificar) |

---

## ✅ Implementado

- [x] Layout base con `SectionPageShell` (Navbar + footer) en todas las sub-páginas
- [x] Tema visual consistente: negro/amarillo/blanco, tipografía uppercase bold
- [x] Metadata SEO en cada página (`title`, `description`)
- [x] Página de servicios con 12 servicios, stats y CTA section
- [x] Página de soluciones con diferenciadores, testimonios, proceso de trabajo y TiendaSection
- [x] Página de proyectos con proyecto destacado + grilla masonry de 8 proyectos y stats
- [x] Página de evolución con timeline 2016–2024, historia del fundador e hitos
- [x] Página de garantías con 8 cards, tabla comparativa y FAQ
- [x] Página de contacto con form enriquecido, cards de info, mapa, WhatsApp CTA y tipo de proyecto
- [x] Página mi-cuenta con perfil placeholder, historial de proyectos y atajos de configuración
- [x] TiendaSection con productos sincronizados desde base
- [x] ContactMap con mapa interactivo embebido
- [x] Hero animado con GSAP en landing
- [x] Sitemap (`sitemap.ts`) y robots (`robots.ts`) configurados
- [x] PWA manifest (`manifest.ts`)
- [x] Carrito con localStorage
- [x] Página de auth funcional
- [x] Logo inline SVG (sin blur)
- [x] iOS safe-area en `app-shell` class
- [x] TypeScript estricto — 0 errores en `tsc --noEmit`

---

## ⚠️ Mejoras Pendientes

- [ ] **API `/api/presupuesto`**: Verificar que el endpoint exista y retorne respuesta válida; el formulario de contacto apunta a esta ruta
- [ ] **Imágenes**: Usar `next/image` en lugar de `<img>` para optimización automática (WebP, lazy loading, CLS)
- [ ] **Formulario de contacto**: Agregar validación client-side (react-hook-form o nativa HTML5) y feedback de envío exitoso/error
- [ ] **SEO estructurado**: Agregar `JSON-LD` `schema.org` para páginas de servicios (`Service`) y empresa (`LocalBusiness`)
- [ ] **Accesibilidad**: Revisar `aria-label` en botones de icono, `alt` en imágenes y orden de focus en formularios
- [ ] **Animaciones**: Considerar separar GSAP y Anime.js en chunks distintos (code splitting) para reducir el bundle inicial
- [ ] **Auth flow**: Verificar estado de sesión en `/mi-cuenta` y `/checkout` — actualmente son placeholders estáticos
- [ ] **Cart persistence**: Migrar carrito de localStorage a backend o cookie segura para soporte multi-dispositivo
- [ ] **ThemeContext SSR**: Asegurar que el ThemeContext tenga guard de `typeof window !== 'undefined'` para evitar hydration mismatch
- [ ] **Error boundaries**: Agregar `error.tsx` y `not-found.tsx` en la raíz de `app/` para manejo consistente de errores
- [ ] **Rate limiting**: El endpoint `/api/presupuesto` necesita rate limiting básico para evitar spam en producción
- [ ] **Variables de entorno**: Revisar que todas las env vars de producción estén en `.env.production` y no expuestas en bundle cliente

---

## 🔴 Errores Conocidos / Posibles Issues

1. **Server/Client boundary**: Algunos componentes usan `'use client'` correctamente, pero `ThemeContext` necesita guard SSR (`typeof window !== 'undefined'`) para evitar hydration mismatch.
2. **Imágenes externas**: URLs de Unsplash usadas directamente — considerar `next/image` para optimización y control de CLS.
3. **Formulario contacto**: El action `/api/presupuesto` puede no existir — el form fallará silenciosamente en producción si el endpoint no está creado.
4. **Logo SVG**: Anteriormente renderizado como `<img>` generando blur — corregido a SVG inline.
5. **Mobile viewport**: iOS safe-area insets manejados en clase `app-shell` — verificar en dispositivos reales.
6. **Performance**: GSAP + Anime.js cargados en la misma página — podrían dividirse en chunks más pequeños para mejorar LCP.
7. **SEO**: Faltan datos estructurados (`JSON-LD`) para páginas de servicios y empresa.
8. **Accesibilidad**: Algunos elementos interactivos (botones de icono) sin `aria-label` explícito.
9. **Cart**: Almacenado solo en `localStorage` — sin persistencia en backend, vulnerable a pérdida de datos y XSS.
10. **Auth**: Página `/auth` existe pero el flujo completo (verificación de email, recuperación de contraseña) necesita testing end-to-end.

---

## 🔒 Seguridad

- No hay API keys expuestas en el código cliente.
- El formulario de contacto apunta a `/api/presupuesto` — **necesita protección CSRF** en producción.
- `localStorage` usado para carrito — riesgo XSS si se inyecta código externo; considerar sanitización de datos leídos.
- No se detectan variables de entorno sensibles en el bundle cliente.
- El endpoint de API debe validar y sanitizar todos los inputs antes de procesarlos.

---

## 🚪 Puertos Expuestos

| Puerto | Servicio | Contexto |
|--------|----------|----------|
| `3000` | Next.js dev server | Solo desarrollo local |
| `443` | HTTPS | Producción (Vercel / hosting) |
| Variable | Docker | Revisar `compose.yaml` en raíz del repositorio |

---

## 📊 Puntos de Mejora por Prioridad

### 🔴 Alta prioridad
1. Verificar y crear endpoint `/api/presupuesto` con validación y envío de email
2. Implementar SSR guard en `ThemeContext`
3. Agregar `error.tsx` y `not-found.tsx` globales

### 🟡 Media prioridad
4. Migrar imágenes a `next/image` con `domains` configurados en `next.config.js`
5. Agregar `JSON-LD` schema en páginas de servicios y contacto
6. Agregar feedback de éxito/error en formularios (toast o inline message)
7. Revisar accesibilidad con axe-core o Lighthouse

### 🟢 Baja prioridad
8. Code splitting GSAP/Anime.js
9. Migrar carrito a backend
10. Agregar tests e2e con Playwright para flujos críticos (form, checkout, auth)

---

## 📝 Historial de Cambios — Sesión Actual

### Páginas enriquecidas

| Página | Cambios |
|--------|---------|
| `/servicios` | Expandido de 6 a 12 servicios; añadidos features, precio referencial, stats strip y CTA final |
| `/soluciones` | Añadida grid de 6 diferenciadores, 3 testimonios con estrellas y sección de proceso en 4 pasos |
| `/proyectos` | Expandido de 3 a 8 proyectos en grilla masonry + proyecto destacado + stats (superficie, tiempo, satisfacción) |
| `/evolucion` | Timeline 2016–2024 con 9 fases, iconos, logros; nueva sección "Historia del fundador"; sección de hitos |
| `/garantias` | 8 cards de garantía con iconos e icono de período; tabla comparativa "Con/Sin Fabrick"; FAQ de 5 preguntas |
| `/contacto` | Banner de tiempo de respuesta; 4 cards de info de contacto; dropdown de tipo de proyecto; WhatsApp CTA verde |
| `/mi-cuenta` | Banner de auth; perfil placeholder; historial de 3 proyectos con estado; 4 atajos de configuración |

### Archivos creados
- `AUDIT.md` — este archivo

### Sin cambios
- Todos los demás componentes y páginas se mantienen intactos
- TypeScript compila sin errores (`tsc --noEmit` = 0 errores)

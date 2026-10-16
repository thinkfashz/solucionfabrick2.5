# Fabrick Studio v2 — Roadmap de implementación

Este documento define el orden de trabajo del editor visual de Soluciones Fabrick.
La regla de entrega es: muchos commits pequeños y reversibles, una preview validada por fase y un solo merge/deploy cuando la fase esté estable.

## Fase 1 — Base segura y edición móvil
Estado: EN VALIDACIÓN

- [x] Rama aislada desde main.
- [x] Visual CMS schema v2 compatible con schema v1.
- [x] Identidad persistente mediante cmsId con fallback a selector CSS.
- [x] Locks granulares: contenido, estilo, movimiento y eliminación.
- [x] Papelera reversible para overrides visuales.
- [x] Papelera reversible para secciones Home.
- [x] Locks de Home respetados por el bridge del editor universal.
- [x] Canvas virtual con 360/390/412/430/768/1024/1280/1440/1920 px.
- [x] Modo Fit y zoom 25/50/75/100 %.
- [x] Reordenamiento Home táctil con dnd-kit y TouchSensor.
- [x] Tests contractuales del CMS integrados al build.
- [ ] Typecheck + build completos del head exacto.
- [ ] Preview Vercel READY del head exacto.
- [ ] Smoke test manual en Android/desktop.
- [ ] Merge a main.

## Fase 2 — Capas y layout profesional
Estado: PENDIENTE

- [ ] Árbol Page → Section → Container → Element.
- [ ] Selección desde panel de capas para elementos superpuestos.
- [ ] Flexbox: direction, justify, align, wrap.
- [ ] CSS Grid: columns, rows, spans y gaps.
- [ ] Position: relative/absolute/sticky/fixed con offsets.
- [ ] z-index, overflow y aspect-ratio.
- [ ] Controles visuales para margin/padding.
- [ ] Acciones consistentes: mover, duplicar, ocultar, bloquear, papelera.
- [ ] Atajos teclado/táctil y accesibilidad.

## Fase 3 — Drafts, autosave y versiones
Estado: PENDIENTE

- [ ] Draft persistente en servidor por usuario/página.
- [ ] localStorage solo como recuperación offline.
- [ ] Autosave con debounce e indicador Guardando/Guardado.
- [ ] Separación explícita Guardar ≠ Publicar.
- [ ] Tabla de revisiones/snapshots.
- [ ] Historial de publicaciones.
- [ ] Restauración de una revisión completa.
- [ ] Preview por revisión antes de producción.

## Fase 4 — Componentes, bloques y assets
Estado: PENDIENTE

- [ ] Biblioteca universal de bloques.
- [ ] Guardar selección como bloque reusable.
- [ ] Componentes globales: navbar, footer, CTA, ProductCard, ServiceCard.
- [ ] Instancias vinculadas + opción Detach.
- [ ] Asset Manager integrado con Cloudinary.
- [ ] Upload, búsqueda, usados/sin usar.
- [ ] Variantes responsive de imágenes y optimización WebP/AVIF.
- [ ] Gestión de alt/title y encuadre visual.

## Fase 5 — Datos dinámicos y componentes funcionales
Estado: PENDIENTE

- [ ] Bindings Producto → nombre/precio/stock/imagen/categoría.
- [ ] Bindings Servicio → datos comerciales.
- [ ] Diferenciar elemento libre, componente y componente funcional.
- [ ] Proteger Checkout/Mercado Pago/carrito/calculadoras/simuladores.
- [ ] Editar presentación sin permitir romper lógica.
- [ ] Design tokens globales de Fabrick.

## Fase 6 — Fabrick Studio release
Estado: PENDIENTE

- [ ] UI móvil final con Capas / Agregar / Editar / Publicar.
- [ ] Gestos táctiles coherentes.
- [ ] Auditoría de rendimiento.
- [ ] Auditoría de accesibilidad.
- [ ] Pruebas E2E editor → preview → publicación → restauración.
- [ ] Documentación de operación.
- [ ] Release estable Fabrick Studio v2.

## Política de merge

1. Trabajar siempre en rama de fase.
2. Cada capacidad significativa debe quedar en un commit propio.
3. Ejecutar tests y build en el head exacto.
4. Validar una sola preview final de la fase.
5. No promover a producción si el head validado cambia.
6. Merge a main únicamente después de la validación.

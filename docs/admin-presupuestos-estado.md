# Estado del panel de presupuestos

## Implementado

- **Dashboard superior**: tarjetas con Activos, Aprobados, Vencidos y Total cotizado.
- **Lista lateral mejorada**: buscador por cliente/título/empresa, filtro por estado, badge de estado visual, total con IVA, fecha de vencimiento, presupuestos vencidos marcados con `⚠ Vencido`.
- **Nuevos tabs**: `calendario` y `radier` agregados, manteniendo todos los existentes (datos, items, secciones, imágenes, video, json, html, preview, registros BD).
- **Estado visual de guardado**: badge con 5 estados: `idle`, `guardado local`, `sincronizando BD`, `guardado BD`, `error BD pero local OK`.
- **Botón "Guardar y activar"**: marca estado como `enviado`, guarda `fecha_activacion` y sincroniza BD.
- **Tab Calendario**: muestra fecha creación, activación, vencimiento; días restantes; advertencia si vencido; atajos +3, +5, +7, +15, +30 días. No elimina presupuestos.
- **Calculadora de Radier** (`src/components/admin/presupuestos/RadierCalculator.tsx`): modo trompo o camión preparado, campos de dimensiones y precios, cálculo automático de área, volúmenes, sacos, arena, paladas estimadas, subtotal, margen y total.
- **Botón "Agregar al presupuesto"** en la calculadora: inserta item `Radier de hormigón` con desglose como descripción y también lo agrega a observación técnica. Redirige a tab items.
- **Mejoras de items**: botones mover arriba/abajo, duplicar item, subtotales por categoría, total visible en encabezado.
- **Imágenes**: botón estrella para marcar imagen como hero (orden 1), MediaPicker existente intacto.
- **BD tolerante**: el `save()` omite el campo `archivos` al enviar al API (usando desestructuración `{ archivos: _archivos, ...safePayload }`), evitando el error `Could not find the 'archivos' column`.

## Archivos modificados

- `src/app/admin/presupuestos/page.tsx` — reescrito con todas las mejoras
- `src/components/admin/presupuestos/RadierCalculator.tsx` — componente nuevo
- `src/lib/presupuestosBuilder.ts` — agregado campo `fecha_activacion?: string` al tipo `PresupuestoPro`
- `docs/admin-presupuestos-estado.md` — este archivo

## Pendiente

- Pulir diseño móvil (la grid de 8 columnas en items puede requerir ajuste en pantallas pequeñas).
- Mejorar historial CRM por cliente.
- Crear plantillas rápidas de partidas (mobiliario, radier, pintura, etc.).
- Integrar timeline de cliente (estado aprobado → pago → entrega).
- Validar con BD real que `presupuesto_json` almacena correctamente los nuevos campos (`fecha_activacion`).
- Revisar columnas definitivas de la tabla `presupuesto_registros` para agregar `fecha_activacion` si se quiere consultarla directamente.

## Errores conocidos

- Si la BD no tiene columnas opcionales, el fallback local funciona correctamente.
- La "autodestrucción" por ahora no elimina: solo marca vencido/desactivado visualmente con tachado y advertencia.
- El campo `archivos` no se envía al API para evitar el error de columna inexistente en el schema cache; sigue guardándose dentro de `presupuesto_json` (JSONB).

## Cómo probar manualmente

1. Abrir `/admin/presupuestos`.
2. Verificar que el dashboard superior muestra conteos correctos.
3. Usar el buscador para filtrar por nombre de cliente.
4. Crear presupuesto nuevo con botón "Nuevo".
5. Editar datos en tab "Datos".
6. Agregar item en tab "Items", probar mover arriba/abajo y duplicar.
7. Ir a tab "Radier", ingresar largo y ancho, elegir modo (trompo/camión), ajustar precios.
8. Verificar que el resumen de cálculo aparece al tener largo y ancho > 0.
9. Pulsar "Agregar al presupuesto" → debe ir a tab "Items" con el radier insertado.
10. Ir a tab "Calendario", configurar fecha de vencimiento y probar atajos +7d, +30d.
11. Pulsar "Guardar + BD" y observar el badge de estado (syncing → saved o error).
12. Pulsar "Guardar y activar" → estado debe pasar a `enviado` y fecha_activacion debe llenarse.
13. Abrir tab "Registros BD" y verificar que aparece el registro.
14. Ir a tab "Imágenes", agregar imagen y pulsar el botón estrella para marcarla como hero.

## Siguientes mejoras recomendadas

- Mini CRM por cliente: historial de presupuestos y conversaciones.
- Historial de actividad por presupuesto (quién guardó, cuándo, qué cambió).
- Plantillas de construcción: radier, tabiquería, pintura, cielos, etc.
- Exportación PDF profesional con branding (actualmente solo impresión del navegador).
- Estadísticas mensuales: total cotizado, tasa de aprobación, promedio por cliente.
- Sistema de aprobación digital: link con firma o confirmación del cliente.
- Agregar columna `fecha_activacion` a `presupuesto_registros` para consultarla en la tabla de registros.

## Qué no se debe hacer todavía

- No ejecutar migraciones destructivas en `presupuesto_registros` sin validar con el equipo.
- No eliminar automáticamente presupuestos vencidos: la autodestrucción es solo visual.
- No cambiar el `PRESUPUESTOS_PRO_STORAGE_KEY` de localStorage sin migrar los datos existentes.

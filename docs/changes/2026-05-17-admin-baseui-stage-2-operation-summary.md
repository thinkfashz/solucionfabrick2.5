# Migración visual admin · Etapa 2 · Operación real

## Fecha
2026-05-17

## Rama

```txt
feature/admin-baseui-interface
```

## Objetivo

Revisar y mejorar módulos operativos manteniendo datos reales, sin introducir datos demo ni simular funcionalidad.

## Páginas revisadas

```txt
/admin/pedidos
/admin/clientes
/admin/inventario
/admin/inventario/scan
/admin/cotizaciones
/admin/presupuestos
/admin/pagos
/admin/entregas
/admin/materiales
/admin/proyectos
/admin/cupones
/admin/reviews
```

## Cambios aplicados

### /admin/clientes

Archivo:

```txt
src/app/admin/clientes/page.tsx
```

Cambio:

- Migrada a estilo BaseUI/dark.
- Mantiene datos reales desde tabla `orders`.
- Agrupa clientes desde pedidos reales.
- Agrega métricas reales:
  - clientes;
  - pedidos;
  - ingresos;
  - mayor cliente por total gastado.
- Mantiene modal de historial real.

### /admin/inventario

Archivo:

```txt
src/app/admin/inventario/page.tsx
```

Cambio:

- Migrada a estilo BaseUI/dark.
- Mantiene fuente real `/api/admin/estado`.
- Corrige botón actualizar: ahora vuelve a consultar datos reales.
- Mantiene enlaces reales a catálogo, scanner, estado y pedidos.

### /admin/inventario/scan

Archivo:

```txt
src/app/admin/inventario/scan/page.tsx
```

Cambio:

- Migrada a estilo BaseUI/dark.
- Mantiene scanner real con cámara.
- No finge movimientos reales de inventario.
- Indica explícitamente que falta lookup real por SKU/EAN para escribir `inventory_movements`.

### /admin/proyectos

Archivo:

```txt
src/app/admin/proyectos/page.tsx
```

Cambio:

- Si `/api/proyectos` responde `source: seed`, el admin ya no muestra proyectos demo/seed como si fueran reales.
- El admin muestra aviso de tabla `projects` faltante.
- Mantiene enlace a `/admin/setup`.
- Solo muestra proyectos cuando la fuente es `db`.

### /admin/cupones

Archivo:

```txt
src/app/admin/cupones/page.tsx
```

Cambio:

- Migrada a estilo BaseUI/dark.
- Ya no parece un módulo funcional simulado.
- Muestra estado pendiente real.
- Indica que falta tabla/API/validación backend antes de activarlo.

### /admin/reviews

Archivo:

```txt
src/app/admin/reviews/page.tsx
```

Cambio:

- Migrada a estilo BaseUI/dark.
- Ya no sugiere que existan reseñas reales si no hay tabla/API.
- Muestra estado pendiente real.
- Indica que faltan endpoints, moderación, anti-spam y auditoría.

## Páginas revisadas sin reescritura

### /admin/pedidos

Estado:

- Usa datos reales desde `orders`.
- Usa realtime InsForge con fallback polling.
- Gráficas y filtros reales.
- No requiere reescritura completa en esta etapa.

### /admin/cotizaciones

Estado:

- Usa datos reales desde `quotes`.
- Actualiza estados reales.
- Tiene calculadora de presupuesto interna.
- No se reescribió para evitar romper funcionalidad.

### /admin/presupuestos

Estado:

- Crea presupuestos reales vía `/api/presupuestos`.
- Envía email vía `/api/send-budget`.
- Genera link y WhatsApp real.
- No se reescribió para evitar romper flujo sensible.

### /admin/pagos

Estado:

- Usa `/api/admin/payments/mp-status`.
- Muestra MercadoPago real, modo producción/sandbox, latencia y KPIs.
- No requiere reescritura completa.

### /admin/entregas

Estado:

- Usa tabla `deliveries`.
- Usa realtime con fallback polling.
- Actualiza entregas reales y sincroniza orders best-effort.
- No se reescribió para evitar romper operación.

### /admin/materiales

Estado:

- Usa CRUD real con `/api/admin/materials`.
- Pendiente real: upload de imagen todavía usa preview local `URL.createObjectURL(file)`.
- No se modificó para no romper CRUD, pero queda pendiente conectar upload real.

## Pendientes reales detectados

```txt
1. /admin/materiales: conectar upload real de imágenes.
2. /admin/inventario/scan: conectar SKU/EAN con catálogo y movimientos reales.
3. /admin/cupones: crear tabla, API, validaciones y aplicación en checkout.
4. /admin/reviews: crear tabla, API, moderación, anti-spam y publicación.
5. Ejecutar typecheck/lint/build antes de merge.
```

## Regla mantenida

```txt
No datos demo.
No simular funcionalidades críticas.
No tocar endpoints reales que funcionan.
No merge ni deploy automático.
```

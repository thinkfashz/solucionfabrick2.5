# Memoria técnica · Migración visual Admin BaseUI/shadcn

Fecha: 2026-05-17
Rama activa: `feature/admin-baseui-interface`

## Objetivo

Adaptar el admin de Soluciones Fabrick a una interfaz oscura, moderna, modular y consistente inspirada en `next-shadcn-admin-dashboard-baseui`, manteniendo los datos reales de la app.

Referencia visual:

```txt
https://github.com/arhamkhnz/next-shadcn-admin-dashboard-baseui.git
```

El repositorio de referencia usa licencia MIT. La estrategia es adaptar conceptos visuales, no copiar datos demo ni reemplazar lógica real.

## Reglas obligatorias

1. No tocar `main` directo.
2. No hacer merge automático.
3. No hacer deploy automático.
4. No meter datos demo.
5. No reemplazar datos reales.
6. No romper queries, endpoints ni lógica de negocio.
7. Migrar por etapas.
8. Mantener dark mode como predeterminado.
9. Unificar PC y móvil progresivamente.
10. Documentar cada etapa.

## Estado previo de la rama

Ya creado:

```txt
src/components/admin/baseui-kit.tsx
src/components/admin/AdminBaseThemeFrame.tsx
src/app/admin/layout.tsx
src/app/admin/modulos/page.tsx
docs/changes/2026-05-17-admin-baseui-interface-stage-1.md
```

## Kit UI agregado

Archivo:

```txt
src/components/admin/baseui-kit.tsx
```

Componentes disponibles:

```txt
AdminBasePage
AdminBaseGrid
AdminBaseCard
AdminBaseMetric
AdminBaseButton
```

Estos componentes permiten migrar páginas sin tocar datos reales.

## Frame visual global

Archivo:

```txt
src/components/admin/AdminBaseThemeFrame.tsx
```

Se aplicó en:

```txt
src/app/admin/layout.tsx
```

Efecto:

- fondo dark global;
- grid sutil;
- brillos radiales;
- base visual común para `/admin/*`.

## Conteo detectado

Desde el menú `AdminContextMenu.tsx`:

```txt
9 bloques de navegación
60 opciones visibles
59 rutas únicas aprox.
```

Bloques:

```txt
Módulos 1–7
Seguridad & acceso
Visión general
Operación
Contenido
Marketing & IA
Integraciones
MercadoLibre
Sistema
```

## Plan de migración

### Etapa 1 · Críticas principales

Objetivo: mejorar páginas que afectan seguridad, productos, integraciones y control.

Rutas:

```txt
/admin
/admin/modulos
/admin/productos
/admin/integraciones
/admin/equipo
/admin/sesiones
/admin/ai-developer
/admin/estado
/admin/monitor
/admin/sql
/admin/vercel-logs
/admin/configuracion
```

Estado:

```txt
/admin/modulos: migrada
/admin/layout: frame global aplicado
resto: pendiente
```

### Etapa 2 · Operación real

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

### Etapa 3 · Contenido, marketing e IA

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

### Etapa 4 · MercadoLibre y sistema extendido

```txt
/admin/ml
/admin/ml/buscar
/admin/ml/publicaciones
/admin/ml/pedidos
/admin/ml/preguntas
/admin/ml/precios
/admin/extensions
/admin/facturas
/admin/envios
/admin/observatory
```

### Etapa 5 · Navegación unificada

- Unificar sidebar PC.
- Unificar menú hamburguesa móvil.
- Agregar rutas faltantes.
- Quitar duplicados visuales.
- Mantener `/admin/center` solo como redirect.

## Estrategia técnica

No reescribir páginas grandes completas si tienen lógica sensible.

Método preferido:

1. Envolver con `AdminBasePage` cuando sea simple.
2. Crear componentes visuales pequeños reutilizables.
3. No tocar fetch/queries.
4. No cambiar nombres de campos.
5. No introducir arrays demo.
6. Documentar cada página migrada.

## Próximo paso

Continuar Etapa 1 con páginas críticas:

```txt
/admin/productos
/admin/integraciones
/admin/equipo
/admin/sesiones
```

Antes de modificar cada una, revisar estructura actual del archivo y aplicar cambios mínimos.

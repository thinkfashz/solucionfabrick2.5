# Fabrick — límite entre deploy y base de datos

## Regla

Un build de Vercel debe ser reproducible y no debe alterar el esquema ni sembrar datos de producción.

Desde 2026-09-10, `pnpm build` ejecuta gates de regresión y `next build`, pero no llama endpoints de SQL irrestricto ni ejecuta scripts `ensure-*-schema`/seed.

La causa del cambio fue un fallo real de preview con InsForge `HTTP 403: Unrestricted SQL execution is disabled on this project`. Esa restricción se mantiene; no debe reactivarse solo para hacer pasar un deploy.

## Estado verificado antes de desacoplar

- `/api/tienda/products` en producción respondió HTTP 200 y expuso `category_name`; el catálogo/seed requerido ya existe.
- El último preview `READY` anterior al cambio respondió HTTP 200 en `/api/inspiraciones/comments`; la tabla de comentarios requerida por PR #310 ya existe.

Por eso el deploy no necesita recrear estas estructuras en cada compilación.

## Migraciones futuras

Los scripts históricos de bootstrap permanecen en el repositorio como referencia operativa, pero no forman parte del build. Una migración nueva debe:

1. estar versionada y revisada;
2. ejecutarse explícitamente en un contexto de administración/migración de InsForge, no como efecto secundario de `next build`;
3. probarse antes sobre un entorno no productivo cuando cambie datos o constraints;
4. disponer de verificación posterior y rollback/forward-fix;
5. llegar al PR con el esquema ya aplicado o con un bloqueo operativo explícito antes de fusionar.

InsForge recomienda gestionar cambios de esquema como migraciones controladas; usar SQL irrestricto desde un deploy no es el mecanismo de entrega de la aplicación.

## Gate

`tests/unit/deploymentBoundaryContract.test.ts` impide volver a acoplar DDL/seed al `buildCommand` de Vercel.

Antes de cerrar PR #310 se mantiene obligatorio `pnpm pr:preclose`, preview `READY` del SHA exacto y smoke de las rutas principales.

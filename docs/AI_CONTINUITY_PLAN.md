# AI_CONTINUITY_PLAN.md

Plan de continuidad tecnica para `thinkfashz/solucionfabrick2.5`.

Este archivo existe para que cualquier IA o desarrollador entienda el estado del proyecto, mantenga el enfoque, no cree archivos innecesarios y documente cada mejora antes de continuar.

## 1. Objetivo

Evitar que el proyecto pierda coherencia entre sesiones. Cada mejora debe quedar documentada con:

- que problema real se ataco;
- que archivos se modificaron;
- donde quedo la app;
- que pruebas se ejecutaron;
- que queda pendiente;
- cual es el siguiente paso recomendado.

## 2. Estado actual conocido

Proyecto: aplicacion Next.js 15 con React 19, TypeScript strict, TailwindCSS, App Router, panel admin, PWA, multi-tenant, pagos, email y Sentry.

Archivos clave:

- `package.json`: scripts, dependencias y herramientas.
- `next.config.mjs`: Sentry, headers, standalone, optimizacion de imports y paquetes externos.
- `src/middleware.ts`: proteccion de admin, sesion, tenant resolution, CSP con nonce y tenants suspendidos.
- `tsconfig.json`: TypeScript strict.
- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`: monitoreo.
- `tests/`: pruebas unitarias y e2e.
- `docs/`: documentacion tecnica.

Scripts importantes:

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:coverage
```

## 3. Regla principal

Antes de crear cualquier archivo nuevo, revisar si ya existe una ubicacion correcta.

No crear archivos duplicados como:

- `utils2.ts`
- `helpers-new.ts`
- `final-version.ts`
- `backup.ts`
- `component-copy.tsx`
- carpetas paralelas tipo `admin-v2`, `components-new`, `api-old`

Primero buscar en:

- `src/lib/`
- `src/components/`
- `src/app/`
- `src/app/api/`
- `src/app/admin/`
- `tests/`
- `docs/`

## 4. Prioridades reales

### Prioridad 1: seguridad y estabilidad

1. Crear validacion centralizada de variables de entorno.
2. Eliminar secretos por defecto en produccion.
3. Asegurar cookies de sesion admin.
4. Agregar rate limiting en login, formularios, APIs publicas y pagos.
5. Validar payloads de APIs con Zod.
6. Revisar permisos por rol en admin.
7. Registrar acciones criticas del panel admin.

### Prioridad 2: produccion robusta

1. Crear CI/CD con `typecheck`, `lint`, `test` y `build`.
2. Crear health check `/api/health`.
3. Agregar logs estructurados para pagos, emails, login y tenant.
4. Completar Sentry con tags de tenant, usuario, ruta y operacion.
5. Documentar variables de entorno requeridas.
6. Mejorar fallback de tenant/domain para evitar mostrar contenido incorrecto.

### Prioridad 3: rendimiento

1. Lazy load de dependencias pesadas: Monaco, Three.js, Recharts, GSAP, html2canvas y jsPDF.
2. Separar bundles publicos y admin.
3. Optimizar imagenes con `next/image`, WebP/AVIF y tamanos correctos.
4. Evitar `no-store` cuando se pueda usar `revalidate`.
5. Cachear tenant/domain de forma mas fuerte que solo cookie.

### Prioridad 4: UI y experiencia

Solo despues de seguridad, estabilidad y rendimiento:

1. Mejorar landing publica.
2. Mejorar admin responsivo.
3. Mejorar formularios.
4. Mejorar dashboard.
5. Agregar animaciones sin afectar velocidad.
6. Mejorar experiencia PWA movil.

## 5. Riesgos detectados

### Sesion admin

Revisar `src/middleware.ts`. No debe existir un secreto por defecto en produccion para `ADMIN_SESSION_SECRET`.

Accion recomendada:

- crear `src/lib/env.ts`;
- exigir `ADMIN_SESSION_SECRET` en produccion;
- fallar temprano si falta.

### Tenant resolution

`src/middleware.ts` resuelve tenants por host, subdominio y dominio personalizado.

Cuidado: si falla la resolucion de un dominio personalizado, no se debe mostrar contenido de otro tenant por accidente.

### Dependencias pesadas

Vigilar imports de:

- `monaco-editor`
- `@monaco-editor/react`
- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `recharts`
- `gsap`
- `framer-motion`
- `html2canvas`
- `jspdf`

Estas dependencias deben cargarse solo donde se usen.

## 6. Como documentar cada mejora

Cada mejora debe crear una nota en:

```txt
docs/changes/YYYY-MM-DD-nombre-corto.md
```

Plantilla obligatoria:

```md
# Mejora: Nombre

## Fecha
YYYY-MM-DD

## Objetivo
Problema real que se ataco.

## Estado anterior
Como estaba antes.

## Implementacion
Que se cambio.

## Archivos modificados
- `ruta/archivo.ts`: descripcion corta.

## Pruebas realizadas
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Riesgos o pendientes
Que queda pendiente.

## Siguiente paso recomendado
Que debe hacer la proxima IA o desarrollador.
```

Si se modifica codigo productivo y no se documenta, la mejora queda incompleta.

## 7. Checklist antes de terminar una mejora

Ejecutar o documentar por que no se pudo ejecutar:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Si toca flujos visuales o negocio:

```bash
pnpm test:e2e
```

Revisar tambien:

- `/admin/login`
- middleware
- tenant/domain
- PWA/service worker
- pagos
- email
- variables de entorno
- documentacion en `docs/changes/`

## 8. Flujo obligatorio para una nueva IA

Antes de tocar codigo:

1. Leer `docs/AI_CONTINUITY_PLAN.md`.
2. Leer `package.json`.
3. Leer `next.config.mjs`.
4. Leer `src/middleware.ts`.
5. Revisar la nota mas reciente en `docs/changes/`.
6. Identificar el error real o mejora solicitada.
7. Hacer el cambio minimo necesario.
8. Modificar solo archivos necesarios.
9. Ejecutar pruebas o documentar si no se pudieron ejecutar.
10. Crear nota de cambio en `docs/changes/`.

## 9. Siguiente mejora recomendada

1. Crear `src/lib/env.ts` con validacion de variables de entorno.
2. Ajustar `src/middleware.ts` para no permitir `ADMIN_SESSION_SECRET` por defecto en produccion.
3. Crear `docs/changes/2026-05-15-env-and-admin-session-hardening.md`.
4. Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build`.

## 10. Registro rapido

| Fecha | Mejora | Archivos principales | Estado | Siguiente paso |
|---|---|---|---|---|
| 2026-05-15 | Creacion de plan de continuidad IA | `docs/AI_CONTINUITY_PLAN.md` | Documentado | Endurecer env y sesion admin |

## 11. Regla final

La prioridad no es crear mas archivos ni mas pantallas.

La prioridad es dejar el sistema mas claro, seguro, rapido, coherente y mantenible que antes.

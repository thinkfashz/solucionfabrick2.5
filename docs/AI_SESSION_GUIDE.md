# AI_SESSION_GUIDE.md

Guia de arranque para cualquier IA o desarrollador que trabaje en SolucionFabrick 2.5.

Este archivo debe leerse antes de crear codigo, modificar archivos o proponer mejoras. Su funcion es hacer que la IA adopte automaticamente el enfoque correcto sin que Eduardo tenga que repetir instrucciones en cada sesion.

## Rol operativo

Trabajar como arquitecto tecnico principal, ingeniero full-stack senior, auditor de seguridad, especialista en rendimiento y documentador tecnico.

La responsabilidad principal es proteger la coherencia del sistema y construir con disciplina.

## Mentalidad de trabajo

SolucionFabrick 2.5 es una app de negocio real en etapa pre-produccion avanzada.

No debe tratarse como una simple landing ni como un experimento visual.

El trabajo debe seguir este orden:

1. Estabilidad
2. Seguridad
3. Modularidad
4. Rendimiento
5. Experiencia visual

## Lectura obligatoria antes de tocar codigo

1. `docs/AI_CONTINUITY_PLAN.md`
2. `docs/AI_PROJECT_MEMORY.md`
3. `docs/AI_SESSION_GUIDE.md`
4. `package.json`
5. `next.config.mjs`
6. `src/middleware.ts`
7. La nota mas reciente dentro de `docs/changes/`, si existe.

## Reglas de coherencia

- No crear archivos innecesarios.
- No duplicar componentes, hooks, servicios ni utilidades.
- No crear carpetas vacias.
- No crear archivos con nombres tipo `copy`, `backup`, `final`, `v2` o `new`.
- No mover toda la arquitectura de golpe.
- No agregar dependencias nuevas sin justificar.
- No tocar rutas criticas sin documentar.
- No priorizar diseno si hay riesgos de entorno, sesion, tenant, APIs, pagos, email o build.

## Modularizacion progresiva

La app debe modularse por dominios reales, no por carpetas decorativas.

Dominios posibles cuando sean necesarios:

- auth
- admin
- tenant
- catalog
- products
- checkout
- payments
- emails
- media
- analytics
- pwa
- security

No crear modulos vacios. Crear o mover codigo solo cuando una mejora real toque ese dominio.

## Criterio para crear archivos nuevos

Crear un archivo nuevo solo si:

- separa una responsabilidad real;
- reduce complejidad;
- centraliza validacion;
- mejora seguridad;
- permite pruebas;
- documenta una mejora;
- evita duplicacion futura;
- crea una frontera modular clara.

## Prioridad tecnica actual

La siguiente mejora tecnica recomendada es:

1. Crear validacion centralizada de variables de entorno.
2. Endurecer `ADMIN_SESSION_SECRET` para que no tenga fallback inseguro en produccion.
3. Documentar la mejora en `docs/changes/`.
4. Ejecutar o documentar pruebas: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.

## Documentacion obligatoria de mejoras

Cada mejora real debe dejar una nota en:

`docs/changes/YYYY-MM-DD-nombre-corto.md`

La nota debe incluir:

- contexto;
- problema real;
- decision tecnica;
- implementacion;
- archivos modificados;
- pruebas realizadas;
- estado en que queda la app;
- siguiente paso recomendado.

## Relacion con la vision de Eduardo

Eduardo esta construyendo una app con mentalidad de producto y arquitectura. Tiene vision y velocidad. La IA debe ayudar a convertir esa energia en sistema: ordenar, priorizar, construir, documentar y proteger la coherencia.

La IA no debe seguir cada idea sin filtrar. Debe mantener el foco en lo que hace la app mas clara, segura, rapida y mantenible.

## Regla final

Cada cambio debe dejar el proyecto mas claro, seguro, rapido o mantenible que antes.

Si un cambio no cumple eso, no debe hacerse todavia.

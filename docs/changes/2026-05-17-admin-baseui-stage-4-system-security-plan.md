# Migración visual admin · Etapa 4 · Sistema, seguridad y herramientas técnicas

## Fecha
2026-05-17

## Rama

```txt
feature/admin-baseui-stage-4-system-security
```

## Tipo de PR

PR apilado sobre:

```txt
feature/admin-baseui-interface
```

Esto permite continuar las etapas sin mezclar todavía con `main`. Al final se debe crear una rama final de integración para abrir un único PR limpio hacia `main`.

## Objetivo

Revisar y mejorar módulos técnicos del admin: seguridad, sesiones, equipo, diagnóstico, logs, SQL, setup, database y herramientas IA/dev.

## Rutas de Etapa 4

```txt
/admin/seguridad
/admin/passkeys
/admin/sesiones
/admin/equipo
/admin/estado
/admin/monitor
/admin/observatory
/admin/vercel-logs
/admin/sql
/admin/setup
/admin/database
/admin/diagnostico-apis
/admin/ai-developer
/admin/modulos
```

## Reglas

- No tocar credenciales reales ni exponer secretos.
- No crear pantallas duplicadas.
- Mantener `/admin/integraciones` como único centro oficial de API keys.
- No simular métricas de seguridad.
- No activar merge/deploy automático.
- No reescribir páginas sensibles si ya están funcionales.
- Documentar hallazgos y pendientes reales.

## Estado heredado

Etapas 1, 2 y 3 están en:

```txt
feature/admin-baseui-interface
PR #189
```

Incluyen:

- BaseUI kit;
- frame oscuro global;
- monitor real;
- configuración limpia;
- clientes/inventario/social/blog migrados;
- proyectos restaurado y sin seed/demo;
- documentación de avance.

## Pendiente de esta etapa

Clasificar cada ruta como:

```txt
real y alineada
requiere UI BaseUI
requiere eliminar duplicado
requiere conexión real
pendiente explícito
```

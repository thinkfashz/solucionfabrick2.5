# Migración visual admin · Etapa 1 · Correcciones reales

## Fecha
2026-05-17

## Contexto

Durante la auditoría de páginas críticas se encontraron dos problemas reales:

1. `/admin/monitor` usaba datos simulados con `Math.random()`.
2. `/admin/configuracion` todavía contenía un centro antiguo de integraciones/API keys, duplicando `/admin/integraciones`.

## Corrección 1 · Monitor real

Archivo modificado:

```txt
src/components/admin/monitor/SystemMonitor.tsx
```

Antes:

- servicios hardcodeados;
- latencias simuladas;
- uptime simulado;
- cambios con `Math.random()`.

Ahora:

- consume `/api/admin/health`;
- muestra servicios reales;
- muestra latencia real;
- muestra uptime real;
- muestra offline/unconfigured reales;
- mantiene diseño oscuro BaseUI.

## Corrección 2 · Configuración limpia

Archivos modificados:

```txt
src/components/admin/settings/AdminBusinessSettingsPage.tsx
src/app/admin/configuracion/page.tsx
```

Antes:

- `/admin/configuracion` incluía datos del negocio;
- cambio de contraseña;
- y también administración de API keys externas.

Ahora:

- `/admin/configuracion` queda enfocada en:
  - datos reales del negocio;
  - sesión admin actual;
  - cambio real de contraseña con InsForge Auth;
  - enlaces hacia `/admin/integraciones` y `/admin/sesiones`.

Las API keys se administran únicamente desde:

```txt
/admin/integraciones
```

## Regla establecida

```txt
/admin/integraciones = único centro oficial de credenciales
/admin/configuracion = negocio + acceso admin
```

## Estado de Etapa 1

Revisadas:

```txt
/admin
/admin/modulos
/admin/productos
/admin/integraciones
/admin/equipo
/admin/sesiones
/admin/estado
/admin/monitor
/admin/sql
/admin/vercel-logs
/admin/configuracion
```

Cambios reales aplicados:

```txt
/admin/layout: frame oscuro global
/admin/modulos: shell BaseUI
/admin/monitor: datos reales desde /api/admin/health
/admin/configuracion: eliminada duplicación de integraciones
```

Pendiente para cerrar etapa:

```txt
verificar diff
abrir PR si aún no existe
no merge ni deploy automático
```

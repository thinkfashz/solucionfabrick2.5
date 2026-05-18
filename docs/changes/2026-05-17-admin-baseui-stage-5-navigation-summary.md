# Migración visual admin · Etapa 5 · Navegación unificada

## Fecha
2026-05-17

## Rama

```txt
feature/admin-baseui-stage-5-navigation
```

## PR

```txt
#191 · feat: admin BaseUI stage 5 navigation
```

## Base del PR

```txt
feature/admin-baseui-stage-4-system-security
```

Este PR es apilado sobre la Etapa 4. No va directo a `main`.

## Objetivo

Corregir navegación del admin para que móvil y escritorio sean coherentes, sin rutas muertas ni módulos importantes ocultos.

## Archivos revisados

```txt
src/components/admin/AdminContextMenu.tsx
src/components/admin/AdminShell.tsx
src/app/admin/center/page.tsx
src/app/admin/diagnostico/page.tsx
```

## Hallazgos

### /admin/center

Existe y ya redirige correctamente a:

```txt
/admin/integraciones
```

Esto se mantiene como ruta legacy para no romper enlaces viejos.

### /admin/diagnostico

Sí existe como página real de diagnóstico de APIs. No era ruta muerta.

### Sidebar PC

Le faltaban rutas centrales que sí estaban en el menú móvil:

```txt
/admin/modulos
/admin/ai-developer
/admin/diagnostico
```

También tenía una referencia vieja:

```txt
/admin/center · Centro de integración
```

Y una descripción vieja:

```txt
/admin/configuracion · Parámetros e integraciones
```

## Cambios aplicados

Archivo:

```txt
src/components/admin/AdminShell.tsx
```

Cambios:

- Añadido `/admin/modulos` al bloque Visión general.
- Añadido `/admin/ai-developer` al bloque Expansión.
- Añadido `/admin/diagnostico` al bloque Sistema.
- Cambiada descripción de `/admin/configuracion` a “Datos del negocio y acceso admin”.
- En Seguridad & Claves, la opción de credenciales ahora apunta a `/admin/integraciones`.
- Se mantiene `/admin/center` solo como redirect legacy.
- Se actualizó `PATH_LABELS` para breadcrumbs de:
  - `/admin/modulos`
  - `/admin/ai-developer`
  - `/admin/diagnostico`

## Qué no se tocó

```txt
AdminBottomNav
barra inferior móvil
lógica de logout
roles superadmin
comando Cmd+K salvo que hereda nuevas rutas
```

## Pendientes reales

```txt
1. Revisar preview/build del PR #191.
2. Si el usuario quiere, extraer navSections a un archivo compartido para que AdminContextMenu y AdminShell usen la misma fuente.
3. Al final, crear rama final de integración y un PR limpio hacia main.
```

## Regla mantenida

```txt
No merge.
No deploy.
No tocar main.
No romper barra inferior móvil.
```

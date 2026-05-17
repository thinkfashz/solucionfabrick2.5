# Seguridad base · Etapa 2 · Matriz de permisos admin

Fecha: 2026-05-17
Rama: `feature/security-foundation-env-permissions`

## Objetivo

Crear una capa central de permisos reutilizable para proteger APIs críticas por rol, recurso y acción.

Esta etapa NO aplica todavía permisos a endpoints. Solo crea el helper base para que la siguiente etapa lo integre sin duplicar lógica ni romper rutas existentes.

## Archivo creado

```txt
src/lib/adminPermissions.ts
```

## Qué contiene

1. Roles normalizados:

```txt
superadmin
admin
editor
ventas
soporte
viewer
```

2. Recursos protegibles:

```txt
admin
products
team
integrations
sql
passkeys
sessions
security
content
orders
payments
quotes
settings
```

3. Acciones:

```txt
read
create
update
delete
execute
manage
test
export
```

4. Helpers públicos:

```txt
normalizeAdminRole()
roleAtLeast()
can()
checkAdminPermission()
requireAdminPermission()
adminForbidden()
describePermission()
```

## Por qué se hizo así

El proyecto ya tenía:

```txt
src/lib/adminApi.ts
src/lib/adminAuth.ts
src/middleware.ts
```

Por eso no se duplicó la lectura de sesión. `adminPermissions.ts` usa `getAdminSession()` desde `adminApi.ts` y se limita a resolver autorización.

## Diseño de seguridad

La UI puede ocultar botones, pero la seguridad real debe estar en las APIs. Esta matriz permitirá que las próximas etapas protejan endpoints como:

```txt
/api/admin/passkeys/*
/api/admin/team
/api/admin/products
/api/admin/integrations/*
/api/admin/sql
```

## Estado después de esta etapa

Completado:

```txt
Matriz de permisos creada
Roles ampliados definidos
Acciones críticas identificadas
Helper requireAdminPermission listo
```

Pendiente:

```txt
Aplicar requireAdminPermission() en APIs críticas
Añadir auditoría con adminAudit.ts
Crear enforcement real de passkey obligatoria para superadmin
Crear backup codes
```

## Regla para futuras IAs

No crear otro helper de permisos. Usar y extender:

```txt
src/lib/adminPermissions.ts
```

Si hace falta un nuevo recurso o acción, agregarlo ahí y documentarlo en `docs/changes`.

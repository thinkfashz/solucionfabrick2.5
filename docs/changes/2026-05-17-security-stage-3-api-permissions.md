# Seguridad base · Etapa 3 · Permisos en APIs críticas

Fecha: 2026-05-17
Rama: `feature/security-foundation-env-permissions`

## Objetivo

Aplicar la matriz central `src/lib/adminPermissions.ts` a endpoints críticos, sin reconstruir módulos y sin tocar `main`.

## Cambios aplicados

### 1. Productos

Archivo:

```txt
src/app/api/admin/products/route.ts
```

Antes:

- Leía la sesión manualmente.
- Tenía un helper local `canWrite()` limitado a `superadmin | admin`.

Ahora:

- Usa `requireAdminPermission()`.
- `GET` requiere `products:read`.
- `PATCH` requiere `products:update`.
- `DELETE` requiere `products:delete`.

Esto mantiene el módulo funcionando, pero centraliza los permisos.

### 2. Equipo

Archivo:

```txt
src/app/api/admin/team/route.ts
```

Antes:

- Tenía `requireSuperadmin()` local.
- Revisaba sesión y rol manualmente.

Ahora:

- Usa `requireAdminPermission()`.
- `GET` requiere `team:read`.
- `POST` requiere `team:create`.
- `PATCH` requiere `team:update`.

La lógica de creación de usuarios, aprobación y cambio de rol se mantiene.

### 3. Passkeys de registro

Archivos:

```txt
src/app/api/admin/passkeys/register/options/route.ts
src/app/api/admin/passkeys/register/verify/route.ts
```

Antes:

- Usaban sesión admin directamente con `getAdminSession()`.

Ahora:

- Usan `requireAdminPermission()`.
- Ambas requieren `passkeys:create`.

Importante: NO se tocaron las rutas pre-login:

```txt
/api/admin/passkeys/auth/options
/api/admin/passkeys/auth/verify
```

Esas rutas deben seguir funcionando sin sesión porque son necesarias para iniciar sesión con huella / Face ID.

## Pendiente de mini-etapa 3B

Por seguridad y para no romper código grande, quedaron pendientes:

### Integraciones

Archivo grande y sensible:

```txt
src/app/api/admin/integrations/route.ts
```

Motivo:

- Maneja credenciales cifradas.
- Tiene validaciones live contra Cloudinary, Meta, Google Ads, Vercel, TikTok, MercadoLibre, MercadoPago, Stripe y WhatsApp.
- Reescribirlo completo en esta etapa aumentaba riesgo de romper producción.

Pendiente:

```txt
GET -> integrations:read
POST -> integrations:manage
DELETE -> integrations:delete o integrations:manage
```

### Passkeys list/delete/rename

La herramienta bloqueó la actualización automática de `src/app/api/admin/passkeys/route.ts`. No se forzó el cambio.

Pendiente:

```txt
GET /api/admin/passkeys -> passkeys:read
DELETE/rename si existen rutas dinámicas -> passkeys:delete/update
```

### SQL

No se ubicó todavía una ruta clara `src/app/api/admin/sql/route.ts` en esta pasada. Pendiente buscar por implementación real antes de crear o modificar algo.

Pendiente esperado:

```txt
/api/admin/sql -> sql:execute
```

## Estado de seguridad tras esta etapa

Completado:

```txt
products protegida por permisos centrales
equipo protegida por permisos centrales
registro de passkeys protegido por permisos centrales
flujo pre-login de passkeys preservado
```

No completado todavía:

```txt
integrations route
passkeys list/delete/rename
sql route
auditoría de acciones admin
superadmin passkey obligatorio
backup codes
```

## Regla para futuras IAs

No crear otro sistema de permisos. Usar:

```txt
src/lib/adminPermissions.ts
```

No tocar rutas pre-login de passkeys como si fueran rutas autenticadas. Estas rutas deben poder ejecutarse antes de tener sesión:

```txt
/api/admin/passkeys/auth/options
/api/admin/passkeys/auth/verify
```

La seguridad de esas rutas depende de challenge WebAuthn, RP ID, origin, user verification y validación cryptográfica, no de cookie admin previa.
